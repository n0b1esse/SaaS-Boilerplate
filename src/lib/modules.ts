/**
 * Хелперы для работы с модулями платформы.
 *
 * ЗАЧЕМ: страницы маршрутов не должны искать модуль вручную через find —
 * одна функция с понятной ошибкой при опечатке в id.
 */

import { PLATFORM_MODULES } from "@/lib/constants";
import type { ModuleId, PlatformModule } from "@/types";

/**
 * Возвращает описание модуля по id.
 *
 * @throws если id отсутствует в PLATFORM_MODULES — значит рассинхрон routes/constants
 */
export function getModuleById(id: ModuleId): PlatformModule {
  /**
   * Не называем переменную `module`: Next.js ESLint запрещает это имя
   * (конфликт с CommonJS module).
   */
  const platformModule = PLATFORM_MODULES.find((item) => item.id === id);
  if (!platformModule) {
    throw new Error(`Модуль с id "${id}" не найден в PLATFORM_MODULES`);
  }
  return platformModule;
}
