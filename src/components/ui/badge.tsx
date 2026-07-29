/**
 * Badge — компактная метка статуса / тега.
 *
 * ЗАЧЕМ:
 * - на дашборде показывает статус модуля (planned/scaffolding/active);
 * - в Header может маркировать health сервисов.
 */

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import type { ModuleStatus, ServiceHealth } from "@/types";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-elevated text-muted border-border",
  accent: "bg-accent/15 text-accent border-accent/25",
  success: "bg-success/15 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/25",
};

/**
 * Универсальный бейдж с тоном цвета.
 */
export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Преобразует статус модуля в тон бейджа.
 * ЗАЧЕМ отдельно: UI-карточки не должны знать про цветовую семантику статусов.
 */
export function toneFromModuleStatus(status: ModuleStatus): BadgeTone {
  switch (status) {
    case "active":
      return "success";
    case "scaffolding":
      return "accent";
    case "planned":
      return "neutral";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Преобразует health сервиса в тон бейджа.
 */
export function toneFromServiceHealth(health: ServiceHealth): BadgeTone {
  switch (health) {
    case "online":
      return "success";
    case "degraded":
      return "warning";
    case "offline":
      return "danger";
    case "unknown":
      return "neutral";
    default: {
      const _exhaustive: never = health;
      return _exhaustive;
    }
  }
}

/** Человекочитаемые подписи статусов модуля (RU) */
export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
  planned: "В планах",
  scaffolding: "Каркас",
  active: "Активен",
};
