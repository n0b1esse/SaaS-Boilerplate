/**
 * Генерация финального ответа LLM по отобранному контексту.
 *
 * Поток:
 * question + RetrievedChunk[] → buildRagPrompt → generateText(chatModel) → answer.
 */

import { generateText } from "ai";

import { buildRagPrompt } from "@/lib/rag/prompt";
import { resolveRagModels } from "@/lib/rag/provider";
import type { RetrievedChunk } from "@/types/rag";

/**
 * Вызывает chat-модель с RAG-промптом и возвращает текст ответа.
 */
export async function generateRagAnswer(
  question: string,
  sources: readonly RetrievedChunk[],
): Promise<string> {
  const { chatModel } = resolveRagModels();
  const { system, prompt } = buildRagPrompt(question, sources);

  const result = await generateText({
    model: chatModel,
    system,
    prompt,
    temperature: 0.2,
  });

  return result.text.trim();
}
