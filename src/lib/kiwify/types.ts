/**
 * Tipos da integração Kiwify e da camada de acesso. Somente campos
 * DOCUMENTADOS na API pública são usados (ver docs/KIWIFY.md).
 */

/** Venda normalizada a partir de GET /sales e GET /sales/{id}. */
export interface KiwifySale {
  id: string;
  status: string;
  productId: string | null;
  /** Minúsculo e aparado; `null` se ausente. Nunca logar. */
  customerEmail: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type EntitlementState = "active" | "revoked" | "none";
export type EntitlementSource = "webhook" | "import" | "reconcile" | "manual";

export interface EntitlementRecord {
  orderId: string;
  productId: string;
  customerEmail: string;
  userId: string | null;
  kiwifyStatus: string;
  accessState: EntitlementState;
  source: EntitlementSource;
  kiwifyUpdatedAt: string | null;
  revokedReason: string | null;
}

export type WebhookEventStatus = "received" | "processed" | "ignored" | "pending_verification" | "failed";

export interface WebhookEventInput {
  dedupKey: string;
  eventType: string;
  orderId: string | null;
  orderStatus: string | null;
  bodySha256: string;
}

export interface ImportRunRecord {
  id: string;
  mode: "dry_run" | "execute";
  rangeStart: string;
  rangeEnd: string;
  cursor: ImportCursor;
  status: "running" | "completed" | "failed";
}

export interface ImportCursor {
  productIndex: number;
  windowIndex: number;
  pageNumber: number;
}

/**
 * Porta de persistência usada pelo provisionamento, webhook e importador.
 * Implementações: SupabaseAccessStore (service role, só servidor/CLI) e
 * MemoryAccessStore (testes).
 */
export interface AccessStore {
  recordWebhookEvent(e: WebhookEventInput): Promise<{ id: number; isNew: boolean; status: WebhookEventStatus }>;
  updateWebhookEvent(id: number, patch: { status: WebhookEventStatus; error?: string | null }): Promise<void>;
  listReprocessableEvents(limit: number): Promise<{ id: number; orderId: string; eventType: string }[]>;
  getEntitlement(orderId: string): Promise<EntitlementRecord | null>;
  upsertEntitlement(e: EntitlementRecord): Promise<void>;
  listActiveOrderIds(): Promise<string[]>;
  findUserIdByEmail(email: string): Promise<string | null>;
  /** Cria a identidade Auth SEM enviar e-mail (e-mail confirmado pela compra). */
  createAuthUser(email: string): Promise<string>;
  ensureProfile(userId: string, email: string): Promise<void>;
  createImportRun(r: Omit<ImportRunRecord, "id" | "status">): Promise<string>;
  getImportRun(id: string): Promise<ImportRunRecord | null>;
  updateImportRun(
    id: string,
    patch: { cursor?: ImportCursor; counts?: Record<string, number>; status?: ImportRunRecord["status"]; error?: string },
  ): Promise<void>;
}
