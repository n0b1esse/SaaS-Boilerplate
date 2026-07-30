/**
 * Sidebar — главная боковая навигация Nexus Platform.
 *
 * ЗАЧЕМ:
 * - единая точка входа во все модули (Dashboard + 5 суб-проектов);
 * - логотип ведёт на `/` (главная витрина);
 * - подсвечивает активный маршрут через usePathname.
 *
 * Поток данных:
 * NAV_ITEMS (constants) → map → Link
 * pathname из next/navigation → сравнение с href → active styles.
 *
 * Client Component: нужен usePathname для подсветки текущего раздела.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hexagon } from "lucide-react";

import { resolveNavIcon } from "@/lib/icons";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Управление мобильным drawer (опционально) */
  readonly className?: string;
  /** Колбэк после клика по ссылке — полезен для закрытия mobile-меню */
  readonly onNavigate?: () => void;
}

/**
 * Боковая панель с брендом и навигацией по модулям.
 */
export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-border",
        "bg-surface/70 backdrop-blur-md",
        className,
      )}
    >
      {/*
        Бренд = ссылка на главную (`/`).
        ЗАЧЕМ: из любого модуля один клик возвращает на витрину модулей;
        aria-label дублирует смысл для screen reader.
      */}
      <Link
        href="/"
        onClick={onNavigate}
        aria-label="Nexus Platform — на главную"
        className={cn(
          "flex items-center gap-3 border-b border-border px-5 py-5",
          "transition-colors hover:bg-surface-elevated/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            "bg-accent text-accent-foreground shadow-sm",
            "animate-fade-rise",
          )}
          aria-hidden
        >
          <Hexagon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            Nexus Platform
          </p>
          <p className="truncate text-xs text-muted">Modular SaaS OS</p>
        </div>
      </Link>

      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
        aria-label="Основная навигация"
      >
        {NAV_ITEMS.map((item, index) => {
          const Icon = resolveNavIcon(item.icon);
          /**
           * Активность: точное совпадение или вложенный путь модуля
           * (например /analytics/reports всё ещё подсветит Analytics).
           */
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.description}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                "animate-fade-rise",
                isActive
                  ? "bg-accent/12 text-foreground shadow-sm ring-1 ring-accent/20"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground",
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-accent"
                    : "text-muted group-hover:text-foreground",
                )}
              />
              <span className="truncate font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-[11px] leading-relaxed text-muted">
          Учебный портфолио-каркас. Модули подключаются постепенно без
          переписывания shell.
        </p>
      </div>
    </aside>
  );
}
