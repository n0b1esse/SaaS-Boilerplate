/**
 * Маршрут `/dashboard` — зеркало обзора модулей.
 *
 * ЗАЧЕМ отдельный путь: пункт Sidebar «Dashboard» ведёт сюда,
 * а `/` остаётся каноническим home (можно позже сделать redirect).
 */

import { ModulesGrid } from "@/components/dashboard/modules-grid";

export const metadata = {
  title: "Dashboard",
};

/**
 * Страница Dashboard.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="animate-fade-rise space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="max-w-2xl text-sm text-muted">
          Обзор готовности модулей и их архитектурных контуров. Отсюда удобно
          переходить в суб-проект и наращивать функциональность.
        </p>
      </section>
      <ModulesGrid />
    </div>
  );
}
