/**
 * Заглушка модуля FinTech Analytics (`/analytics`).
 *
 * Целевой поток данных (будущее):
 * Event ingest → очередь → SQL/OLAP агрегации → API метрик → charts.
 */

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { getModuleById } from "@/lib/modules";

export const metadata = {
  title: "FinTech Analytics",
};

export default function AnalyticsPage() {
  return <ModulePlaceholder module={getModuleById("analytics")} />;
}
