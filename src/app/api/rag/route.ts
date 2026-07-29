/**
 * API Route: `/api/rag`
 *
 * Единая точка входа модуля AI RAG Assistant.
 *
 * Два сценария (поле action):
 * 1) ingest — multipart/form-data с файлом → текст → чанки → embeddings → session
 * 2) query  — JSON { question, chunks } → embed вопроса → top-k → LLM ответ
 *
 * Полный поток данных:
 * UI upload → POST ingest → RagDocumentSession (в React state)
 * UI ask    → POST query  → answer + sources → ChatMessage в истории
 *
 * ВАЖНО (MVP): vector store живёт на клиенте в session.chunks.
 * На serverless нельзя надёжно держать Map в памяти между запросами.
 */

import { NextResponse } from "next/server";

import { splitTextIntoChunks } from "@/lib/rag/chunking";
import { embedQuery, embedTextChunks } from "@/lib/rag/embeddings";
import {
  extractFileText,
  isSupportedRagFile,
  toRagFileMeta,
} from "@/lib/rag/extract";
import { generateRagAnswer } from "@/lib/rag/generate";
import { assertAiCredentials } from "@/lib/rag/provider";
import {
  DEFAULT_TOP_K,
  retrieveRelevantChunks,
} from "@/lib/rag/similarity";
import type {
  EmbeddedChunk,
  RagApiResponse,
  RagErrorResponse,
  RagQueryRequest,
} from "@/types/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Хелпер: единообразный JSON с ошибкой для UI.
 */
function errorResponse(
  error: string,
  code: RagErrorResponse["code"],
  status: number,
): NextResponse<RagApiResponse> {
  return NextResponse.json(
    {
      ok: false,
      error,
      code,
    } satisfies RagErrorResponse,
    { status },
  );
}

/**
 * Генерирует простой уникальный id без внешних зависимостей.
 */
function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Проверяет, что массив чанков похож на EmbeddedChunk[].
 * ЗАЧЕМ: не доверяем клиенту слепо — минимальная runtime-валидация.
 */
function isEmbeddedChunks(value: unknown): value is EmbeddedChunk[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  return value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const chunk = item as Record<string, unknown>;
    return (
      typeof chunk.index === "number" &&
      typeof chunk.content === "string" &&
      typeof chunk.charCount === "number" &&
      Array.isArray(chunk.embedding) &&
      chunk.embedding.every((n) => typeof n === "number")
    );
  });
}

/**
 * INGEST: файл → текст → чанки → векторы → session для клиента.
 */
async function handleIngest(
  request: Request,
): Promise<NextResponse<RagApiResponse>> {
  try {
    assertAiCredentials();
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Нет API-ключа",
      "MISSING_API_KEY",
      401,
    );
  }

  const form = await request.formData();
  const fileEntry = form.get("file");

  if (!(fileEntry instanceof File)) {
    return errorResponse(
      "В form-data ожидается поле file",
      "BAD_REQUEST",
      400,
    );
  }

  if (!isSupportedRagFile(fileEntry)) {
    return errorResponse(
      "Поддерживаются только файлы .txt и .pdf",
      "UNSUPPORTED_FILE",
      400,
    );
  }

  try {
    const rawText = await extractFileText(fileEntry);
    if (!rawText) {
      return errorResponse(
        "Не удалось извлечь текст из файла (документ пуст?)",
        "EMPTY_DOCUMENT",
        400,
      );
    }

    const textChunks = splitTextIntoChunks(rawText);
    if (textChunks.length === 0) {
      return errorResponse(
        "После нарезки не осталось чанков",
        "EMPTY_DOCUMENT",
        400,
      );
    }

    const embeddedChunks = await embedTextChunks(textChunks);

    const session = {
      documentId: createId("doc"),
      file: toRagFileMeta(fileEntry),
      chunks: embeddedChunks,
      ingestedAt: new Date().toISOString(),
      extractedCharCount: rawText.length,
    };

    return NextResponse.json({
      ok: true,
      action: "ingest",
      session,
    } satisfies RagApiResponse);
  } catch (error) {
    console.error("[rag/ingest]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Ошибка индексации файла",
      "INTERNAL",
      500,
    );
  }
}

/**
 * QUERY: вопрос + чанки → retrieval → LLM → ответ.
 */
async function handleQuery(
  body: RagQueryRequest,
): Promise<NextResponse<RagApiResponse>> {
  try {
    assertAiCredentials();
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Нет API-ключа",
      "MISSING_API_KEY",
      401,
    );
  }

  const question = body.question?.trim();
  if (!question) {
    return errorResponse("Вопрос не должен быть пустым", "BAD_REQUEST", 400);
  }

  if (!isEmbeddedChunks(body.chunks)) {
    return errorResponse(
      "Нет проиндексированных чанков. Сначала загрузите файл.",
      "NO_CHUNKS",
      400,
    );
  }

  try {
    const questionEmbedding = await embedQuery(question);
    const sources = retrieveRelevantChunks(
      questionEmbedding,
      body.chunks,
      body.topK ?? DEFAULT_TOP_K,
    );
    const answer = await generateRagAnswer(question, sources);

    return NextResponse.json({
      ok: true,
      action: "query",
      answer,
      sources,
    } satisfies RagApiResponse);
  } catch (error) {
    console.error("[rag/query]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Ошибка генерации ответа",
      "INTERNAL",
      500,
    );
  }
}

/**
 * POST /api/rag
 * - Content-Type multipart → ingest
 * - Content-Type JSON → query (action обязателен)
 */
export async function POST(
  request: Request,
): Promise<NextResponse<RagApiResponse>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return handleIngest(request);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Некорректный JSON", "BAD_REQUEST", 400);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "action" in body &&
    (body as { action: unknown }).action === "query"
  ) {
    return handleQuery(body as RagQueryRequest);
  }

  return errorResponse(
    "Неизвестное действие. Используйте multipart ingest или JSON { action: 'query' }",
    "BAD_REQUEST",
    400,
  );
}
