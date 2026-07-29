/**
 * Разбиение длинного текста на чанки для RAG.
 *
 * ЗАЧЕМ:
 * - embedding-модель лучше кодирует смысловые куски ~300–800 токенов;
 * - retriever возвращает несколько маленьких релевантных кусков, а не весь файл.
 *
 * Поток:
 * rawText → нормализация пробелов → скользящее окно (size/overlap) → TextChunk[].
 *
 * overlap нужен, чтобы предложение на границе двух окон не «разрезалось»
 * и смысл не терялся при retrieval.
 */

import type { TextChunk } from "@/types/rag";

/** Параметры нарезки — вынесены, чтобы их было легко тюнить без правки алгоритма */
export interface ChunkingOptions {
  /** Целевой размер чанка в символах (грубая эвристика вместо токенизатора) */
  readonly chunkSize: number;
  /** Сколько символов из хвоста предыдущего чанка повторить в следующем */
  readonly chunkOverlap: number;
}

/** Значения по умолчанию для MVP: баланс между recall и размером промпта */
export const DEFAULT_CHUNKING: ChunkingOptions = {
  chunkSize: 800,
  chunkOverlap: 150,
};

/**
 * Нормализует текст: убирает лишние пробелы/переводы строк.
 * ЗАЧЕМ: PDF часто даёт «рваные» переносы; чистый текст → стабильнее чанки.
 */
export function normalizeDocumentText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Режет текст на перекрывающиеся фрагменты фиксированного размера.
 *
 * @param text — уже извлечённый и желательно нормализованный текст документа
 * @param options — размер окна и overlap
 * @returns массив TextChunk без эмбеддингов (эмбеддинги добавит следующий шаг)
 */
export function splitTextIntoChunks(
  text: string,
  options: ChunkingOptions = DEFAULT_CHUNKING,
): TextChunk[] {
  const { chunkSize, chunkOverlap } = options;

  if (chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap должен быть меньше chunkSize");
  }

  const normalized = normalizeDocumentText(text);
  if (!normalized) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const content = normalized.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        index,
        content,
        charCount: content.length,
      });
      index += 1;
    }

    if (end >= normalized.length) {
      break;
    }

    start = end - chunkOverlap;
  }

  return chunks;
}
