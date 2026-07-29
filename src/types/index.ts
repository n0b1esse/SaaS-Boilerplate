/**
 * Глобальные типы Nexus Platform.
 *
 * ЗАЧЕМ этот файл нужен:
 * - единый источник правды для сущностей платформы (модули, навигация, сервисы);
 * - страницы и компоненты импортируют типы отсюда, а не дублируют интерфейсы.
 *
 * Поток данных:
 * константы в `src/lib/constants.ts` типизируются этими интерфейсами
 * → UI (Sidebar, Dashboard cards, Header statuses) получает строго типизированные props.
 */

/**
 * Идентификаторы пяти будущих суб-проектов (модулей) платформы.
 * Используем строковый union вместо enum — лучше tree-shaking и проще в JSON.
 */
export type ModuleId =
  | "ai-assistant"
  | "collaboration"
  | "analytics"
  | "cli-logs"
  | "settings";

/**
 * Статус готовности модуля на дашборде.
 * - planned   — архитектура описана, код ещё не начат
 * - scaffolding — каркас страницы уже есть
 * - active    — модуль частично или полностью работает
 */
export type ModuleStatus = "planned" | "scaffolding" | "active";

/**
 * Описание одного модульного суб-проекта для виджета на дашборде.
 * Данные текут: constants → ModulesGrid → ModuleCard → UI.
 */
export interface PlatformModule {
  /** Уникальный ключ модуля */
  readonly id: ModuleId;
  /** Человекочитаемое название (например, «AI RAG Assistant») */
  readonly title: string;
  /** Короткое описание ценности модуля для пользователя */
  readonly summary: string;
  /**
   * Краткое пояснение архитектуры (для обучения):
   * какие слои и технологии планируются внутри модуля.
   */
  readonly architecture: string;
  /** Маршрут App Router, куда ведёт карточка / пункт меню */
  readonly href: string;
  /** Имя иконки Lucide (резолвится в UI-слое) */
  readonly icon: ModuleIconName;
  /** Текущий статус готовности */
  readonly status: ModuleStatus;
  /** Акцентная метка для UI (например, «RAG · Vector DB») */
  readonly tag: string;
}

/**
 * Разрешённые имена иконок модулей.
 * Держим узкий union, чтобы нельзя было передать произвольную строку.
 */
export type ModuleIconName =
  | "bot"
  | "users"
  | "chart"
  | "terminal"
  | "settings";

/**
 * Пункт боковой навигации.
 * Sidebar читает массив NavItem[] и рендерит ссылки.
 */
export interface NavItem {
  readonly id: ModuleId | "dashboard";
  readonly label: string;
  readonly href: string;
  readonly icon: ModuleIconName | "layout";
  /** Короткий hint для title/aria */
  readonly description: string;
}

/**
 * Статус внешнего/инфраструктурного сервиса (БД, Redis, AI).
 * Header показывает индикаторы «живости» платформы.
 */
export type ServiceHealth = "online" | "degraded" | "offline" | "unknown";

/**
 * Описание одного сервиса инфраструктуры для статус-бара в шапке.
 */
export interface ServiceStatus {
  readonly id: "database" | "redis" | "ai";
  readonly label: string;
  readonly health: ServiceHealth;
  /** Пояснение для тултипа / aria-label */
  readonly detail: string;
}

/**
 * Заглушка профиля пользователя (до подключения Auth).
 * Позже заменим на данные из Clerk/Auth.js/сессии.
 */
export interface UserProfileStub {
  readonly name: string;
  readonly email: string;
  readonly role: "owner" | "admin" | "member";
  /** Инициалы для аватара-заглушки */
  readonly initials: string;
}

/**
 * Тема оформления приложения.
 * ThemeProvider хранит значение и синхронизирует class на <html>.
 */
export type ThemeMode = "light" | "dark";
