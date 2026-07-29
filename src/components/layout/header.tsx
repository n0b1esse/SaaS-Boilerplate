/**
 * Header — верхняя панель приложения.
 *
 * Состав (слева → направо):
 * 1) кнопка mobile-меню (опционально)
 * 2) заголовок текущего контекста
 * 3) статусы сервисов (БД / Redis / AI)
 * 4) переключатель темы
 * 5) профиль-заглушка
 *
 * Поток: AppShell передаёт title/onMenuClick → Header рендерит слоты.
 */

"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ServiceStatusBar } from "@/components/layout/service-status-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserProfileMenu } from "@/components/layout/user-profile-menu";

interface HeaderProps {
  /** Заголовок области контента */
  readonly title?: string;
  /** Открыть мобильный сайдбар */
  readonly onMenuClick?: () => void;
}

/**
 * Шапка платформы.
 */
export function Header({
  title = "Nexus Platform",
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/75 px-4 backdrop-blur-md md:px-6">
      {onMenuClick ? (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Открыть меню навигации"
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold tracking-tight text-foreground md:text-base">
          {title}
        </h1>
        <p className="hidden text-xs text-muted sm:block">
          Модульная SaaS-платформа · портфолио-каркас
        </p>
      </div>

      <ServiceStatusBar />
      <ThemeToggle />
      <UserProfileMenu />
    </header>
  );
}
