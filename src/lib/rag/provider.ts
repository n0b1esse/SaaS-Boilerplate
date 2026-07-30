/**
 * Провайдер моделей для RAG-модуля (embeddings + chat LLM) на Google Gemini.
 *
 * ЗАЧЕМ отдельный файл:
 * - UI/route не должны знать, откуда берётся ключ;
 * - централизованно настраиваем Gemini-модели для ответа и эмбеддингов.
 *
 * Поток:
 * env (GEMINI_API_KEY) → resolveRagModels()
 * → { embeddingModel, chatModel } → embed/generateText.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { EmbeddingModel, LanguageModel } from "ai";

/** Имена моделей можно переопределить через env без правки кода */
const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";
/** Актуальная GA-модель Gemini Embeddings (legacy embedding-001/text-embedding-004 сняты с v1beta). */
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_FALLBACK_MODEL = "gemini-embedding-001";

/**
 * Целевая размерность векторов под текущую схему Supabase (vector(768)).
 *
 * ПОЧЕМУ 768:
 * - Gemini `gemini-embedding-001` поддерживает output 768 (MRL-truncate из 3072);
 * - колонка `document_chunks.embedding` в schema.sql синхронизирована на vector(768);
 * - одинаковая размерность в ingest/query обязательна для корректной cosine-метрики.
 */
export const RAG_VECTOR_DIMENSIONS = 768 as const;

export interface RagModels {
  readonly chatModel: LanguageModel;
  readonly embeddingModel: EmbeddingModel;
  /** Какой провайдер реально используется — для логов/отладки */
  readonly transport: "google-gemini";
}

/**
 * Нормализует id модели эмбеддингов для @ai-sdk/google.
 *
 * ЗАЧЕМ:
 * - в некоторых гайдах Gemini указывают имя как `models/text-embedding-004`;
 * - метод `google.textEmbeddingModel(...)` ожидает короткое имя без `models/`;
 * - здесь заранее приводим строку к совместимому формату, чтобы route не падал.
 */
function normalizeEmbeddingModelId(rawModelId: string): string {
  const trimmed = rawModelId.trim();
  if (trimmed.startsWith("models/")) {
    return trimmed.slice("models/".length);
  }
  return trimmed;
}

/**
 * Возвращает id embedding-модели из env в корректном формате для SDK.
 *
 * Примеры:
 * - `models/text-embedding-004` → `text-embedding-004`
 * - `text-embedding-004`        → `text-embedding-004`
 * - `embedding-001`             → `embedding-001`
 */
export function resolveEmbeddingModelId(): string {
  return normalizeEmbeddingModelId(
    process.env.RAG_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL,
  );
}

/**
 * Резервная embedding-модель Gemini.
 *
 * ЗАЧЕМ:
 * - оставлен для совместимости, если Google переименует модель;
 * - сейчас primary и fallback совпадают (`gemini-embedding-001`).
 */
export function getEmbeddingFallbackModelId(): string {
  return EMBEDDING_FALLBACK_MODEL;
}

/**
 * Читает обязательный API-ключ или бросает понятную ошибку для UI.
 */
export function assertAiCredentials(): { geminiKey: string } {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (!geminiKey) {
    throw new Error(
      "Не задан GEMINI_API_KEY. Добавьте ключ Google Gemini в Vercel Environment Variables / .env.local",
    );
  }

  return { geminiKey };
}

/**
 * Собирает модели Gemini для чата и эмбеддингов.
 */
export function resolveRagModels(): RagModels {
  const { geminiKey } = assertAiCredentials();
  const chatModelId =
    process.env.RAG_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL;
  const embeddingModelId = resolveEmbeddingModelId();
  const google = createGoogleGenerativeAI({
    apiKey: geminiKey,
  });

  return {
    transport: "google-gemini",
    chatModel: google(chatModelId),
    /**
     * КРИТИЧНО: используем корректное имя без префикса `models/`,
     * например `gemini-embedding-001`.
     */
    embeddingModel: google.textEmbeddingModel(embeddingModelId),
  };
}
