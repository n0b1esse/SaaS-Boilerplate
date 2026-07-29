/**
 * Константы и «заглушечные» данные Nexus Platform.
 *
 * ЗАЧЕМ этот файл нужен:
 * - держит навигацию, модули дашборда и статусы сервисов отдельно от JSX;
 * - когда появится БД/API, UI сможет читать те же типы, но из другого источника.
 *
 * Поток данных сейчас (без бэкенда):
 * constants.ts → Server/Client Components → рендер Sidebar / Header / Dashboard.
 *
 * Поток данных позже (целевая архитектура):
 * Postgres/Redis/AI health checks → API Route → те же типы → UI.
 */

import type {
  NavItem,
  PlatformModule,
  ServiceStatus,
  UserProfileStub,
} from "@/types";

/**
 * Пункты боковой навигации: Dashboard + 5 модулей платформы.
 * Порядок массива = порядок в Sidebar.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "layout",
    description: "Обзор всех модулей Nexus Platform",
  },
  {
    id: "ai-assistant",
    label: "AI RAG Assistant",
    href: "/ai-assistant",
    icon: "bot",
    description: "Поиск по знаниям с RAG и векторной БД",
  },
  {
    id: "collaboration",
    label: "Real-time Workspace",
    href: "/collaboration",
    icon: "users",
    description: "Совместная работа в реальном времени",
  },
  {
    id: "analytics",
    label: "FinTech Analytics",
    href: "/analytics",
    icon: "chart",
    description: "Аналитика и финансовые метрики",
  },
  {
    id: "cli-logs",
    label: "Dev CLI / Logs",
    href: "/cli-logs",
    icon: "terminal",
    description: "Логи, CLI-утилиты и диагностика",
  },
  {
    id: "settings",
    label: "Settings / Billing",
    href: "/settings",
    icon: "settings",
    description: "Настройки SaaS и биллинг",
  },
] as const;

/**
 * Карточки суб-проектов для главной витрины дашборда.
 * Каждая запись объясняет архитектурный замысел модуля (для обучения).
 */
export const PLATFORM_MODULES: readonly PlatformModule[] = [
  {
    id: "ai-assistant",
    title: "AI RAG Assistant",
    summary:
      "Чат-ассистент с Retrieval-Augmented Generation: отвечает по вашим документам, а не только по общим знаниям модели.",
    architecture:
      "UI чата → POST /api/rag → extract+chunk → embeddings → cosine top-k → LLM. MVP хранит векторы в клиентской session; дальше — pgvector.",
    href: "/ai-assistant",
    icon: "bot",
    status: "active",
    tag: "RAG · Embeddings · Vector DB",
  },
  {
    id: "collaboration",
    title: "Real-time Workspace",
    summary:
      "Рабочее пространство для совместного редактирования и присутствия пользователей в реальном времени.",
    architecture:
      "Client CRDT/Yjs → WebSocket/Realtime канал → Redis Pub/Sub → Postgres snapshots. Presence и курсоры идут отдельным лёгким потоком.",
    href: "/collaboration",
    icon: "users",
    status: "planned",
    tag: "WebSocket · CRDT · Presence",
  },
  {
    id: "analytics",
    title: "FinTech Analytics",
    summary:
      "Дашборды метрик, транзакций и когорт: от сырых событий до агрегатов и графиков.",
    architecture:
      "Event ingest → очередь → агрегации (SQL/OLAP) → API метрик → chart UI. Кэш горячих запросов в Redis.",
    href: "/analytics",
    icon: "chart",
    status: "planned",
    tag: "Events · Aggregations · Charts",
  },
  {
    id: "cli-logs",
    title: "Dev CLI / Logs",
    summary:
      "Единая точка для логов сервисов, команд диагностики и developer experience.",
    architecture:
      "App/Workers → structured logs → коллектор → поиск/стрим в UI. CLI вызывает те же внутренние API, что и веб-панель.",
    href: "/cli-logs",
    icon: "terminal",
    status: "planned",
    tag: "Structured Logs · DX · CLI",
  },
  {
    id: "settings",
    title: "SaaS Settings / Billing",
    summary:
      "Управление организацией, тарифами, ключами интеграций и статусом подписки.",
    architecture:
      "Settings UI → Server Actions → Postgres (org/billing) + Stripe webhooks. Секреты только на сервере, никогда в клиентском бандле.",
    href: "/settings",
    icon: "settings",
    status: "scaffolding",
    tag: "Billing · Org · Integrations",
  },
] as const;

/**
 * Заглушки статусов инфраструктуры.
 * Позже заменим на реальные health-check эндпоинты.
 */
export const SERVICE_STATUSES: readonly ServiceStatus[] = [
  {
    id: "database",
    label: "БД",
    health: "unknown",
    detail: "Postgres ещё не подключён — статус-заглушка",
  },
  {
    id: "redis",
    label: "Redis",
    health: "unknown",
    detail: "Redis ещё не подключён — статус-заглушка",
  },
  {
    id: "ai",
    label: "AI",
    health: "unknown",
    detail: "AI Gateway / LLM ещё не подключены — статус-заглушка",
  },
] as const;

/**
 * Профиль-заглушка до внедрения аутентификации.
 */
export const USER_STUB: UserProfileStub = {
  name: "Нурлан Сатымбаев",
  email: "owner@nexus.local",
  role: "owner",
  initials: "НС",
};
