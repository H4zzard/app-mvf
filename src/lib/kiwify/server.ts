import "server-only";
import { readConfig } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SupabaseAccessStore } from "@/lib/access/supabase-store";
import { KiwifyApi } from "@/lib/kiwify/api";

/** Instância única por processo: reaproveita o token OAuth e o limitador. */
let apiSingleton: { key: string; api: KiwifyApi } | null = null;

export function getKiwifyApi(): KiwifyApi | null {
  const creds = readConfig().kiwify.api;
  if (!creds) return null;
  const key = `${creds.accountId}:${creds.clientId}`;
  if (!apiSingleton || apiSingleton.key !== key) apiSingleton = { key, api: new KiwifyApi(creds) };
  return apiSingleton.api;
}

export function getAccessStore(): SupabaseAccessStore | null {
  const admin = createSupabaseAdminClient();
  return admin ? new SupabaseAccessStore(admin) : null;
}
