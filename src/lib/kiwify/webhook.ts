/**
 * Processamento do webhook da Kiwify, independente do Next (testável).
 *
 * Ordem: assinatura → validação mínima → registro durável deduplicado →
 * processamento. Só responde 2xx depois do registro durável. Erro transitório
 * na confirmação de uma APROVAÇÃO devolve 503 para a Kiwify reenviar; o evento
 * fica reprocessável pela CLI (`npm run kiwify -- reconcile`).
 *
 * Usa apenas campos documentados do corpo: order_id, order_status,
 * webhook_event_type (e subscription_id para eventos de trial). Produto e
 * e-mail vêm da consulta GET /sales/{id}, nunca do corpo do webhook.
 */
import { createHash } from "node:crypto";
import { verifyKiwifySignature } from "./signature.ts";
import { HANDLED_EVENTS, REVOKING_EVENTS, sanitizeError, webhookDedupKey } from "./rules.ts";
import { KiwifyApiError } from "./api.ts";
import type { AccessStore, KiwifySale } from "./types.ts";
import { reconcileSale, revokeByOrderId, type ReconcileResult } from "../access/provisioning.ts";

export interface SaleFetcher {
  getSale(orderId: string): Promise<KiwifySale>;
}

export interface WebhookDeps {
  /** Tokens aceitos (atual e, durante rotação, o anterior). */
  tokens: string[];
  allowedProductIds: string[];
  store: AccessStore;
  /** `null` quando as credenciais da API não estão configuradas. */
  api: SaleFetcher | null;
}

export interface WebhookResponse {
  status: number;
  body: { ok: boolean; result: string };
}

const ORDER_ID = /^[A-Za-z0-9_-]{1,100}$/;

const reply = (status: number, result: string): WebhookResponse => ({ status, body: { ok: status < 300, result } });

export async function handleKiwifyWebhook(
  rawBody: Uint8Array,
  signature: string | null,
  deps: WebhookDeps,
): Promise<WebhookResponse> {
  if (deps.tokens.filter(Boolean).length === 0) return reply(503, "webhook_not_configured");
  if (!verifyKiwifySignature(rawBody, signature, deps.tokens)) return reply(401, "invalid_signature");

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return reply(400, "invalid_json");
  }
  const eventType = payload?.webhook_event_type;
  const orderId = payload?.order_id;
  if (typeof eventType !== "string" || !/^[a-z_]{1,60}$/.test(eventType)) return reply(400, "invalid_event_type");
  if (orderId !== undefined && (typeof orderId !== "string" || !ORDER_ID.test(orderId))) return reply(400, "invalid_order_id");

  const event = await deps.store.recordWebhookEvent({
    dedupKey: webhookDedupKey({ ...payload, webhook_event_type: eventType }),
    eventType,
    orderId: typeof orderId === "string" ? orderId : null,
    orderStatus: typeof payload.order_status === "string" ? payload.order_status.slice(0, 40) : null,
    bodySha256: createHash("sha256").update(rawBody).digest("hex"),
  });

  if (!event.isNew && (event.status === "processed" || event.status === "ignored")) {
    return reply(200, "duplicate");
  }
  if (!HANDLED_EVENTS.has(eventType) || typeof orderId !== "string") {
    await deps.store.updateWebhookEvent(event.id, { status: "ignored" });
    return reply(200, "ignored_event_type");
  }

  const outcome = await processOrderEvent(orderId, eventType, deps);
  await deps.store.updateWebhookEvent(event.id, { status: outcome.eventStatus, error: outcome.error ?? null });
  return reply(outcome.httpStatus, outcome.result);
}

interface ProcessOutcome {
  eventStatus: "processed" | "ignored" | "pending_verification" | "failed";
  httpStatus: number;
  result: string;
  error?: string;
}

/** Usado pelo webhook e pela reconciliação de eventos pendentes. */
export async function processOrderEvent(
  orderId: string,
  eventType: string,
  deps: Pick<WebhookDeps, "store" | "api" | "allowedProductIds">,
): Promise<ProcessOutcome> {
  // Reembolso/chargeback assinados revogam imediatamente (falhar fechado).
  if (REVOKING_EVENTS.has(eventType)) {
    const r = await revokeByOrderId(orderId, eventType, { store: deps.store, source: "webhook" });
    return { eventStatus: "processed", httpStatus: 200, result: r.outcome };
  }

  // Aprovação: só concede após confirmar o estado ATUAL na API.
  if (!deps.api) {
    return { eventStatus: "pending_verification", httpStatus: 200, result: "pending_api_not_configured", error: "api_not_configured" };
  }
  let sale: KiwifySale;
  try {
    sale = await deps.api.getSale(orderId);
  } catch (e) {
    if (e instanceof KiwifyApiError && e.kind === "not_found") {
      // Ex.: botão "Testar Webhook" (IDs fictícios). Nunca provisiona.
      return { eventStatus: "failed", httpStatus: 200, result: "sale_not_found", error: "sale_not_found" };
    }
    return { eventStatus: "pending_verification", httpStatus: 503, result: "verification_unavailable", error: sanitizeError(e) };
  }
  let r: ReconcileResult;
  try {
    r = await reconcileSale(sale, { store: deps.store, allowedProductIds: deps.allowedProductIds, source: "webhook" });
  } catch (e) {
    return { eventStatus: "pending_verification", httpStatus: 503, result: "provisioning_error", error: sanitizeError(e) };
  }
  if (r.outcome === "ignored_product") return { eventStatus: "ignored", httpStatus: 200, result: r.outcome };
  if (r.outcome === "needs_review") {
    return { eventStatus: "failed", httpStatus: 200, result: r.outcome, error: r.reason };
  }
  return { eventStatus: "processed", httpStatus: 200, result: r.outcome };
}
