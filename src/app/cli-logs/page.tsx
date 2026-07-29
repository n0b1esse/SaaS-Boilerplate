/**
 * Заглушка модуля Dev CLI / Logs (`/cli-logs`).
 *
 * Целевой поток данных (будущее):
 * App/Workers → structured logs → коллектор → поиск/стрим в UI + CLI.
 */

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { getModuleById } from "@/lib/modules";

export const metadata = {
  title: "Dev CLI / Logs",
};

export default function CliLogsPage() {
  return <ModulePlaceholder module={getModuleById("cli-logs")} />;
}
