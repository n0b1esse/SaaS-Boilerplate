/**
 * Заглушка модуля AI RAG Assistant (`/ai-assistant`).
 *
 * Целевой поток данных (будущее):
 * UI чата → Server Action → embeddings → vector store → LLM → ответ в UI.
 */

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { getModuleById } from "@/lib/modules";

export const metadata = {
  title: "AI RAG Assistant",
};

export default function AiAssistantPage() {
  return <ModulePlaceholder module={getModuleById("ai-assistant")} />;
}
