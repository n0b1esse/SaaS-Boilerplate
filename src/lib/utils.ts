/**
 * Утилита объединения CSS-классов для Tailwind.
 *
 * ЗАЧЕМ нужна `cn`:
 * - `clsx` удобно склеивает условные классы (`{ "opacity-50": disabled }`);
 * - `tailwind-merge` разрешает конфликты утилит (`p-2` + `p-4` → останется `p-4`).
 *
 * Поток данных:
 * вход: набор строк / объектов условий
 * → clsx нормализует в одну строку
 * → twMerge убирает конфликтующие Tailwind-классы
 * → выход: безопасная строка className для JSX.
 *
 * Пример:
 * `cn("px-2 py-1", isActive && "bg-accent", className)`
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Объединяет произвольные ClassValue в одну строку без конфликтов Tailwind.
 *
 * @param inputs — строки, массивы, объекты условий (формат clsx)
 * @returns итоговая строка классов для атрибута className
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
