/**
 * Типы модуля AI RAG Assistant.
 *
 * ЗАЧЕМ этот файл нужен:
 * - фиксирует контракт данных между UI (`/ai-assistant`), API (`/api/rag`)
 *   и бизнес-логикой в `src/lib/rag/*`;
 * - без единого контракта легко «разъехаться» по полям chunk/message.
 *
 * Поток данных (учебная схема):
 * Файл → extractText → chunks[] → embeddings[] → RagDocumentSession (на клиенте)
 * → вопрос пользователя → cosineSimilarity → top-k контекст → LLM → ChatMessage.
 */

/**
 * Роль участника диалога в чате.
 * - user      — сообщение человека
 * - assistant — ответ модели (после RAG)
 * - system    — служебные подсказки UI (не обязательно уходит в LLM)
 */
export type ChatRole = "user" | "assistant" | "system";

/**
 * Одно сообщение в истории чата.
 * UI рендерит список ChatMessage[]; API query принимает question отдельно,
 * а историю можно позже прокинуть в LLM как conversational context.
 */
export interface ChatMessage {
  /** Уникальный id сообщения (для React key и будущих реакций/удаления) */
  readonly id: string;
  /** Кто автор сообщения */
  readonly role: ChatRole;
  /** Текст сообщения, который видит пользователь */
  readonly content: string;
  /** ISO-время создания — для сортировки и отображения метки времени */
  readonly createdAt: string;
  /**
   * Опционально: какие чанки реально попали в промпт при генерации ответа.
   * Полезно для отладки RAG («почему модель так ответила»).
   */
  readonly sources?: readonly RetrievedChunk[];
}

/**
 * Допустимые MIME/расширения для загрузки в MVP.
 * Расширим позже (md, docx) — тогда обновим и парсер, и этот union.
 */
export type RagSupportedMime =
  | "text/plain"
  | "application/pdf"
  | "application/octet-stream";

/**
 * Метаданные загруженного файла (без бинарного содержимого).
 * Бинарь живёт только на время ingest-запроса; в state UI храним метаданные.
 */
export interface RagFileMeta {
  /** Оригинальное имя файла с диска пользователя */
  readonly name: string;
  /** MIME-тип, который прислал браузер (может быть неточным) */
  readonly mimeType: string;
  /** Размер в байтах — для UI и лимитов */
  readonly sizeBytes: number;
}

/**
 * Один текстовый фрагмент (chunk) после нарезки документа.
 *
 * ЗАЧЕМ чанки:
 * - LLM и embedding-модели имеют лимит контекста;
 * - поиск по смыслу работает точнее на небольших абзацах, чем по целому PDF.
 */
export interface TextChunk {
  /** Порядковый номер чанка внутри документа (0-based) */
  readonly index: number;
  /** Текст фрагмента, который пойдёт в embedding и (при отборе) в промпт */
  readonly content: string;
  /** Примерное число символов — удобно для UI/отладки */
  readonly charCount: number;
}

/**
 * Чанк + векторное представление (embedding).
 * Именно эта структура — «мини vector store» на стороне клиента в MVP.
 *
 * Позже заменим на Postgres/pgvector: тогда embeddings останутся на сервере.
 */
export interface EmbeddedChunk extends TextChunk {
  /**
   * Числовой вектор фиксированной размерности (например, 1536 для
   * text-embedding-3-small). Сходство считается через cosineSimilarity.
   */
  readonly embedding: readonly number[];
}

/**
 * Чанк, отобранный retriever'ом для ответа на конкретный вопрос.
 * Добавляем score, чтобы в UI/логах было видно «насколько релевантен» фрагмент.
 */
export interface RetrievedChunk extends TextChunk {
  /** Cosine similarity вопроса и чанка: чем ближе к 1, тем релевантнее */
  readonly score: number;
}

/**
 * Сессия документа после успешного ingest.
 * Клиент держит её в React state и отправляет chunks обратно при каждом query.
 *
 * ЗАЧЕМ так (без БД):
 * - на Vercel serverless память процесса не переживает запрос;
 * - для учебного MVP достаточно «vector store в браузере».
 */
export interface RagDocumentSession {
  /** Случайный id сессии документа */
  readonly documentId: string;
  /** Метаданные исходного файла */
  readonly file: RagFileMeta;
  /** Чанки с эмбеддингами — готовы к semantic search */
  readonly chunks: readonly EmbeddedChunk[];
  /** Когда документ был проиндексирован */
  readonly ingestedAt: string;
  /** Сколько символов исходного текста удалось извлечь */
  readonly extractedCharCount: number;
}

/**
 * Статусы UI модуля — управляют индикатором и disabled-состоянием кнопок.
 */
export type RagUiStatus =
  | "idle"
  | "uploading"
  | "indexing"
  | "ready"
  | "thinking"
  | "error";

/**
 * Действия единого API `/api/rag`.
 * Один route — два сценария: ingest файла и query по вопросу.
 */
export type RagApiAction = "ingest" | "query";

/**
 * Тело JSON-запроса на генерацию ответа (action=query).
 */
export interface RagQueryRequest {
  readonly action: "query";
  /** Вопрос пользователя из поля ввода чата */
  readonly question: string;
  /** Уже проиндексированные чанки текущей сессии документа */
  readonly chunks: readonly EmbeddedChunk[];
  /** Сколько top-k фрагментов класть в промпт (по умолчанию на сервере = 4) */
  readonly topK?: number;
}

/**
 * Успешный ответ ingest.
 */
export interface RagIngestResponse {
  readonly ok: true;
  readonly action: "ingest";
  readonly session: RagDocumentSession;
}

/**
 * Успешный ответ query.
 */
export interface RagQueryResponse {
  readonly ok: true;
  readonly action: "query";
  /** Готовый текст ответа ассистента */
  readonly answer: string;
  /** Какие чанки попали в контекст промпта */
  readonly sources: readonly RetrievedChunk[];
}

/**
 * Единый формат ошибки API — UI показывает message пользователю.
 */
export interface RagErrorResponse {
  readonly ok: false;
  readonly error: string;
  /** Опциональный машинный код для ветвления в UI */
  readonly code?:
    | "MISSING_API_KEY"
    | "UNSUPPORTED_FILE"
    | "EMPTY_DOCUMENT"
    | "NO_CHUNKS"
    | "BAD_REQUEST"
    | "INTERNAL";
}

/** Discriminated union ответов `/api/rag` */
export type RagApiResponse =
  | RagIngestResponse
  | RagQueryResponse
  | RagErrorResponse;
