/**
 * Assinatura de webhooks Kiwify (docs.kiwify.com.br/api-reference/webhooks/receiving):
 * HMAC-SHA1, hexadecimal minúsculo, chave = token do webhook, mensagem = bytes
 * EXATOS do corpo recebido (antes de qualquer JSON.parse), enviada na query
 * `signature`. Comparação em tempo constante.
 *
 * Aceita mais de um token para rotação (a Kiwify pode reenviar falhas antigas
 * com o token anterior). Módulo puro (roda em `node --test`).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const HEX_SHA1 = /^[0-9a-f]{40}$/;

export function computeKiwifySignature(rawBody: Uint8Array, token: string): string {
  return createHmac("sha1", token).update(rawBody).digest("hex");
}

export function verifyKiwifySignature(
  rawBody: Uint8Array,
  signature: string | null | undefined,
  tokens: string[],
): boolean {
  const usable = tokens.filter((t) => t.length > 0); // token vazio = sem segurança: nunca aceitar
  if (!signature || usable.length === 0) return false;
  const received = signature.trim().toLowerCase();
  if (!HEX_SHA1.test(received)) return false;
  const receivedBuf = Buffer.from(received, "hex");
  let ok = false;
  for (const token of usable) {
    const expected = Buffer.from(computeKiwifySignature(rawBody, token), "hex");
    // Comprimentos iguais por construção (20 bytes); checagem explícita mesmo assim.
    if (expected.length === receivedBuf.length && timingSafeEqual(expected, receivedBuf)) ok = true;
  }
  return ok;
}
