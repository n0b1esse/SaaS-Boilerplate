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

import { resolveRagModels } from "@/lib/rag/provider";
import type { EmbeddedChunk, TextChunk } from "@/types/rag";

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
    embedding: embeddings[index] ?? [],
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

  return embedding;
}
