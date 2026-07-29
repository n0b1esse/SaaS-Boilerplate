/**
 * ModulePlaceholder — типовая заглушка страницы будущего модуля.
 *
 * ЗАЧЕМ:
 * - одинаковый UX для /ai-assistant, /collaboration и т.д. до реализации фич;
 * - сразу показывает архитектурный контекст модуля (обучение).
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Badge,
  MODULE_STATUS_LABEL,
  toneFromModuleStatus,
} from "@/components/ui/badge";
import { resolveNavIcon } from "@/lib/icons";
import type { PlatformModule } from "@/types";

interface ModulePlaceholderProps {
  readonly module: PlatformModule;
}

/**
 * Контент-заглушка для маршрута модуля.
 */
export function ModulePlaceholder({ module }: ModulePlaceholderProps) {
  const Icon = resolveNavIcon(module.icon);

  return (
    <div className="mx-auto max-w-3xl animate-fade-rise space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {module.title}
            </h2>
            <Badge tone={toneFromModuleStatus(module.status)}>
              {MODULE_STATUS_LABEL[module.status]}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {module.summary}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Архитектурный контур</CardTitle>
          <CardDescription>
            Черновик потока данных модуля. Реализацию будем наращивать
            итерациями, не ломая общий shell платформы.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-xl border border-border bg-background/60 p-4 font-mono text-xs leading-relaxed text-muted whitespace-pre-wrap">
            {module.architecture}
          </pre>
          <p className="mt-4 text-xs uppercase tracking-wide text-muted">
            {module.tag}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
