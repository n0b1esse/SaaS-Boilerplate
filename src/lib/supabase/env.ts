/**
 * Чтение и проверка env-переменных Supabase.
 *
 * ЗАЧЕМ вынесено отдельно:
 * - и browser-, и server-клиент берут URL/ключ из одного места;
 * - при отсутствии переменных получаем понятную русскую ошибку, а не
 *   «Failed to fetch» из глубины SDK.
 *
 * Откуда берутся значения:
 * - локально: файл `.env.local` (Next.js подхватывает автоматически);
 * - на Vercel: Project → Settings → Environment Variables.
 *
 * Префикс NEXT_PUBLIC_ обязателен, если переменная нужна и в браузере:
 * Next.js вшивает такие ключи в клиентский бандл на этапе сборки.
 */

/**
 * Возвращает URL Supabase-проекта.
 * Пример: https://abcdefgh.supabase.co
 */
export function getSupabaseUrl(): string {
  // process.env заполняется Next.js из .env.local / Vercel env
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  // Пустая заглушка или отсутствие переменной — сразу объясняем, что делать
  if (!url || url === "your-project-url") {
    throw new Error(
      "Не задан NEXT_PUBLIC_SUPABASE_URL. Укажите URL проекта Supabase в .env.local или в Vercel Environment Variables.",
    );
  }

  return url;
}

/**
 * Возвращает публичный anon key проекта.
 * Это JWT с ролью `anon`; доступ к данным режет RLS.
 */
export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!key || key === "your-anon-key") {
    throw new Error(
      "Не задан NEXT_PUBLIC_SUPABASE_ANON_KEY. Скопируйте anon/public key из Supabase → Project Settings → API.",
    );
  }

  return key;
}

/**
 * Мягкая проверка: есть ли реальные (не-заглушечные) credentials.
 * Удобно для UI-статуса «Supabase подключён / ещё нет» без throw.
 */
export function hasSupabaseCredentials(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return Boolean(
    url &&
      key &&
      url !== "your-project-url" &&
      key !== "your-anon-key",
  );
}
