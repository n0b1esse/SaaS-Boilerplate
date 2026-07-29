/**
 * Заглушка модуля Real-time Workspace (`/collaboration`).
 *
 * Целевой поток данных (будущее):
 * Client CRDT → WebSocket → Redis Pub/Sub → Postgres snapshots.
 */

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { getModuleById } from "@/lib/modules";

export const metadata = {
  title: "Real-time Workspace",
};

export default function CollaborationPage() {
  return <ModulePlaceholder module={getModuleById("collaboration")} />;
}
