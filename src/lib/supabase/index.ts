/**
 * Barrel-экспорт клиентов Supabase.
 *
 * ЗАЧЕМ: удобные импорты
 *   import { createSupabaseBrowserClient } from "@/lib/supabase/client"
 *   import { createSupabaseServerClient } from "@/lib/supabase/server"
 * и проверка credentials через env-хелпер.
 */

export { createSupabaseBrowserClient } from "@/lib/supabase/client";
export { createSupabaseServerClient } from "@/lib/supabase/server";
export {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasSupabaseCredentials,
} from "@/lib/supabase/env";
