import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Leitura básica de saúde da integração (somente após autorização por papel).
 * Sem e-mails ou dados pessoais: só status, tipos, datas e erros sanitizados.
 */
export interface IntegrationHealth {
  activeEntitlements: number;
  eventsByStatus: Record<string, number>;
  recentEvents: { eventType: string; status: string; receivedAt: string; error: string | null; order: string }[];
  imports: { mode: string; status: string; startedAt: string; counts: Record<string, number> }[];
}

export async function loadIntegrationHealth(): Promise<IntegrationHealth | null> {
  const db = createSupabaseAdminClient();
  if (!db) return null;
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [active, events, recent, imports] = await Promise.all([
    db.from("purchase_entitlements").select("id", { count: "exact", head: true }).eq("access_state", "active"),
    db.from("webhook_events").select("status").gte("received_at", since),
    db.from("webhook_events").select("event_type, status, received_at, last_error, order_id").order("received_at", { ascending: false }).limit(15),
    db.from("import_runs").select("mode, status, started_at, counts").order("started_at", { ascending: false }).limit(5),
  ]);
  if (active.error || events.error || recent.error || imports.error) throw new Error("Falha ao ler a saúde da integração.");
  const eventsByStatus: Record<string, number> = {};
  for (const e of events.data ?? []) eventsByStatus[e.status] = (eventsByStatus[e.status] ?? 0) + 1;
  return {
    activeEntitlements: active.count ?? 0,
    eventsByStatus,
    recentEvents: (recent.data ?? []).map((e) => ({
      eventType: e.event_type,
      status: e.status,
      receivedAt: e.received_at,
      error: e.last_error,
      order: e.order_id ? `…${String(e.order_id).slice(-6)}` : "—",
    })),
    imports: (imports.data ?? []).map((r) => ({ mode: r.mode, status: r.status, startedAt: r.started_at, counts: r.counts ?? {} })),
  };
}
