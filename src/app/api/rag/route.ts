/**
 * API Route: `/api/rag` — RAG на Supabase pgvector.
 *
 * Сценарии:
 * 1) ingest (multipart file ИЛИ JSON { action:'ingest', text })
 *    → текст → чанки → embeddings → INSERT document_chunks
 * 2) query  (JSON { action:'query', question, documentId })
 *    → embed(question) → rpc('match_chunks') → LLM ответ
 *
 * Поток данных целиком:
 * Browser UI
 *   → POST /api/rag
 *   → createSupabaseServerClient()
 *   → PostgREST / RPC на Supabase
 *   → Postgres + pgvector
 *   → JSON обратно в UI.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

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
  deleteChunksByDocumentId,
  insertEmbeddedChunks,
  matchChunksFromSupabase,
} from "@/lib/rag/vector-store";
import { hasSupabaseCredentials } from "@/lib/supabase/env";
import type {
  RagApiResponse,
  RagErrorResponse,
  RagIngestTextRequest,
  RagQueryRequest,
} from "@/types/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Единый JSON с ошибкой для UI.
 */
function errorResponse(
  error: string,
  code: RagErrorResponse["code"],
  status: number,
): NextResponse<RagApiResponse> {
  return NextResponse.json(
    { ok: false, error, code } satisfies RagErrorResponse,
    { status },
  );
}

/**
 * Проверяет, что заданы ключи OpenAI/Gateway.
 */
function ensureAiKeys(): NextResponse<RagApiResponse> | null {
  try {
    assertAiCredentials();
    return null;
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Нет API-ключа AI",
      "MISSING_API_KEY",
      401,
    );
  }
}

/**
 * Проверяет, что заданы NEXT_PUBLIC_SUPABASE_URL / ANON_KEY.
 */
function ensureSupabase(): NextResponse<RagApiResponse> | null {
  if (!hasSupabaseCredentials()) {
    return errorResponse(
      "Не заданы NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Добавьте их в Vercel Environment Variables и выполните supabase/schema.sql.",
      "MISSING_SUPABASE",
      503,
    );
  }
  return null;
}

/**
 * Общий пайплайн индексации текста в Supabase.
 *
 * Шаги:
 * 1) нарезать текст на чанки
 * 2) получить embeddings через AI SDK
 * 3) записать строки в document_chunks
 */
async function ingestTextToSupabase(params: {
  readonly text: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly source: "file" | "text";
}): Promise<NextResponse<RagApiResponse>> {
  const normalized = params.text.trim();
  if (!normalized) {
    return errorResponse(
      "Пустой текст — нечего индексировать",
      "EMPTY_DOCUMENT",
      400,
    );
  }

  // UUID документа: все чанки получат metadata.document_id = этот id
  const documentId = randomUUID();

  // Нарезка длинного текста на перекрывающиеся окна
  const textChunks = splitTextIntoChunks(normalized);
  if (textChunks.length === 0) {
    return errorResponse(
      "После нарезки не осталось чанков",
      "EMPTY_DOCUMENT",
      400,
    );
  }

  // Batch-эмбеддинги всех чанков (OpenAI text-embedding-3-small → 1536 dims)
  const embeddedChunks = await embedTextChunks(textChunks);

  // На всякий случай чистим одноимённый document_id (для идемпотентности)
  await deleteChunksByDocumentId(documentId);

  // INSERT в public.document_chunks через PostgREST
  const inserted = await insertEmbeddedChunks({
    documentId,
    chunks: embeddedChunks,
    filename: params.filename,
    mimeType: params.mimeType,
    source: params.source,
  });

  // Клиенту отдаём лёгкую session без векторов
  return NextResponse.json({
    ok: true,
    action: "ingest",
    session: {
      documentId,
      file: {
        name: params.filename,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
      },
      chunkCount: inserted,
      ingestedAt: new Date().toISOString(),
      extractedCharCount: normalized.length,
    },
  } satisfies RagApiResponse);
}

/**
 * INGEST файла (multipart/form-data с полем file).
 */
