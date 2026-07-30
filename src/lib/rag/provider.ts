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
const DEFAULT_EMBEDDING_MODEL = "text-embedding-004";

/**
 * Целевая размерность векторов под текущую схему Supabase (vector(1536)).
 * Её же используем в embeddings.ts для нормализации и валидации.
 */
export const RAG_VECTOR_DIMENSIONS = 1536 as const;

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
  const embeddingModelId = normalizeEmbeddingModelId(
    process.env.RAG_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL,
  );
  const google = createGoogleGenerativeAI({
    apiKey: geminiKey,
  });

  return {
    transport: "google-gemini",
    chatModel: google(chatModelId),
    /**
     * КРИТИЧНО: используем корректное имя без префикса `models/`,
     * например `text-embedding-004` (или `embedding-001` как fallback).
     */
    embeddingModel: google.textEmbeddingModel(embeddingModelId),
  };
}
