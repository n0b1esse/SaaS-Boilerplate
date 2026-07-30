/**
 * Чтение и проверка env-переменных Supabase.
 *
 * ЗАЧЕМ вынесено отдельно:
 * - и browser-, и server-клиент берут URL/ключ из одного места;
 * - при отсутствии переменных получаем понятную русскую ошибку, а не
 *   «Failed to fetch» из глубины SDK.
 *
 * Откуда берутся значения:
 * - локально: `.env.local`;
 * - на Vercel: Project → Settings → Environment Variables.
 *
 * Два имени переменных (сервер читает оба, с приоритетом server-only):
 * - `SUPABASE_URL` / `SUPABASE_ANON_KEY` — доступны на **runtime** в API routes
 *   без пересборки после изменения env на Vercel;
 * - `NEXT_PUBLIC_SUPABASE_*` — вшиваются в бандл на **build** (нужен для браузера).
 */

const PLACEHOLDER_URL = "your-project-url";
const PLACEHOLDER_KEY = "your-anon-key";

/**
 * Проверяет, что строка — валидный HTTP(S) URL для Supabase SDK.
 * Частая ошибка: `xxxx.supabase.co` без префикса `https://`.
 */
function assertValidSupabaseUrl(url: string, envName: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("protocol");
    }
  } catch {
    throw new Error(
      `Некорректный ${envName}: «${url}». Укажите полный URL вида https://<project-ref>.supabase.co (Supabase → Project Settings → API → Project URL).`,
    );
  }
}

/**
 * Берёт первое непустое значение из списка имён env-переменных.
 */
function pickEnv(...names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

/**
 * Возвращает URL Supabase-проекта.
 * Приоритет: SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL.
 */
export function getSupabaseUrl(): string {
  const url = pickEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");

  if (!url || url === PLACEHOLDER_URL) {
    throw new Error(
      "Не задан SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL. Укажите URL проекта Supabase в .env.local или в Vercel Environment Variables.",
    );
  }

  assertValidSupabaseUrl(url, "SUPABASE_URL");
  return url;
}

/**
 * Возвращает публичный anon key проекта.
 * Приоритет: SUPABASE_ANON_KEY → NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function getSupabaseAnonKey(): string {
  const key = pickEnv("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!key || key === PLACEHOLDER_KEY) {
    throw new Error(
      "Не задан SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY. Скопируйте anon key из Supabase → Project Settings → API.",
    );
  }

  return key;
}

/**
 * Мягкая проверка: есть ли реальные (не-заглушечные) credentials.
 */
export function hasSupabaseCredentials(): boolean {
  try {
    getSupabaseUrl();
    getSupabaseAnonKey();
    return true;
  } catch {
    return false;
  }
}
