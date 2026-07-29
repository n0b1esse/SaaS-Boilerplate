/**
 * Barrel-экспорт UI-примитивов.
 *
 * ЗАЧЕМ: удобные импорты вида `import { Button, Card } from "@/components/ui"`.
 * Страницы модулей могут подключать набор компонентов одной строкой.
 */

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card";
export { Input, type InputProps } from "./input";
export {
  Badge,
  toneFromModuleStatus,
  toneFromServiceHealth,
  MODULE_STATUS_LABEL,
  type BadgeProps,
  type BadgeTone,
} from "./badge";
