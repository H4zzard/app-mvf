/**
 * AccessStore sobre Supabase com SERVICE ROLE.
 *
 * ⚠️ Só pode ser instanciado no servidor (Route Handlers, Server Components
 * de admin) e na CLI. Nunca importar em componentes de cliente. Recebe o
 * cliente pronto; a chave nunca passa por aqui.
 * Não testado contra um projeto Supabase real nesta entrega (ver docs/BANCO.md).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessStore,
  EntitlementRecord,
  ImportCursor,
  ImportRunRecord,
  WebhookEventInput,
  WebhookEventStatus,
} from "../kiwify/types.ts";

function fail(op: string, error: { message?: string; code?: string } | null): never {
  throw new Error(`${op}: ${error?.code ?? ""} ${error?.message ?? "erro"}`.trim());
}

export class SupabaseAccessStore implements AccessStore {
  private readonly db: SupabaseClient;
  constructor(serviceClient: SupabaseClient) {
    this.db = serviceClient;
  }

  async recordWebhookEvent(e: WebhookEventInput) {
    const inserted = await this.db
      .from("webhook_events")
      .upsert(
        {
          dedup_key: e.dedupKey,
          event_type: e.eventType,
          order_id: e.orderId,
          order_status: e.orderStatus,
          body_sha256: e.bodySha256,
          attempts: 1,
        },
        { onConflict: "dedup_key", ignoreDuplicates: true },
      )
      .select("id, status");
    if (inserted.error) fail("record_webhook_event", inserted.error);
    if (inserted.data && inserted.data.length > 0) {
      return { id: inserted.data[0].id as number, isNew: true, status: inserted.data[0].status as WebhookEventStatus };
    }
    const existing = await this.db.from("webhook_events").select("id, status, attempts").eq("dedup_key", e.dedupKey).single();
    if (existing.error) fail("read_webhook_event", existing.error);
    await this.db
      .from("webhook_events")
      .update({ attempts: (existing.data.attempts as number) + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.data.id);
    return { id: existing.data.id as number, isNew: false, status: existing.data.status as WebhookEventStatus };
  }

  async updateWebhookEvent(id: number, patch: { status: WebhookEventStatus; error?: string | null }) {
    const now = new Date().toISOString();
    const { error } = await this.db
      .from("webhook_events")
      .update({
        status: patch.status,
        last_error: patch.error ?? null,
        processed_at: patch.status === "processed" || patch.status === "ignored" ? now : null,
        updated_at: now,
      })
      .eq("id", id);
    if (error) fail("update_webhook_event", error);
  }

  async listReprocessableEvents(limit: number) {
    const { data, error } = await this.db
      .from("webhook_events")
      .select("id, order_id, event_type")
      .in("status", ["received", "pending_verification"])
      .not("order_id", "is", null)
      .order("received_at", { ascending: true })
      .limit(limit);
    if (error) fail("list_reprocessable", error);
    return (data ?? []).map((r) => ({ id: r.id as number, orderId: r.order_id as string, eventType: r.event_type as string }));
  }

  async getEntitlement(orderId: string): Promise<EntitlementRecord | null> {
    const { data, error } = await this.db.from("purchase_entitlements").select("*").eq("order_id", orderId).maybeSingle();
    if (error) fail("get_entitlement", error);
    if (!data) return null;
    return {
      orderId: data.order_id,
      productId: data.product_id,
      customerEmail: data.customer_email,
      userId: data.user_id,
      kiwifyStatus: data.kiwify_status,
      accessState: data.access_state,
      source: data.source,
      kiwifyUpdatedAt: data.kiwify_updated_at,
      revokedReason: data.revoked_reason,
    };
  }

  async upsertEntitlement(e: EntitlementRecord) {
    const now = new Date().toISOString();
    const { error } = await this.db.from("purchase_entitlements").upsert(
      {
        order_id: e.orderId,
        product_id: e.productId,
        customer_email: e.customerEmail,
        user_id: e.userId,
        kiwify_status: e.kiwifyStatus,
        access_state: e.accessState,
        source: e.source,
        kiwify_updated_at: e.kiwifyUpdatedAt,
        revoked_reason: e.revokedReason,
        granted_at: e.accessState === "active" ? now : undefined,
        revoked_at: e.accessState === "revoked" ? now : null,
        last_verified_at: now,
        updated_at: now,
      },
      { onConflict: "order_id" },
    );
    if (error) fail("upsert_entitlement", error);
  }

  async listActiveOrderIds() {
    const { data, error } = await this.db.from("purchase_entitlements").select("order_id").eq("access_state", "active");
    if (error) fail("list_active", error);
    return (data ?? []).map((r) => r.order_id as string);
  }

  async findUserIdByEmail(email: string) {
    const { data, error } = await this.db.rpc("admin_find_user_id_by_email", { p_email: email });
    if (error) fail("find_user", error);
    return (data as string | null) ?? null;
  }

  async createAuthUser(email: string) {
    // createUser NÃO envia e-mail; o e-mail é tido como confirmado pela compra verificada.
    const { data, error } = await this.db.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { provisioned_by: "kiwify" },
    });
    if (error) {
      if (error.code === "email_exists") {
        const id = await this.findUserIdByEmail(email);
        if (id) return id;
      }
      fail("create_auth_user", error);
    }
    return data.user.id;
  }

  async ensureProfile(userId: string, email: string) {
    const { error } = await this.db
      .from("profiles")
      .upsert({ user_id: userId, email }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) fail("ensure_profile", error);
  }

  async createImportRun(r: Omit<ImportRunRecord, "id" | "status">) {
    const { data, error } = await this.db
      .from("import_runs")
      .insert({ mode: r.mode, range_start: r.rangeStart, range_end: r.rangeEnd, cursor: r.cursor })
      .select("id")
      .single();
    if (error) fail("create_import_run", error);
    return data.id as string;
  }

  async getImportRun(id: string): Promise<ImportRunRecord | null> {
    const { data, error } = await this.db.from("import_runs").select("*").eq("id", id).maybeSingle();
    if (error) fail("get_import_run", error);
    if (!data) return null;
    return {
      id: data.id,
      mode: data.mode,
      rangeStart: data.range_start,
      rangeEnd: data.range_end,
      cursor: data.cursor as ImportCursor,
      status: data.status,
    };
  }

  async updateImportRun(
    id: string,
    patch: { cursor?: ImportCursor; counts?: Record<string, number>; status?: ImportRunRecord["status"]; error?: string },
  ) {
    const { error } = await this.db
      .from("import_runs")
      .update({
        ...(patch.cursor ? { cursor: patch.cursor } : {}),
        ...(patch.counts ? { counts: patch.counts } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.error ? { last_error: patch.error } : {}),
        ...(patch.status && patch.status !== "running" ? { finished_at: new Date().toISOString() } : {}),
      })
      .eq("id", id);
    if (error) fail("update_import_run", error);
  }
}
