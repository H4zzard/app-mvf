import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readConfig } from "@/lib/config/env";

/**
 * Cliente com SERVICE ROLE (ignora RLS). Uso restrito ao servidor, em
 * operações administrativas já autorizadas (webhook assinado, admin com papel
 * verificado). Nunca exportar para o cliente; a chave não é NEXT_PUBLIC.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const config = readConfig();
  if (!config.supabase || !config.serviceRoleKey) return null;
  return createClient(config.supabase.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