async function handleFileIngest(
  request: Request,
): Promise<NextResponse<RagApiResponse>> {
  const aiError = ensureAiKeys();
  if (aiError) return aiError;
  const sbError = ensureSupabase();
  if (sbError) return sbError;

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
    // PDF/TXT → чистая строка
    const rawText = await extractFileText(fileEntry);
    const meta = toRagFileMeta(fileEntry);

    return await ingestTextToSupabase({
      text: rawText,
      filename: meta.name,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      source: "file",
    });
  } catch (error) {
    console.error("[rag/ingest-file]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Ошибка индексации файла",
      "INTERNAL",
      500,
    );
  }
}

/**
 * INGEST сырого текста (JSON).
 * Тело: { action: 'ingest', text: '...', filename?: 'note.txt' }
 */
async function handleTextIngest(
  body: RagIngestTextRequest,
): Promise<NextResponse<RagApiResponse>> {
  const aiError = ensureAiKeys();
  if (aiError) return aiError;
  const sbError = ensureSupabase();
  if (sbError) return sbError;

  try {
    const filename = body.filename?.trim() || "pasted-text.txt";
    const text = body.text ?? "";

    return await ingestTextToSupabase({
      text,
      filename,
      mimeType: "text/plain",
      sizeBytes: Buffer.byteLength(text, "utf8"),
      source: "text",
    });
  } catch (error) {
    console.error("[rag/ingest-text]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Ошибка индексации текста",
      "INTERNAL",
      500,
    );
  }
}

/**
 * QUERY: принять текст вопроса → embedding → match_chunks → LLM.
 *
 * Это основной RAG-эндпоинт после загрузки документа.
 */
async function handleQuery(
  body: RagQueryRequest,
): Promise<NextResponse<RagApiResponse>> {
  const aiError = ensureAiKeys();
  if (aiError) return aiError;
  const sbError = ensureSupabase();
  if (sbError) return sbError;

  // Текст вопроса от пользователя (из чата)
  const question = body.question?.trim();
  if (!question) {
    return errorResponse("Вопрос не должен быть пустым", "BAD_REQUEST", 400);
  }

  // Без documentId не знаем, в каком «файле» искать
  const documentId = body.documentId?.trim();
  if (!documentId) {
    return errorResponse(
      "Нужен documentId. Сначала выполните ingest файла/текста.",
      "BAD_REQUEST",
      400,
    );
  }

  try {
    // 1) Векторизуем вопрос той же embedding-моделью, что и чанки
    const questionEmbedding = await embedQuery(question);

    // 2) Cosine-поиск в Postgres через rpc('match_chunks')
    const sources = await matchChunksFromSupabase({
      queryEmbedding: questionEmbedding,
      matchCount: body.topK ?? 4,
      matchThreshold: body.matchThreshold ?? 0.5,
      documentId,
    });

    if (sources.length === 0) {
      return errorResponse(
        "Похожие фрагменты не найдены. Загрузите документ или снизьте matchThreshold.",
        "NO_CHUNKS",
        404,
      );
    }

    // 3) Собираем промпт из top-k и генерируем ответ LLM
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
 * - multipart/form-data → ingest файла
 * - JSON action=ingest → ingest текста
 * - JSON action=query  → вопрос + match_chunks + LLM
 */
export async function POST(
  request: Request,
): Promise<NextResponse<RagApiResponse>> {
  const contentType = request.headers.get("content-type") ?? "";

  // Ветка загрузки файла (drag-and-drop из UI)
  if (contentType.includes("multipart/form-data")) {
    return handleFileIngest(request);
  }

  // Ветка JSON (query или ingest текста)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Некорректный JSON", "BAD_REQUEST", 400);
  }

  if (typeof body !== "object" || body === null || !("action" in body)) {
    return errorResponse(
      "Ожидается JSON с полем action: 'ingest' | 'query'",
      "BAD_REQUEST",
      400,
    );
  }

  const action = (body as { action: unknown }).action;

  if (action === "query") {
    return handleQuery(body as RagQueryRequest);
  }

  if (action === "ingest") {
    return handleTextIngest(body as RagIngestTextRequest);
  }

  return errorResponse(
    "Неизвестное action. Используйте 'ingest' или 'query'.",
    "BAD_REQUEST",
    400,
  );
}
