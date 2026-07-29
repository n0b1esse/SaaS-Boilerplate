/**
 * ServiceStatusBar — индикаторы подключения БД / Redis / AI в Header.
 *
 * ЗАЧЕМ:
 * - сразу видно «живость» инфраструктуры платформы;
 * - сейчас данные-заглушки из constants; позже — ответ health API.
 *
 * Поток:
 * SERVICE_STATUSES → map → точка цвета + label → tooltip через title/aria.
 */

import { Database, Cpu, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Badge,
  toneFromServiceHealth,
} from "@/components/ui/badge";
import { SERVICE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/types";

/** Иконка по id сервиса */
const SERVICE_ICONS: Record<ServiceStatus["id"], LucideIcon> = {
  database: Database,
  redis: Workflow,
  ai: Cpu,
};

/**
 * Цвет «точки» статуса — отдельный визуальный якорь рядом с бейджем.
 */
function healthDotClass(health: ServiceStatus["health"]): string {
  switch (health) {
    case "online":
      return "bg-success animate-status-pulse";
    case "degraded":
      return "bg-warning animate-status-pulse";
    case "offline":
      return "bg-danger";
    case "unknown":
      return "bg-muted";
    default: {
      const _exhaustive: never = health;
      return _exhaustive;
    }
  }
}

/**
 * Панель статусов сервисов для шапки.
 */
export function ServiceStatusBar() {
  return (
    <ul
      className="hidden items-center gap-2 md:flex"
      aria-label="Статусы сервисов"
    >
      {SERVICE_STATUSES.map((service) => {
        const Icon = SERVICE_ICONS[service.id];
        return (
          <li key={service.id}>
            <Badge
              tone={toneFromServiceHealth(service.health)}
              title={service.detail}
              className="normal-case tracking-normal gap-1.5 py-1"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  healthDotClass(service.health),
                )}
                aria-hidden
              />
              <Icon className="h-3 w-3" aria-hidden />
              <span>{service.label}</span>
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
