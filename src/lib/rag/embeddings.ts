/**
 * Создание векторных представлений (embeddings) для чанков и вопроса.
 *
 * ЗАЧЕМ:
 * - текст нельзя надёжно сравнивать простым includes();
 * - embedding переводит смысл фразы в точку многомерного пространства;
 * - близкие по смыслу фразы → близкие векторы (высокий cosine similarity).
 *
 * Поток:
 * TextChunk[].content → embedMany(embeddingModel) → EmbeddedChunk[].
 */

import { embed, embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import {
  assertAiCredentials,
  getEmbeddingFallbackModelId,
  RAG_VECTOR_DIMENSIONS,
  resolveRagModels,
} from "@/lib/rag/provider";
import type { EmbeddedChunk, TextChunk } from "@/types/rag";

/**
 * Нормализует размерность вектора под vector(768) в Supabase.
 *
 * ЗАЧЕМ:
 * - Gemini `text-embedding-004` целится в 768 измерений;
 * - Postgres `vector(768)` требует фиксированную длину на INSERT/RPC;
 * - trim/pad оставлен как защитный слой, если провайдер вернул нестандартный размер.
 *
 * Поток:
 * Gemini embedding[] → trim/pad до 768 → безопасный INSERT/RPC в Supabase.
 */
function normalizeEmbeddingDimensions(
  embedding: readonly number[],
): number[] {
  // Если модель вернула больше значений, отрезаем хвост до целевой длины.
  if (embedding.length >= RAG_VECTOR_DIMENSIONS) {
    return embedding.slice(0, RAG_VECTOR_DIMENSIONS);
  }

  // Если значений меньше, дополняем нулями до vector(768).
  const padded = [...embedding];
  while (padded.length < RAG_VECTOR_DIMENSIONS) {
    padded.push(0);
  }
  return padded;
}

/**
 * Определяет, что ошибка связана с недоступной embedding-моделью в Gemini API.
 */
function isMissingEmbeddingModelError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("not found for api version") ||
    message.includes("models/text-embedding-004") ||
    message.includes("model not found")
  );
}

/**
 * Достаёт embedding-модель по fallback-id напрямую у Google-провайдера.
 *
 * ЗАЧЕМ:
 * - если первичная модель не найдена на конкретной версии API,
 *   повторяем запрос на `embedding-001` без изменения общего RAG-пайплайна.
 */
function getFallbackEmbeddingModel() {
  const { geminiKey } = assertAiCredentials();
  const google = createGoogleGenerativeAI({ apiKey: geminiKey });
  return google.textEmbeddingModel(getEmbeddingFallbackModelId());
}

/**
 * Строит эмбеддинги сразу для всего массива чанков (batch).
 * Batch дешевле и быстрее, чем по одному embed() на каждый фрагмент.
 */
export async function embedTextChunks(
  chunks: readonly TextChunk[],
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  const { embeddingModel } = resolveRagModels();
  const values = chunks.map((chunk) => chunk.content);
  let embeddings: number[][];

  try {
    const result = await embedMany({
      model: embeddingModel,
      values,
    });
    embeddings = result.embeddings;
  } catch (error) {
    /**
     * Retry-ветка для кейса:
     * "models/text-embedding-004 is not found for API version v1beta".
     * Если первичная модель недоступна, уходим на `embedding-001`.
     */
    if (!isMissingEmbeddingModelError(error)) {
      throw error;
    }

    const fallbackResult = await embedMany({
      model: getFallbackEmbeddingModel(),
      values,
    });
    embeddings = fallbackResult.embeddings;
  }

  return chunks.map((chunk, index) => ({
    ...chunk,
    // Каждый вектор приводим к размерности vector(768) перед записью в БД.
    embedding: normalizeEmbeddingDimensions(embeddings[index] ?? []),
  }));
}

/**
 * Эмбеддинг одного вопроса пользователя — для сравнения с чанками документа.
 */
export async function embedQuery(question: string): Promise<number[]> {
  const { embeddingModel } = resolveRagModels();
  let embedding: number[];

  try {
    const result = await embed({
      model: embeddingModel,
      value: question,
    });
    embedding = result.embedding;
  } catch (error) {
    /**
     * Повторяем тот же fallback для query, чтобы ingest/query всегда
     * использовали совместимую модель и не ломали поиск в match_chunks.
     */
    if (!isMissingEmbeddingModelError(error)) {
      throw error;
    }

    const fallbackResult = await embed({
      model: getFallbackEmbeddingModel(),
      value: question,
    });
    embedding = fallbackResult.embedding;
  }

  // Вопрос тоже нормализуем до той же длины, что и document_chunks.embedding.
  return normalizeEmbeddingDimensions(embedding);
}
