/**
 * Заглушка модуля SaaS Settings / Billing (`/settings`).
 *
 * Целевой поток данных (будущее):
 * Settings UI → Server Actions → Postgres + Stripe webhooks.
 */

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { getModuleById } from "@/lib/modules";

export const metadata = {
  title: "Settings / Billing",
};

export default function SettingsPage() {
  return <ModulePlaceholder module={getModuleById("settings")} />;
}
