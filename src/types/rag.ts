/**
 * Типы модуля AI RAG Assistant.
 *
 * Поток данных (после интеграции Supabase/pgvector):
 * Файл/текст → extract/chunk → embeddings
 * → INSERT document_chunks (Supabase)
 * → вопрос → embed → rpc('match_chunks') → top-k
 * → LLM → ChatMessage.
 */

/**
 * Роль участника диалога в чате.
 * - user      — сообщение человека
 * - assistant — ответ модели (после RAG)
 * - system    — служебные подсказки UI
 */
export type ChatRole = "user" | "assistant" | "system";

/**
 * Одно сообщение в истории чата.
 */
export interface ChatMessage {
  /** Уникальный id сообщения (React key) */
  readonly id: string;
  /** Кто автор сообщения */
  readonly role: ChatRole;
  /** Текст сообщения */
  readonly content: string;
  /** ISO-время создания */
  readonly createdAt: string;
  /** Чанки, попавшие в промпт (для отладки RAG) */
  readonly sources?: readonly RetrievedChunk[];
}

/** Допустимые MIME для upload MVP */
export type RagSupportedMime =
  | "text/plain"
  | "application/pdf"
  | "application/octet-stream";

/** Метаданные файла без бинарного содержимого */
export interface RagFileMeta {
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

/** Текстовый фрагмент после нарезки (ещё без вектора) */
export interface TextChunk {
  readonly index: number;
  readonly content: string;
  readonly charCount: number;
}

/**
 * Чанк + embedding.
 * Используется на сервере перед INSERT в document_chunks.
 * На клиент больше не гоняем тяжёлые векторы.
 */
export interface EmbeddedChunk extends TextChunk {
  readonly embedding: readonly number[];
}

/** Чанк, отобранный retriever'ом (из match_chunks) */
export interface RetrievedChunk extends TextChunk {
  /** Cosine similarity вопроса и чанка */
  readonly score: number;
}

/**
 * Лёгкая сессия документа на клиенте.
 * Векторы живут в Supabase; UI хранит только documentId и метаданные.
 */
export interface RagDocumentSession {
  /** UUID документа (metadata.document_id в БД) */
  readonly documentId: string;
  /** Метаданные исходного файла/текста */
  readonly file: RagFileMeta;
  /** Сколько чанков записали в Supabase */
  readonly chunkCount: number;
  /** Когда документ проиндексировали */
  readonly ingestedAt: string;
  /** Сколько символов исходного текста */
  readonly extractedCharCount: number;
}

/** Статусы UI модуля */
export type RagUiStatus =
  | "idle"
  | "uploading"
  | "indexing"
  | "ready"
  | "thinking"
  | "error";

/** Действия API /api/rag */
export type RagApiAction = "ingest" | "query";

/**
 * JSON query: вопрос + documentId (поиск идёт в Supabase, не по клиентским chunks).
 */
export interface RagQueryRequest {
  readonly action: "query";
  /** Вопрос / текст пользователя */
  readonly question: string;
  /** UUID документа, по которому ищем в match_chunks */
  readonly documentId: string;
  readonly topK?: number;
  readonly matchThreshold?: number;
}

/**
 * JSON ingest сырого текста (без файла).
 * Удобно для тестов и будущих Server Actions.
 */
export interface RagIngestTextRequest {
  readonly action: "ingest";
  readonly text: string;
  readonly filename?: string;
}

/** Успешный ответ ingest */
export interface RagIngestResponse {
  readonly ok: true;
  readonly action: "ingest";
  readonly session: RagDocumentSession;
}

/** Успешный ответ query */
export interface RagQueryResponse {
  readonly ok: true;
  readonly action: "query";
  readonly answer: string;
  readonly sources: readonly RetrievedChunk[];
}

/** Ошибка API */
export interface RagErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code?:
    | "MISSING_API_KEY"
    | "MISSING_SUPABASE"
    | "UNSUPPORTED_FILE"
    | "EMPTY_DOCUMENT"
    | "NO_CHUNKS"
    | "BAD_REQUEST"
    | "INTERNAL";
}

export type RagApiResponse =
  | RagIngestResponse
  | RagQueryResponse
  | RagErrorResponse;
