/**
 * Страница модуля AI RAG Assistant (`/ai-assistant`).
 *
 * Server Component отдаёт metadata и монтирует клиентский RagAssistant.
 *
 * Поток:
 * page (RSC) → RagAssistant (client) → /api/rag → embeddings + LLM.
 */

import { RagAssistant } from "@/components/ai-assistant/rag-assistant";

export const metadata = {
  title: "AI RAG Assistant",
  description:
    "RAG-чат Nexus Platform: загрузка .txt/.pdf, чанки, embeddings и ответы LLM по контексту документа.",
};

export default function AiAssistantPage() {
  return <RagAssistant />;
}
