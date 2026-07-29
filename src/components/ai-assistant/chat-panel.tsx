/**
 * ChatPanel — история сообщений + поле ввода вопроса.
 *
 * Поток:
 * submit → onAsk(question) → родитель POST /api/rag query → append assistant message.
 */

"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { SendHorizontal } from "lucide-react";

import { ChatMessageBubble } from "@/components/ai-assistant/chat-message-bubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage, RagUiStatus } from "@/types/rag";

interface ChatPanelProps {
  readonly messages: readonly ChatMessage[];
  readonly status: RagUiStatus;
  readonly canAsk: boolean;
  readonly onAsk: (question: string) => Promise<void>;
}

/**
 * Чат-интерфейс RAG-ассистента.
 */
export function ChatPanel({
  messages,
  status,
  canAsk,
  onAsk,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "thinking" || status === "uploading" || status === "indexing";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const submit = async () => {
    const question = draft.trim();
    if (!question || !canAsk || busy) {
      return;
    }
    setDraft("");
    await onAsk(question);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit();
  };

  const onKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await submit();
    }
  };

  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-surface/70 shadow-card dark:shadow-card-dark">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Чат с документом</h3>
        <p className="text-xs text-muted">
          Ответ строится только по релевантным чанкам загруженного файла (RAG).
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            Загрузите файл и задайте вопрос — например: «Кратко перескажи документ»
            или «Какие сроки указаны в тексте?».
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))
        )}

        {status === "thinking" ? (
          <p className="text-xs text-muted animate-pulse">
            Ищу релевантные чанки и генерирую ответ…
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-border p-3"
      >
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border border-border bg-background/70 p-2",
            !canAsk && "opacity-60",
          )}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={!canAsk || busy}
            rows={2}
            placeholder={
              canAsk
                ? "Введите вопрос по документу…"
                : "Сначала загрузите и проиндексируйте файл"
            }
            className="max-h-40 min-h-[52px] flex-1 resize-y bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canAsk || busy || draft.trim().length === 0}
            aria-label="Отправить вопрос"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
