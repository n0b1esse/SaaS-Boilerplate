/**
 * Конфигурация PostCSS для Nexus Platform.
 *
 * ЗАЧЕМ: Tailwind CSS работает как PostCSS-плагин.
 * Цепочка обработки стилей:
 * `globals.css` → PostCSS (tailwindcss + autoprefixer) → итоговый CSS в браузере.
 */

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    /** Генерирует utility-классы Tailwind на основе content-путей из tailwind.config.ts */
    tailwindcss: {},
  },
};

export default config;
