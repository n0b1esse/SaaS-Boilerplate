/**
 * ModulesGrid — сетка виджетов всех суб-проектов на Home/Dashboard.
 *
 * Поток: PLATFORM_MODULES → map → ModuleCard.
 * Server Component: данных с клиента не нужно.
 */

import { ModuleCard } from "@/components/dashboard/module-card";
import { PLATFORM_MODULES } from "@/lib/constants";

/**
 * Адаптивная сетка карточек модулей.
 */
export function ModulesGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {PLATFORM_MODULES.map((module, index) => (
        <ModuleCard
          key={module.id}
          module={module}
          animationDelayMs={index * 70}
        />
      ))}
    </div>
  );
}
