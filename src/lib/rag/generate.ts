/**
 * Генерация финального ответа Gemini по отобранному контексту.
 *
 * Поток:
 * question + RetrievedChunk[] → buildRagPrompt
 * → generateText(chatModel Gemini) → answer.
 */

import { generateText } from "ai";

import { buildRagPrompt } from "@/lib/rag/prompt";
import { resolveRagModels } from "@/lib/rag/provider";
import type { RetrievedChunk } from "@/types/rag";

/**
 * Вызывает Gemini-модель с RAG-промптом и возвращает текст ответа.
 */
export async function generateRagAnswer(
  question: string,
  sources: readonly RetrievedChunk[],
): Promise<string> {
  // Получаем chat-модель Gemini из единого провайдера (src/lib/rag/provider.ts).
  const { chatModel } = resolveRagModels();
  // Формируем system+prompt: инструкция + вопрос + контекстные чанки из Supabase.
  const { system, prompt } = buildRagPrompt(question, sources);

  // Отправляем в Gemini готовый промпт с контекстом и низкой "креативностью".
  const result = await generateText({
    model: chatModel,
    system,
    prompt,
    temperature: 0.2,
  });

  // Возвращаем уже очищенный текст ответа в API route.
  return result.text.trim();
}
