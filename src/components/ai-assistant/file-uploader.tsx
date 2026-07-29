/**
 * FileUploader — drag-and-drop зона для .txt / .pdf.
 *
 * Поток UX:
 * drop/select файла → onUpload(file) (родитель шлёт FormData в /api/rag)
 * → статус uploading/indexing → session появляется в родителе.
 */

"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { FileUp, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RagDocumentSession, RagUiStatus } from "@/types/rag";

interface FileUploaderProps {
  readonly status: RagUiStatus;
  readonly session: RagDocumentSession | null;
  readonly onUpload: (file: File) => Promise<void>;
  readonly disabled?: boolean;
}

const ACCEPT = ".txt,.pdf,text/plain,application/pdf";

/**
 * Зона загрузки документа для RAG.
 */
export function FileUploader({
  status,
  session,
  onUpload,
  disabled = false,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const busy = status === "uploading" || status === "indexing" || disabled;

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file || busy) {
        return;
      }
      await onUpload(file);
    },
    [busy, onUpload],
  );

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleFiles(event.target.files);
    event.target.value = "";
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border border-dashed border-border bg-surface/70 p-5 transition-colors",
        isDragging && "border-accent bg-accent/5",
        busy && "opacity-70",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent">
            <FileUp className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Загрузите .txt или .pdf
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Перетащите файл сюда или выберите вручную. Сервер нарежет текст
              на чанки и построит embeddings для semantic search.
            </p>
          </div>
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={onChange}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Обработка…" : "Выбрать файл"}
          </Button>
        </div>
      </div>

      {session ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-background/50 px-3 py-2.5">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium text-foreground">
              {session.file.name}
            </p>
            <p className="text-muted">
              {session.chunks.length} чанков ·{" "}
              {session.extractedCharCount.toLocaleString("ru-RU")} символов ·{" "}
              {(session.file.sizeBytes / 1024).toFixed(1)} КБ
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
