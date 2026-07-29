/**
 * Input — базовое текстовое поле формы.
 *
 * ЗАЧЕМ:
 * - единый визуальный язык полей во всех будущих модулях (settings, billing, chat);
 * - наследует нативные атрибуты input через ButtonHTML-подобный паттерн.
 *
 * Поток: value/onChange от родителя → controlled input → событие обратно в форму/state.
 */

import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Текстовый инпут платформы.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
