import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { readConfig } from "@/lib/config/env";

/**
 * Cliente Supabase com a sessão da usuária (cookies), para Server Components,
 * Server Actions e Route Handlers. Um cliente NOVO por requisição.
 * Usa a chave publicável: todas as consultas passam pela RLS.
 */
export async function createSupabaseServerClient() {
  const config = readConfig();
  if (!config.supabase) throw new Error("Supabase não configurado.");
  const cookieStore = await cookies();
  return createServerClient(config.supabase.url, config.supabase.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components não podem gravar cookies; o Proxy renova a sessão.
        }
      },
    },
  });
}
