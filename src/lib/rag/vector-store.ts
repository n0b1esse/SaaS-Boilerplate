/**
 * Работа с vector store в Supabase (таблица document_chunks + RPC match_chunks).
 *
 * ЗАЧЕМ отдельный модуль:
 * - API route не должен знать детали insert/rpc;
 * - здесь сосредоточены SQL-эквиваленты через supabase-js с русскими пояснениями.
 *
 * Поток ingest:
 * EmbeddedChunk[] → rows { content, metadata, embedding }
 * → supabase.from('document_chunks').insert(rows)
 *
 * Поток query:
 * questionEmbedding → supabase.rpc('match_chunks', {...})
 * → MatchChunkRow[] → RetrievedChunk[] для промпта LLM.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmbeddedChunk, RetrievedChunk } from "@/types/rag";
import type { DocumentChunkInsert, Json, MatchChunkRow } from "@/types/supabase";

/**
 * Удаляет старые чанки документа перед повторной индексацией.
 *
 * SQL-эквивалент:
 *   DELETE FROM document_chunks
 *   WHERE metadata->>'document_id' = :documentId;
 */
export async function deleteChunksByDocumentId(
  documentId: string,
): Promise<void> {
  // Серверный клиент: cookies + anon key → PostgREST
  const supabase = createSupabaseServerClient();

  // Фильтр по JSON-полю metadata.document_id
  const { error } = await supabase
    .from("document_chunks")
    .delete()
    .filter("metadata->>document_id", "eq", documentId);

  if (error) {
    throw new Error(`Supabase delete chunks: ${error.message}`);
  }
}

/**
 * Сохраняет чанки с эмбеддингами в Postgres/pgvector через Supabase.
 *
 * SQL-эквивалент:
 *   INSERT INTO document_chunks (content, metadata, embedding) VALUES (...);
 */
export async function insertEmbeddedChunks(params: {
  readonly documentId: string;
  readonly chunks: readonly EmbeddedChunk[];
  readonly filename?: string;
  readonly mimeType?: string;
  readonly source?: "file" | "text";
}): Promise<number> {
  const supabase = createSupabaseServerClient();

  // Доменные чанки → строки таблицы document_chunks
  const rows: DocumentChunkInsert[] = params.chunks.map((chunk) => {
    // jsonb metadata: document_id нужен для filter_document_id в match_chunks
    const metadata: { [key: string]: Json | undefined } = {
      document_id: params.documentId,
      chunk_index: chunk.index,
      charCount: chunk.charCount,
      source: params.source ?? "file",
      filename: params.filename,
      mimeType: params.mimeType,
    };

    return {
      content: chunk.content,
      metadata,
      // number[] уходит в PostgREST и сохраняется как vector(768)
      embedding: [...chunk.embedding],
    };
  });

  // Пакетный INSERT + select id, чтобы узнать фактическое число строк
  const { data, error } = await supabase
    .from("document_chunks")
    .insert(rows)
    .select("id");

  if (error) {
    throw new Error(`Supabase insert chunks: ${error.message}`);
  }

  return data?.length ?? rows.length;
}

/**
 * Ищет похожие чанки через SQL-функцию match_chunks (cosine).
 *
 * SQL-эквивалент:
 *   SELECT * FROM match_chunks(:embedding, :k, :threshold, :docId);
 */
export async function matchChunksFromSupabase(params: {
  readonly queryEmbedding: readonly number[];
  readonly matchCount?: number;
  readonly matchThreshold?: number;
  readonly documentId?: string;
}): Promise<RetrievedChunk[]> {
  const supabase = createSupabaseServerClient();

  // rpc → Postgres FUNCTION public.match_chunks(...)
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: [...params.queryEmbedding],
    match_count: params.matchCount ?? 4,
    match_threshold: params.matchThreshold ?? 0.5,
    filter_document_id: params.documentId ?? null,
  });

  if (error) {
    throw new Error(`Supabase match_chunks: ${error.message}`);
  }

  const rows = (data ?? []) as MatchChunkRow[];

  // RPC → доменный RetrievedChunk для промпта/UI
  return rows.map((row) => {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as { [key: string]: Json | undefined })
        : {};
    const chunkIndexRaw = meta.chunk_index;
    const chunkIndex =
      typeof chunkIndexRaw === "number"
        ? chunkIndexRaw
        : Number.parseInt(String(chunkIndexRaw ?? "0"), 10) || 0;

    return {
      index: chunkIndex,
      content: row.content,
      charCount: row.content.length,
      score: row.similarity,
    };
  });
}
