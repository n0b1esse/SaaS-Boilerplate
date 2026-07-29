/**
 * Root Layout — корневой каркас Next.js App Router.
 *
 * ЗАЧЕМ:
 * - подключает шрифты, глобальные стили и ThemeProvider;
 * - оборачивает все маршруты в AppShell (Sidebar + Header).
 *
 * Поток рендера:
 * layout.tsx (Server) → ThemeProvider (Client) → AppShell (Client) → page (Server/Client).
 */

import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/layout/theme-provider";

import "./globals.css";

/**
 * Локальные шрифты Geist (идут с шаблона Next.js).
 * Избегаем дефолтных Inter/Arial — выразительная типографика из коробки.
 */
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

/**
 * SEO/вкладка браузера: бренд Nexus должен читаться сразу.
 */
export const metadata: Metadata = {
  title: {
    default: "Nexus Platform",
    template: "%s · Nexus Platform",
  },
  description:
    "Модульная SaaS-платформа: AI RAG, Real-time Workspace, FinTech Analytics, Dev CLI и Billing.",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

/**
 * Корневой layout приложения.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
