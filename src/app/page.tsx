/**
 * Home (`/`) — витрина модулей Nexus Platform.
 *
 * ЗАЧЕМ:
 * - первый экран после входа показывает статус всех суб-проектов;
 * - кратко объясняет архитектурный замысел каждого модуля.
 *
 * Поток: PLATFORM_MODULES (constants) → ModulesGrid → ModuleCard.
 */

import { ModulesGrid } from "@/components/dashboard/modules-grid";

/**
 * Главная страница платформы (дашборд-обзор).
 */
export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="animate-fade-rise space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Nexus Platform
        </p>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Модульная SaaS-операционная система для портфолио-разработки
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted md:text-base">
          Пять суб-проектов живут в одном shell: общий layout, типы и UI-кит.
          Каждый модуль наращивается отдельно — от каркаса до production-потока
          данных.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Модули платформы
          </h3>
          <p className="text-xs text-muted">5 суб-проектов · общий каркас</p>
        </div>
        <ModulesGrid />
      </section>
    </div>
  );
}
