/**
 * AppShell — каркас всех страниц платформы.
 *
 * ЗАЧЕМ:
 * - Sidebar + Header + content area в одном месте;
 * - страницы модулей не дублируют layout-разметку.
 *
 * Поток:
 * root layout → ThemeProvider → AppShell → {children} страницы.
 *
 * Client Component: управляет состоянием мобильного drawer сайдбара.
 */

"use client";

import { useState, type ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  readonly children: ReactNode;
  /** Заголовок для Header */
  readonly title?: string;
}

/**
 * Основной layout-shell приложения.
 */
export function AppShell({ children, title }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      {/* Атмосферный фон: glow + сетка — не плоский canvas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-nexus-glow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-nexus-grid bg-grid opacity-[0.35] dark:opacity-[0.2]"
      />

      {/*
        Desktop sidebar: z-30 выше основного контента.
        ЗАЧЕМ: колонка main с w-full + md:pl-64 визуально отступает,
        но сам блок всё равно лежит поверх левых 16rem и перехватывает клики.
        Без более высокого z-index Link'и в Sidebar «не работают».
      */}
      <div className="relative z-30 hidden md:block">
        <Sidebar className="fixed inset-y-0 left-0 z-30" />
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          aria-label="Закрыть меню"
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <Sidebar
          className={cn(
            "absolute inset-y-0 left-0 transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col md:pl-64">
        <Header title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
