/**
 * Regras de acesso derivadas do status da venda e da allowlist de produtos.
 * Conservadoras: na dúvida, não conceder. Módulo puro.
 */

/** Status que CONCEDEM acesso (venda paga). */
export const GRANT_STATUSES = new Set(["paid", "approved"]);
/** Status que REVOGAM acesso. */
export const REVOKE_STATUSES = new Set(["refunded", "chargedback"]);
/**
 * Demais status (waiting_payment, pending, processing, refused, authorized,
 * refund_requested, pending_refund…) não concedem e não alteram um acesso existente.
 */
export type AccessDecision = "grant" | "revoke" | "hold";

export function decideAccess(status: string): AccessDecision {
  const s = status.trim().toLowerCase();
  if (GRANT_STATUSES.has(s)) return "grant";
  if (REVOKE_STATUSES.has(s)) return "revoke";
  return "hold";
}

/** Eventos de webhook tratados nesta fase. */
export const HANDLED_EVENTS = new Set(["order_approved", "order_refunded", "chargeback"]);
export const REVOKING_EVENTS = new Set(["order_refunded", "chargeback"]);

/** Lista separada por vírgulas → IDs. Vazio = nenhum produto liberado. */
export function parseIdList(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedProduct(productId: string | null, allowed: string[]): boolean {
  return productId !== null && allowed.includes(productId);
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254 ? e : null;
}

/** Chave de deduplicação recomendada pela Kiwify. */
export function webhookDedupKey(payload: { order_id?: unknown; subscription_id?: unknown; webhook_event_type: string }): string {
  const trial = payload.webhook_event_type.startsWith("subscription_trial");
  const id = trial ? payload.subscription_id : payload.order_id;
  return `${String(id ?? "sem-id")}:${payload.webhook_event_type}`;
}

/** Mensagem de erro sem PII para guardar/logar. */
export function sanitizeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\d{11,}/g, "[número]")
    .slice(0, 300);
}
