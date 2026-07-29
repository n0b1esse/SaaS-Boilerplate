/**
 * ModuleCard — виджет статуса одного суб-проекта на дашборде.
 *
 * ЗАЧЕМ:
 * - показывает название, статус, краткое описание и архитектурный замысел;
 * - является точкой перехода в модуль (интерактивный контейнер → карточка уместна).
 *
 * Поток данных:
 * PlatformModule (из constants) → ModuleCard props → Link + Badge + текст.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  Badge,
  MODULE_STATUS_LABEL,
  toneFromModuleStatus,
} from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveNavIcon } from "@/lib/icons";
import type { PlatformModule } from "@/types";

interface ModuleCardProps {
  readonly module: PlatformModule;
  /** Задержка анимации появления для staggered effect */
  readonly animationDelayMs?: number;
}

/**
 * Карточка модуля платформы.
 */
export function ModuleCard({
  module,
  animationDelayMs = 0,
}: ModuleCardProps) {
  const Icon = resolveNavIcon(module.icon);

  return (
    <Link
      href={module.href}
      className="group block h-full animate-fade-rise focus-visible:outline-none"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <Card className="h-full group-hover:-translate-y-0.5 group-hover:border-accent/35 group-focus-visible:ring-2 group-focus-visible:ring-accent/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <Badge tone={toneFromModuleStatus(module.status)}>
              {MODULE_STATUS_LABEL[module.status]}
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 pt-1">
            {module.title}
            <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </CardTitle>
          <CardDescription>{module.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-xl border border-border/80 bg-background/50 p-3 font-mono text-[11px] leading-relaxed text-muted">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-accent">
              Архитектура
            </span>
            {module.architecture}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {module.tag}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
