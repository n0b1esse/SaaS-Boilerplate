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

import {
  RAG_VECTOR_DIMENSIONS,
  resolveRagModels,
} from "@/lib/rag/provider";
import type { EmbeddedChunk, TextChunk } from "@/types/rag";

/**
 * Нормализует размерность вектора под vector(1536) в Supabase.
 *
 * ЗАЧЕМ:
 * - `text-embedding-004` может вернуть размерность меньше 1536;
 * - Postgres `vector(1536)` требует фиксированную длину на INSERT;
 * - паддинг нулями сохраняет относительную близость векторов,
 *   потому что и query, и chunks проходят одинаковую трансформацию.
 *
 * Поток:
 * Gemini embedding[] → trim/pad до 1536 → безопасный INSERT/RPC в Supabase.
 */
function normalizeEmbeddingDimensions(
  embedding: readonly number[],
): number[] {
  // Если модель вернула больше значений, отрезаем хвост до целевой длины.
  if (embedding.length >= RAG_VECTOR_DIMENSIONS) {
    return embedding.slice(0, RAG_VECTOR_DIMENSIONS);
  }

  // Если значений меньше, дополняем нулями до vector(1536).
  const padded = [...embedding];
  while (padded.length < RAG_VECTOR_DIMENSIONS) {
    padded.push(0);
  }
  return padded;
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

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks.map((chunk) => chunk.content),
  });

  return chunks.map((chunk, index) => ({
    ...chunk,
    // Каждый вектор приводим к размерности vector(1536) перед записью в БД.
    embedding: normalizeEmbeddingDimensions(embeddings[index] ?? []),
  }));
}

/**
 * Эмбеддинг одного вопроса пользователя — для сравнения с чанками документа.
 */
export async function embedQuery(question: string): Promise<number[]> {
  const { embeddingModel } = resolveRagModels();

  const { embedding } = await embed({
    model: embeddingModel,
    value: question,
  });

  // Вопрос тоже нормализуем до той же длины, что и document_chunks.embedding.
  return normalizeEmbeddingDimensions(embedding);
}
