/**
 * Браузерный (Client Components) клиент Supabase.
 *
 * ЗАЧЕМ этот файл нужен:
 * - код с `"use client"` (кнопки, формы, хуки) работает в браузере;
 * - там нельзя читать cookie через `next/headers`, поэтому используем
 *   `createBrowserClient` из `@supabase/ssr`.
 *
 * Как Supabase общается с Next.js здесь:
 * 1) браузерный код вызывает `createSupabaseBrowserClient()`;
 * 2) клиент ходит в ваш Supabase-проект по `NEXT_PUBLIC_SUPABASE_URL`;
 * 3) авторизуется публичным `NEXT_PUBLIC_SUPABASE_ANON_KEY` (+ сессия в cookies);
 * 4) PostgREST/Realtime на стороне Supabase выполняет SQL/подписки.
 *
 * ВАЖНО:
 * - `NEXT_PUBLIC_*` попадают в клиентский бандл — это НОРМАЛЬНО для anon key;
 * - anon key безопасен только вместе с Row Level Security (RLS) в Postgres;
 * - service_role ключ сюда НЕ кладём никогда.
 *
 * Поток для RAG:
 * UI → /api/rag (server) → createSupabaseServerClient()
 * → from('document_chunks') / rpc('match_chunks')
 * → Postgres + pgvector → JSON обратно в Next.js.
 */

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Создаёт типизированный Supabase-клиент для браузера.
 *
 * Вызывайте функцию на каждый «логический» запрос/компонент, а не храните
 * глобальный синглтон вручную: `createBrowserClient` сам переиспользует
 * инстанс в окне браузера и синхронизирует auth-cookies.
 *
 * @example
 * ```ts
 * "use client";
 * const supabase = createSupabaseBrowserClient();
 * const { data } = await supabase.from("documents").select("id, content");
 * ```
 */
export function createSupabaseBrowserClient() {
  // Читаем URL проекта: https://xxxxxxxx.supabase.co
  const url = getSupabaseUrl();

  // Читаем публичный anon key (JWT) — права ограничивает RLS
  const anonKey = getSupabaseAnonKey();

  /**
   * createBrowserClient:
   * - поднимает HTTP-клиент к PostgREST/Auth/Storage/Realtime;
   * - пишет/читает supabase-auth cookies в document.cookie;
   * - Generic <Database> даёт автодополнение таблиц/колонок в TypeScript.
   */
  return createBrowserClient<Database>(url, anonKey);
}
