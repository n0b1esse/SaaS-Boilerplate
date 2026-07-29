/**
 * Semantic retrieval: отбор top-k чанков по cosine similarity.
 *
 * ЗАЧЕМ это сердце RAG:
 * - в промпт нельзя скармливать весь документ (дорого + шум);
 * - берём только фрагменты, ближайшие к вопросу в векторном пространстве.
 *
 * Поток:
 * questionEmbedding + EmbeddedChunk[] → score каждого → sort desc → topK.
 */

import { cosineSimilarity } from "ai";

import type { EmbeddedChunk, RetrievedChunk } from "@/types/rag";

/** Сколько фрагментов по умолчанию кладём в контекст LLM */
export const DEFAULT_TOP_K = 4;

/**
 * Ранжирует чанки по сходству с вектором вопроса.
 *
 * @param questionEmbedding — вектор вопроса (из embedQuery)
 * @param chunks — проиндексированные чанки документа
 * @param topK — сколько лучших вернуть
 */
export function retrieveRelevantChunks(
  questionEmbedding: readonly number[],
  chunks: readonly EmbeddedChunk[],
  topK: number = DEFAULT_TOP_K,
): RetrievedChunk[] {
  if (chunks.length === 0) {
    return [];
  }

  const scored: RetrievedChunk[] = chunks.map((chunk) => {
    const score = cosineSimilarity(
      questionEmbedding as number[],
      chunk.embedding as number[],
    );

    return {
      index: chunk.index,
      content: chunk.content,
      charCount: chunk.charCount,
      score,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
}
