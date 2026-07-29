/**
 * Конфигурация Next.js для Nexus Platform.
 *
 * ЗАЧЕМ этот файл нужен:
 * - задаёт поведение фреймворка (роутинг App Router уже включён по умолчанию);
 * - сюда позже добавим редиректы, headers безопасности, remotePatterns для картинок.
 *
 * Поток конфигурации:
 * `next.config.mjs` → читается CLI (`next build` / `next dev`) → влияет на сборку и runtime.
 *
 * @see https://nextjs.org/docs/app/api-reference/next-config-js
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * reactStrictMode помогает ловить побочные эффекты в разработке
   * (двойной вызов эффектов) — полезно для учебного проекта.
   */
  reactStrictMode: true,
};

export default nextConfig;
