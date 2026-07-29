/**
 * Конфигурация Tailwind CSS для Nexus Platform.
 *
 * ЗАЧЕМ этот файл нужен:
 * - указывает, какие файлы сканировать на className (content);
 * - расширяет тему CSS-переменными (цвета, шрифты, радиусы);
 * - включает class-based dark mode: класс `dark` на <html> переключает тему.
 *
 * Поток данных стилей:
 * ThemeProvider ставит class="dark" на <html>
 * → Tailwind применяет варианты `dark:*`
 * → CSS-переменные из globals.css подставляют палитру.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  /**
   * class-стратегия: тема управляется нами через JS, а не только OS prefers-color-scheme.
   * Это нужно для переключателя Light/Dark в Header.
   */
  darkMode: "class",

  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /**
       * Цвета через CSS-переменные: одна точка правды в globals.css.
       * Меняем переменные — меняется вся тема без правок className.
       */
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          elevated: "rgb(var(--color-surface-elevated) / <alpha-value>)",
        },
        border: "rgb(var(--color-border) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          foreground: "rgb(var(--color-accent-foreground) / <alpha-value>)",
        },
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
      },
      fontFamily: {
        /** Основной UI-шрифт (Geist Sans), подключается в root layout */
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "sans-serif"],
        /** Моноширинный для CLI/логов и технических меток */
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        /**
         * Мягкая «карточная» тень для виджетов дашборда —
         * не многослойный glow, а лёгкий depth-сигнал.
         */
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.06)",
        "card-dark":
          "0 1px 2px rgb(0 0 0 / 0.3), 0 12px 32px rgb(0 0 0 / 0.35)",
      },
      backgroundImage: {
        /**
         * Атмосферный фон платформы: радиальный градиент + сетка.
         * Даёт глубину без плоского одноцветного canvas.
         */
        "nexus-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgb(var(--color-glow) / 0.35), transparent)",
        "nexus-grid":
          "linear-gradient(to right, rgb(var(--color-border) / 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--color-border) / 0.35) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
      keyframes: {
        /**
         * Появление карточек модулей: лёгкий fade+rise для иерархии.
         * Используется на дашборде, не как декоративный шум.
         */
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        /** Пульс статуса сервиса (online-индикатор в Header) */
        "status-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.5s ease-out both",
        "status-pulse": "status-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
