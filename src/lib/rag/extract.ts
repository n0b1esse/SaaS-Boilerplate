/**
 * Извлечение текста из загруженного файла (.txt / .pdf).
 *
 * ЗАЧЕМ:
 * - RAG работает с текстом; PDF — бинарный формат, его нужно распарсить;
 * - единая функция extractFileText() скрывает различия форматов от route.
 *
 * Поток:
 * File/Blob → ArrayBuffer → (txt decode | unpdf.extractText) → string.
 */

import { extractText } from "unpdf";

import type { RagFileMeta } from "@/types/rag";

/** Лимит размера файла в MVP (5 МБ) — защита от OOM на serverless */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Проверяет, поддерживаем ли мы этот файл по имени/MIME.
 */
export function isSupportedRagFile(file: {
  name: string;
  type: string;
}): boolean {
  const lower = file.name.toLowerCase();
  const byExt = lower.endsWith(".txt") || lower.endsWith(".pdf");
  const byMime =
    file.type === "text/plain" ||
    file.type === "application/pdf" ||
    file.type === "application/octet-stream";
  return byExt || byMime;
}

/**
 * Собирает метаданные файла для ответа API / UI.
 */
export function toRagFileMeta(file: File): RagFileMeta {
  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

/**
 * Извлекает чистый текст из File.
 *
 * @throws если формат не поддержан или текст пустой
 */
export async function extractFileText(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Файл слишком большой (${file.size} байт). Лимит MVP: ${MAX_UPLOAD_BYTES} байт`,
    );
  }

  if (!isSupportedRagFile(file)) {
    throw new Error("Поддерживаются только .txt и .pdf");
  }

  const lower = file.name.toLowerCase();
  const isPdf =
    lower.endsWith(".pdf") || file.type === "application/pdf";

  if (isPdf) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    /**
     * mergePages: true → unpdf склеивает страницы в одну строку.
     * Это удобно для chunking: мы сами режем текст окнами, а не по страницам PDF.
     */
    const result = await extractText(buffer, { mergePages: true });
    return result.text.trim();
  }

  return (await file.text()).trim();
}
