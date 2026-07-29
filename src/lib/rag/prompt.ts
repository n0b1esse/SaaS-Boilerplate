/**
 * Сборка промпта для LLM в сценарии RAG.
 *
 * ЗАЧЕМ отдельный модуль:
 * - промпт — это «контракт» с моделью: от него зависит качество и галлюцинации;
 * - удобно читать/менять инструкции, не трогая API route.
 *
 * Идея RAG-промпта:
 * 1) system: правила («отвечай только по контексту»)
 * 2) context: отобранные чанки с номерами
 * 3) user: сам вопрос
 *
 * Поток:
 * RetrievedChunk[] + question → { system, prompt } → generateText().
 */

import type { RetrievedChunk } from "@/types/rag";

export interface RagPromptPayload {
  /** Системная инструкция (роль и ограничения модели) */
  readonly system: string;
  /** Пользовательский промпт: контекст + вопрос */
  readonly prompt: string;
}

/**
 * Системный промпт: жёстко ограничиваем модель документом,
 * чтобы снизить «фантазии» вне загруженного файла.
 */
const RAG_SYSTEM_PROMPT = [
  "Ты — AI-ассистент модуля Nexus Platform (RAG).",
  "Отвечай на русском языке, кратко и по делу.",
  "Используй ТОЛЬКО предоставленный контекст из документа пользователя.",
  "Если в контексте нет ответа — честно скажи, что в загруженном файле этого нет.",
  "Не выдумывай факты, даты и цифры, которых нет в контексте.",
  "Когда опираешься на фрагмент, можешь кратко указать его номер [chunk N].",
].join(" ");

/**
 * Форматирует отобранные чанки в читаемый блок контекста для LLM.
 */
function formatContextBlock(sources: readonly RetrievedChunk[]): string {
  if (sources.length === 0) {
    return "(контекст пуст — релевантные фрагменты не найдены)";
  }

  return sources
    .map((source, order) => {
      const rank = order + 1;
      const score = source.score.toFixed(3);
      return [
        `--- chunk ${source.index} (rank ${rank}, score ${score}) ---`,
        source.content,
      ].join("\n");
    })
    .join("\n\n");
}

/**
 * Собирает финальный system + prompt для generateText.
 *
 * @param question — исходный вопрос пользователя
 * @param sources — top-k чанки после retrieval
 */
export function buildRagPrompt(
  question: string,
  sources: readonly RetrievedChunk[],
): RagPromptPayload {
  const context = formatContextBlock(sources);

  const prompt = [
    "Контекст из документа пользователя:",
    context,
    "",
    "Вопрос пользователя:",
    question.trim(),
    "",
    "Сформулируй ответ, опираясь только на контекст выше.",
  ].join("\n");

  return {
    system: RAG_SYSTEM_PROMPT,
    prompt,
  };
}
