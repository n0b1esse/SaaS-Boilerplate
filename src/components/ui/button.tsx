/**
 * Button — базовый интерактивный примитив Nexus UI.
 *
 * ЗАЧЕМ:
 * - единый вид CTA/действий во всех модулях;
 * - варианты (variant/size) через Tailwind + cn, без отдельного CSS-файла.
 *
 * Поток props:
 * variant/size/className → cn() → итоговый className на <button> или Slot-like child.
 */

import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Визуальные варианты кнопки */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

/** Размеры кнопки */
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

/**
 * Карта классов по вариантам.
 * Вынесена из компонента, чтобы JSX оставался читаемым.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
  secondary:
    "bg-surface-elevated text-foreground hover:bg-surface border border-border",
  ghost: "bg-transparent text-foreground hover:bg-surface-elevated",
  outline:
    "border border-border bg-transparent hover:bg-surface-elevated text-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-10 w-10",
};

/**
 * Кнопка платформы. forwardRef нужен для фокуса из родительских форм/меню.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
