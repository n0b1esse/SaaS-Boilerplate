/**
 * RagAssistant — клиентский оркестратор модуля AI RAG.
 *
 * ЗАЧЕМ:
 * - страница `/ai-assistant` остаётся Server Component (metadata);
 * - вся интерактивность (upload/chat/state) живёт здесь.
 *
 * Поток состояния:
 * file → POST /api/rag (multipart ingest) → session.documentId в Supabase
 * question → POST /api/rag (JSON query + documentId) → match_chunks → LLM
 */

"use client";

import { useCallback, useState } from "react";

import { ChatPanel } from "@/components/ai-assistant/chat-panel";
import { FileUploader } from "@/components/ai-assistant/file-uploader";
import { StatusIndicator } from "@/components/ai-assistant/status-indicator";
import type {
  ChatMessage,
  RagApiResponse,
  RagDocumentSession,
  RagUiStatus,
} from "@/types/rag";

/**
 * Создаёт id сообщения на клиенте.
 */
function createMessageId(role: ChatMessage["role"]): string {
  return `${role}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Корневой UI модуля RAG.
 */
export function RagAssistant() {
  const [status, setStatus] = useState<RagUiStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [session, setSession] = useState<RagDocumentSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const onUpload = useCallback(async (file: File) => {
    setStatus("uploading");
    setStatusMessage(`Отправка «${file.name}» на сервер…`);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("action", "ingest");

      setStatus("indexing");
      setStatusMessage("Embeddings + запись в Supabase (document_chunks)…");

      const response = await fetch("/api/rag", {
        method: "POST",
        body: form,
      });

      const payload = (await response.json()) as RagApiResponse;

      if (!payload.ok || payload.action !== "ingest") {
        const message =
          !payload.ok ? payload.error : "Неожиданный ответ ingest";
        setStatus("error");
        setStatusMessage(message);
        return;
      }

      setSession(payload.session);
      setStatus("ready");
      setStatusMessage(
        `В Supabase записано ${payload.session.chunkCount} чанков из «${payload.session.file.name}»`,
      );
      setMessages([
        {
          id: createMessageId("system"),
          role: "system",
          content: `Документ «${payload.session.file.name}» проиндексирован. Можно задавать вопросы по его содержимому.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Сбой загрузки файла",
      );
    }
  }, []);

  const onAsk = useCallback(
    async (question: string) => {
      if (!session) {
        setStatus("error");
        setStatusMessage("Сначала загрузите документ");
        return;
      }

      const userMessage: ChatMessage = {
        id: createMessageId("user"),
        role: "user",
        content: question,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setStatus("thinking");
      setStatusMessage("rpc('match_chunks') + генерация ответа LLM…");

      try {
        const response = await fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "query",
            question,
            documentId: session.documentId,
            topK: 4,
          }),
        });

        const payload = (await response.json()) as RagApiResponse;

        if (!payload.ok || payload.action !== "query") {
          const message =
            !payload.ok ? payload.error : "Неожиданный ответ query";
          setStatus("error");
          setStatusMessage(message);
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId("assistant"),
              role: "assistant",
              content: `Не удалось получить ответ: ${message}`,
              createdAt: new Date().toISOString(),
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId("assistant"),
            role: "assistant",
            content: payload.answer,
            createdAt: new Date().toISOString(),
            sources: payload.sources,
          },
        ]);
        setStatus("ready");
        setStatusMessage(
          `Ответ готов · использовано источников: ${payload.sources.length}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Сбой запроса к /api/rag";
        setStatus("error");
        setStatusMessage(message);
      }
    },
    [session],
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <header className="animate-fade-rise space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Module 01
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          AI RAG Assistant
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Загрузите документ → система разобьёт его на чанки и построит
          embeddings → чанки пишутся в Supabase (pgvector) → вопрос ищет
          ближайшие фрагменты через <code className="text-foreground">match_chunks</code> →
          LLM отвечает строго по найденному контексту.
        </p>
      </header>

      <StatusIndicator status={status} message={statusMessage} />
      <FileUploader status={status} session={session} onUpload={onUpload} />
      <ChatPanel
        messages={messages}
        status={status}
        canAsk={session !== null && status !== "indexing" && status !== "uploading"}
        onAsk={onAsk}
      />
    </div>
  );
}
