/**
 * Card — контейнер для виджетов дашборда и интерактивных блоков.
 *
 * ЗАЧЕМ карточки здесь допустимы:
 * - каждая карточка модуля — точка взаимодействия (переход в суб-проект);
 * - визуально отделяет статус/архитектуру модуля от фона страницы.
 *
 * Составные части (CardHeader/Title/Description/Content) позволяют
 * собирать разную разметку без дублирования border/padding.
 */

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Корневая оболочка карточки.
 */
export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/80 backdrop-blur-sm",
        "shadow-card dark:shadow-card-dark",
        "transition-[transform,box-shadow,border-color] duration-300",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Верхняя зона карточки: иконка + заголовок + метаданные.
 */
export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-5 pb-3", className)}
      {...props}
    />
  );
}

/**
 * Заголовок карточки.
 */
export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Подзаголовок / краткое описание.
 */
export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted", className)} {...props} />
  );
}

/**
 * Основное тело карточки.
 */
export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
