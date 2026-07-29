/**
 * Серверный клиент Supabase для App Router (Server Components, Route Handlers,
 * Server Actions).
 *
 * ЗАЧЕМ отдельно от browser-клиента:
 * - на сервере нет `window` / `document.cookie`;
 * - сессию пользователя нужно читать/обновлять через Next.js `cookies()`;
 * - `@supabase/ssr` как раз склеивает Auth Supabase с cookie-хранилищем Next.
 *
 * Как данные протекают:
 * Request (cookie: sb-*-auth-token)
 *   → createSupabaseServerClient() читает cookies через next/headers
 *   → supabase.auth / supabase.from(...) / supabase.rpc('match_documents')
 *   → HTTPS к Supabase API
 *   → Postgres (в т.ч. pgvector) выполняет SQL
 *   → JSON обратно в Route Handler → Response в браузер.
 *
 * Для RAG ingest/query предпочтителен именно server client:
 * ключи моделей и тяжёлая логика остаются на сервере, а в БД пишем чанки.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/supabase";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Создаёт Supabase-клиент, привязанный к cookies текущего HTTP-запроса.
 *
 * В Next.js 14 `cookies()` синхронный.
 * В Server Component запись cookie может быть запрещена — поэтому `setAll`
 * обёрнут в try/catch (сессию тогда обновит middleware, когда добавим его).
 *
 * @example
 * ```ts
 * // src/app/api/rag/route.ts
 * const supabase = createSupabaseServerClient();
 * const { data, error } = await supabase.rpc("match_chunks", {
 *   query_embedding: embedding,
 *   match_count: 4,
 *   match_threshold: 0.5,
 *   filter_document_id: documentId,
 * });
 * ```
 */
export function createSupabaseServerClient() {
  // Берём cookie store текущего запроса (изолирован per-request)
  const cookieStore = cookies();

  // URL и anon key — те же public env, что и на клиенте
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  /**
   * createServerClient принимает адаптер cookies:
   * getAll — прочитать все cookie запроса (в т.ч. supabase auth);
   * setAll — записать обновлённые cookie в ответ (refresh token и т.п.).
   */
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      /**
       * Читаем все cookies, которые пришли с запросом браузера.
       * Supabase найдёт среди них свою auth-сессию (если пользователь вошёл).
       */
      getAll() {
        return cookieStore.getAll();
      },

      /**
       * Записываем cookies, которые Supabase хочет обновить
       * (например, после refresh access token).
       */
      setAll(cookiesToSet) {
        try {
          // Для каждого cookie: имя, значение, httpOnly/secure/path/...
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /**
           * В чистом Server Component `cookies().set` может бросить ошибку.
           * Это ожидаемо: запись сессии делаем из Route Handler / middleware.
           * Здесь просто не падаем, чтобы select/rpc продолжали работать.
           */
        }
      },
    },
  });
}
