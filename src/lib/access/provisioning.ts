/**
 * Concessão e revogação de acesso a partir de vendas VERIFICADAS.
 *
 * - Conceder exige: produto na allowlist + status pago na consulta atual à API.
 * - Uma conta Auth por e-mail de compra; vários pedidos não duplicam conta.
 * - Nunca vincula por nome ou e-mail “parecido”.
 * - Pedido revogado por reembolso/chargeback não é reativado automaticamente.
 * Módulo puro (porta AccessStore injetada).
 */
import type { AccessStore, EntitlementRecord, EntitlementSource, KiwifySale } from "../kiwify/types.ts";
import { decideAccess, isAllowedProduct } from "../kiwify/rules.ts";
import { parseKiwifyTime } from "../kiwify/api.ts";

export type ReconcileOutcome =
  | "granted"
  | "already_active"
  | "revoked"
  | "revoke_noop"
  | "held"
  | "ignored_product"
  | "stale"
  | "needs_review";

export interface ReconcileResult {
  outcome: ReconcileOutcome;
  /** Motivo sem PII. */
  reason?: string;
  createdAccount?: boolean;
}

export async function reconcileSale(
  sale: KiwifySale,
  opts: { store: AccessStore; allowedProductIds: string[]; source: EntitlementSource },
): Promise<ReconcileResult> {
  const { store, allowedProductIds, source } = opts;
  if (!isAllowedProduct(sale.productId, allowedProductIds)) return { outcome: "ignored_product" };

  const existing = await store.getEntitlement(sale.id);
  const incoming = parseKiwifyTime(sale.updatedAt);
  const stored = parseKiwifyTime(existing?.kiwifyUpdatedAt ?? null);
  if (incoming !== null && stored !== null && incoming < stored) return { outcome: "stale" };

  const decision = decideAccess(sale.status);

  if (decision === "revoke") {
    if (!existing) return { outcome: "revoke_noop" };
    await store.upsertEntitlement({
      ...existing,
      kiwifyStatus: sale.status,
      accessState: "revoked",
      revokedReason: sale.status,
      kiwifyUpdatedAt: sale.updatedAt ?? existing.kiwifyUpdatedAt,
      source,
    });
    return { outcome: "revoked" };
  }

  if (decision === "hold") {
    if (existing) {
      await store.upsertEntitlement({ ...existing, kiwifyStatus: sale.status, kiwifyUpdatedAt: sale.updatedAt ?? existing.kiwifyUpdatedAt });
    }
    return { outcome: "held", reason: `status_${sale.status}` };
  }

  // decision === "grant"
  if (!sale.customerEmail) return { outcome: "needs_review", reason: "sale_without_email" };
  if (existing?.accessState === "revoked" && (existing.revokedReason === "refunded" || existing.revokedReason === "chargedback" || existing.revokedReason === "order_refunded" || existing.revokedReason === "chargeback")) {
    return { outcome: "needs_review", reason: "approved_after_revocation" };
  }
  if (existing && existing.customerEmail !== sale.customerEmail) {
    // E-mail da compra mudou: não religar automaticamente a outra identidade.
    return { outcome: "needs_review", reason: "email_changed_on_order" };
  }
  if (existing?.accessState === "active" && existing.userId) {
    await store.upsertEntitlement({ ...existing, kiwifyStatus: sale.status, kiwifyUpdatedAt: sale.updatedAt ?? existing.kiwifyUpdatedAt });
    return { outcome: "already_active" };
  }

  let userId = existing?.userId ?? (await store.findUserIdByEmail(sale.customerEmail));
  let createdAccount = false;
  if (!userId) {
    userId = await store.createAuthUser(sale.customerEmail);
    createdAccount = true;
  }
  await store.ensureProfile(userId, sale.customerEmail);

  const record: EntitlementRecord = {
    orderId: sale.id,
    productId: sale.productId as string,
    customerEmail: sale.customerEmail,
    userId,
    kiwifyStatus: sale.status,
    accessState: "active",
    source,
    kiwifyUpdatedAt: sale.updatedAt,
    revokedReason: null,
  };
  await store.upsertEntitlement(record);
  return { outcome: "granted", createdAccount };
}

/** Revogação direta por evento assinado (reembolso/chargeback), sem depender da API. */
export async function revokeByOrderId(
  orderId: string,
  reason: string,
  opts: { store: AccessStore; source: EntitlementSource },
): Promise<ReconcileResult> {
  const existing = await opts.store.getEntitlement(orderId);
  if (!existing) return { outcome: "revoke_noop" };
  if (existing.accessState === "revoked") return { outcome: "revoked", reason: "already_revoked" };
  await opts.store.upsertEntitlement({ ...existing, accessState: "revoked", revokedReason: reason, source: opts.source });
  return { outcome: "revoked" };
}
