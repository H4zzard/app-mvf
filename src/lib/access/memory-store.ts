/**
 * AccessStore em memória — SOMENTE para testes automatizados.
 * Reproduz as restrições relevantes do banco (dedup_key único, order_id único,
 * e-mail único por conta).
 */
import { randomUUID } from "node:crypto";
import type {
  AccessStore,
  EntitlementRecord,
  ImportCursor,
  ImportRunRecord,
  WebhookEventInput,
  WebhookEventStatus,
} from "../kiwify/types.ts";

interface StoredEvent extends WebhookEventInput {
  id: number;
  status: WebhookEventStatus;
  attempts: number;
  error: string | null;
}

export class MemoryAccessStore implements AccessStore {
  events: StoredEvent[] = [];
  entitlements = new Map<string, EntitlementRecord>();
  users = new Map<string, string>(); // email -> userId
  profiles = new Map<string, string>(); // userId -> email
  runs = new Map<string, ImportRunRecord & { counts: Record<string, number> }>();
  createdAccounts = 0;

  async recordWebhookEvent(e: WebhookEventInput) {
    const found = this.events.find((x) => x.dedupKey === e.dedupKey);
    if (found) {
      found.attempts++;
      return { id: found.id, isNew: false, status: found.status };
    }
    const row: StoredEvent = { ...e, id: this.events.length + 1, status: "received", attempts: 1, error: null };
    this.events.push(row);
    return { id: row.id, isNew: true, status: row.status };
  }
  async updateWebhookEvent(id: number, patch: { status: WebhookEventStatus; error?: string | null }) {
    const row = this.events.find((x) => x.id === id);
    if (row) Object.assign(row, { status: patch.status, error: patch.error ?? null });
  }
  async listReprocessableEvents(limit: number) {
    return this.events
      .filter((e) => e.status === "pending_verification" || e.status === "received")
      .slice(0, limit)
      .map((e) => ({ id: e.id, orderId: e.orderId ?? "", eventType: e.eventType }));
  }
  async getEntitlement(orderId: string) {
    const e = this.entitlements.get(orderId);
    return e ? { ...e } : null;
  }
  async upsertEntitlement(e: EntitlementRecord) {
    this.entitlements.set(e.orderId, { ...e });
  }
  async listActiveOrderIds() {
    return [...this.entitlements.values()].filter((e) => e.accessState === "active").map((e) => e.orderId);
  }
  async findUserIdByEmail(email: string) {
    return this.users.get(email) ?? null;
  }
  async createAuthUser(email: string) {
    if (this.users.has(email)) throw new Error("email_exists");
    const id = randomUUID();
    this.users.set(email, id);
    this.createdAccounts++;
    return id;
  }
  async ensureProfile(userId: string, email: string) {
    this.profiles.set(userId, email);
  }
  async createImportRun(r: Omit<ImportRunRecord, "id" | "status">) {
    const id = randomUUID();
    this.runs.set(id, { ...r, id, status: "running", counts: {} });
    return id;
  }
  async getImportRun(id: string) {
    return this.runs.get(id) ?? null;
  }
  async updateImportRun(
    id: string,
    patch: { cursor?: ImportCursor; counts?: Record<string, number>; status?: ImportRunRecord["status"]; error?: string },
  ) {
    const run = this.runs.get(id);
    if (!run) return;
    if (patch.cursor) run.cursor = patch.cursor;
    if (patch.counts) run.counts = { ...patch.counts };
    if (patch.status) run.status = patch.status;
  }

  activeUserIds(): Set<string> {
    return new Set(
      [...this.entitlements.values()].filter((e) => e.accessState === "active" && e.userId).map((e) => e.userId as string),
    );
  }
}
