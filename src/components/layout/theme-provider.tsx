/**
 * ThemeProvider — управление Light/Dark темой Nexus Platform.
 *
 * ЗАЧЕМ:
 * - единая точка правды для режима темы;
 * - синхронизация с localStorage и классом `dark` на <html> (Tailwind darkMode: "class").
 *
 * Поток данных:
 * 1) при монтировании читаем localStorage / prefers-color-scheme
 * 2) ставим class на document.documentElement
 * 3) пользователь кликает ThemeToggle → setTheme → снова class + localStorage
 *
 * Это Client Component: нужны useState/useEffect и доступ к window/document.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { ThemeMode } from "@/types";

/** Ключ в localStorage — чтобы тема переживала перезагрузку */
const THEME_STORAGE_KEY = "nexus-theme";

interface ThemeContextValue {
  /** Текущий режим темы */
  readonly theme: ThemeMode;
  /** Явно задать тему */
  readonly setTheme: (mode: ThemeMode) => void;
  /** Переключить light ↔ dark */
  readonly toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  readonly children: ReactNode;
}

/**
 * Применяет CSS-класс темы к корневому элементу документа.
 * Tailwind реагирует на наличие класса `dark`.
 */
function applyThemeClass(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

/**
 * Определяет стартовую тему до/после гидрации.
 * Приоритет: сохранённый выбор пользователя → системная предпочтение → light.
 */
function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Провайдер темы: оборачивает приложение в root layout.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  /**
   * Стартуем с "light", чтобы SSR и первый клиентский рендер совпали.
   * Реальную тему применяем в useEffect после гидрации (избегаем mismatch).
   */
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    applyThemeClass(initial);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    applyThemeClass(mode);
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemeMode = current === "dark" ? "light" : "dark";
      applyThemeClass(next);
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Хук доступа к теме.
 * ЗАЧЕМ отдельный хук: компоненты не импортируют Context напрямую.
 *
 * @throws если вызван вне ThemeProvider — это ошибка композиции UI.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme должен вызываться внутри ThemeProvider");
  }
  return context;
}
