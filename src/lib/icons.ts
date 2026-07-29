/**
 * Маппинг имён иконок модулей → компоненты Lucide.
 *
 * ЗАЧЕМ вынесено отдельно:
 * - константы/типы хранят строковые ключи (сериализуемо);
 * - React-компоненты иконок живут только в UI-слое.
 *
 * Поток:
 * PlatformModule.icon (string union) → resolveModuleIcon() → Lucide component → JSX.
 */

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BarChart3,
  LayoutDashboard,
  Settings2,
  Terminal,
  Users,
} from "lucide-react";

import type { ModuleIconName, NavItem } from "@/types";

/**
 * Возвращает React-компонент иконки Lucide по каноническому имени.
 *
 * @param name — ключ из ModuleIconName или "layout" для Dashboard
 */
export function resolveNavIcon(
  name: NavItem["icon"] | ModuleIconName,
): LucideIcon {
  switch (name) {
    case "bot":
      return Bot;
    case "users":
      return Users;
    case "chart":
      return BarChart3;
    case "terminal":
      return Terminal;
    case "settings":
      return Settings2;
    case "layout":
      return LayoutDashboard;
    default: {
      /**
       * Исчерпывающая проверка: если TypeScript когда-нибудь расширит union,
       * эта ветка заставит нас обработать новый кейс на этапе компиляции.
       */
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
