/**
 * UserProfileMenu — заглушка профиля пользователя в Header.
 *
 * ЗАЧЕМ сейчас:
 * - визуально завершает шапку до подключения Auth;
 * - фиксирует контракт данных (UserProfileStub), который позже заполнит сессия.
 *
 * Поток позже: Auth session → UserProfileStub-совместимый объект → этот UI.
 */

import { USER_STUB } from "@/lib/constants";

/**
 * Компактный блок аватара + имени/роли.
 */
export function UserProfileMenu() {
  const user = USER_STUB;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/60 px-2.5 py-1.5"
      title={`${user.email} · ${user.role}`}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-xs font-semibold text-accent"
        aria-hidden
      >
        {user.initials}
      </div>
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm font-medium text-foreground">
          {user.name}
        </p>
        <p className="truncate text-[11px] capitalize text-muted">{user.role}</p>
      </div>
    </div>
  );
}
