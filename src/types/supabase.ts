/**
 * Типы схемы Supabase под `supabase/schema.sql`.
 *
 * Формат совместим с выводом `supabase gen types typescript`,
 * иначе supabase-js выводит insert/select как `never`.
 *
 * Поток:
 * schema.sql → Database → createSupabaseServerClient<Database>()
 * → from('document_chunks') / rpc('match_chunks').
 */

/**
 * JSON-совместимые значения PostgREST (jsonb / metadata).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | Json[];

/**
 * Строка результата RPC match_chunks (удобный доменный алиас).
 */
export interface MatchChunkRow {
  id: string;
  content: string;
  metadata: Json;
  similarity: number;
}

/**
 * Database-контракт для @supabase/supabase-js.
 */
export type Database = {
  public: {
    Tables: {
      document_chunks: {
        Row: {
          id: string;
          content: string;
          metadata: Json;
          embedding: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          metadata?: Json;
          embedding: string | number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          metadata?: Json;
          embedding?: string | number[];
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: string | number[];
          match_count?: number;
          match_threshold?: number;
          filter_document_id?: string | null;
        };
        Returns: {
          id: string;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

/** Алиас Insert для vector-store */
export type DocumentChunkInsert =
  Database["public"]["Tables"]["document_chunks"]["Insert"];
