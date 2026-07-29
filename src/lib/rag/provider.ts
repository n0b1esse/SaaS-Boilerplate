/**
 * Провайдер моделей для RAG-модуля (embeddings + chat LLM).
 *
 * ЗАЧЕМ отдельный файл:
 * - UI/route не должны знать, откуда берётся ключ;
 * - легко переключить OpenAI direct ↔ Vercel AI Gateway.
 *
 * Приоритет конфигурации:
 * 1) OPENAI_API_KEY → прямой провайдер @ai-sdk/openai
 * 2) AI_GATEWAY_API_KEY → строки моделей `openai/...` через AI Gateway
 *
 * Поток:
 * env → resolveRagModels() → { embeddingModel, chatModel } → embed/generateText.
 */

import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import type { EmbeddingModel, LanguageModel } from "ai";

/** Имена моделей можно переопределить через env без правки кода */
const DEFAULT_CHAT_MODEL = "gpt-4.1-mini";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export interface RagModels {
  readonly chatModel: LanguageModel;
  readonly embeddingModel: EmbeddingModel;
  /** Какой транспорт реально используется — для логов/отладки */
  readonly transport: "openai" | "gateway";
}

/**
 * Читает обязательный API-ключ или бросает понятную ошибку для UI.
 */
export function assertAiCredentials(): {
  openaiKey: string | undefined;
  gatewayKey: string | undefined;
} {
  const openaiKey = process.env.OPENAI_API_KEY?.trim() || undefined;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim() || undefined;

  if (!openaiKey && !gatewayKey) {
    throw new Error(
      "Не задан OPENAI_API_KEY или AI_GATEWAY_API_KEY. Добавьте ключ в Vercel Environment Variables / .env.local",
    );
  }

  return { openaiKey, gatewayKey };
}

/**
 * Собирает модели чата и эмбеддингов под доступные credentials.
 */
export function resolveRagModels(): RagModels {
  const { openaiKey } = assertAiCredentials();
  const chatModelId =
    process.env.RAG_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL;
  const embeddingModelId =
    process.env.RAG_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;

  if (openaiKey) {
    const openai: OpenAIProvider = createOpenAI({ apiKey: openaiKey });
    return {
      transport: "openai",
      chatModel: openai(chatModelId),
      embeddingModel: openai.embedding(embeddingModelId),
    };
  }

  /**
   * AI Gateway: достаточно строк `provider/model`.
   * Ключ AI_GATEWAY_API_KEY подхватывается SDK автоматически в runtime Vercel.
   */
  return {
    transport: "gateway",
    chatModel: `openai/${chatModelId}`,
    embeddingModel: `openai/${embeddingModelId}`,
  };
}
