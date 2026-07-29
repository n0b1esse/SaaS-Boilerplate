/**
 * Одно сообщение чата (user / assistant / system).
 *
 * Для assistant дополнительно можно показать источники (chunk index + score).
 */

import { Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/rag";

interface ChatMessageBubbleProps {
  readonly message: ChatMessage;
}

/**
 * Пузырь сообщения с опциональным блоком sources.
 */
export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <article
      className={cn(
        "flex gap-3 animate-fade-rise",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-accent text-accent-foreground"
            : "bg-surface-elevated text-accent",
        )}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "max-w-[85%] space-y-2 rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "border-accent/25 bg-accent/10 text-foreground"
            : isSystem
              ? "border-border bg-surface/60 text-muted"
              : "border-border bg-surface text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {message.sources && message.sources.length > 0 ? (
          <details className="rounded-lg border border-border/70 bg-background/40 px-2.5 py-2 text-[11px] text-muted">
            <summary className="cursor-pointer select-none font-medium text-foreground/80">
              Источники RAG ({message.sources.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {message.sources.map((source) => (
                <li key={`${message.id}-${source.index}`}>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
                    chunk {source.index} · score {source.score.toFixed(3)}
                  </p>
                  <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap">
                    {source.content}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </article>
  );
}
