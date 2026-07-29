/**
 * Индикатор статуса RAG-модуля (загрузка / индексация / генерация / ошибка).
 *
 * ЗАЧЕМ: пользователь всегда видит, на каком этапе пайплайна мы находимся.
 */

import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import type { RagUiStatus } from "@/types/rag";

interface StatusIndicatorProps {
  readonly status: RagUiStatus;
  readonly message?: string;
}

const STATUS_COPY: Record<
  RagUiStatus,
  { label: string; tone: BadgeTone; busy: boolean }
> = {
  idle: { label: "Ожидание", tone: "neutral", busy: false },
  uploading: { label: "Загрузка файла", tone: "accent", busy: true },
  indexing: { label: "Индексация (чанки + embeddings)", tone: "accent", busy: true },
  ready: { label: "Документ готов", tone: "success", busy: false },
  thinking: { label: "Генерация ответа", tone: "accent", busy: true },
  error: { label: "Ошибка", tone: "danger", busy: false },
};

/**
 * Компактный статус-бар под шапкой модуля.
 */
export function StatusIndicator({ status, message }: StatusIndicatorProps) {
  const meta = STATUS_COPY[status];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={meta.tone} className="normal-case tracking-normal gap-1.5">
        {meta.busy ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : null}
        {meta.label}
      </Badge>
      {message ? (
        <p className="text-xs text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
