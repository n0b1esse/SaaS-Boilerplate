/**
 * Типы схемы Postgres/Supabase для автодополнения в клиентах.
 *
 * ЗАЧЕМ:
 * - `createBrowserClient<Database>` / `createServerClient<Database>` знают
 *   имена таблиц, колонок и RPC без `any`;
 * - контракт совпадает с `supabase/schema.sql`.
 *
 * Позже можно сгенерировать этот файл официальной CLI:
 * `npx supabase gen types typescript --project-id <id> > src/types/supabase.ts`
 *
 * Поток типов:
 * schema.sql (источник правды в БД)
 *   → вручную/CLI отражаем в Database
 *   → supabase.from('documents') подсказывает поля content/embedding/...
 */

/**
 * Строка таблицы `documents` — один чанк текста + его embedding.
 * Соответствует CREATE TABLE в supabase/schema.sql.
 */
export interface DocumentRow {
  /** UUID первичного ключа чанка */
  id: string;
  /** Группирует чанки одного загруженного файла */
  document_id: string;
  /** Текст фрагмента (то, что уйдёт в промпт LLM при match) */
  content: string;
  /** Порядковый номер чанка внутри документа */
  chunk_index: number;
  /**
   * Произвольные метаданные: имя файла, mime, user_id и т.д.
   * В PostgREST это jsonb ↔ JS object.
   */
  metadata: Record<string, unknown> | null;
  /**
   * Вектор embedding.
   * В JS SDK обычно приходит/уходит как number[] (или string у некоторых драйверов).
   * Размерность = 1536 для text-embedding-3-small.
   */
  embedding: number[] | string | null;
  /** Когда строка создана (ISO-строка из timestamptz) */
  created_at: string;
}

/** Поля, которые клиент может вставлять (id/created_at часто default) */
export type DocumentInsert = {
  id?: string;
  document_id: string;
  content: string;
  chunk_index: number;
  metadata?: Record<string, unknown> | null;
  embedding: number[] | string;
  created_at?: string;
};

/** Частичное обновление строки documents */
export type DocumentUpdate = Partial<DocumentInsert>;

/**
 * Строка, которую возвращает RPC `match_documents`.
 * Это не «сырая» таблица, а результат функции векторного поиска.
 */
export interface MatchDocumentRow {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, unknown> | null;
  /** Cosine similarity = 1 - cosine distance */
  similarity: number;
}

/**
 * Описание Database для supabase-js v2.
 * Ключи: public.Tables / public.Functions — стандартный формат генератора.
 */
export type Database = {
  public: {
    Tables: {
      documents: {
        Row: DocumentRow;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /**
       * RPC: semantic search по pgvector.
       * Вызов: supabase.rpc('match_documents', { query_embedding, match_count, match_threshold })
       */
      match_documents: {
        Args: {
          query_embedding: number[] | string;
          match_count?: number;
          match_threshold?: number;
          filter_document_id?: string | null;
        };
        Returns: MatchDocumentRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
