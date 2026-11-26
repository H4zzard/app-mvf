"use server";
/**
 * Server Actions do Assistente MVF. Cada chamada reautoriza no servidor
 * (getSupportRuntime → getViewer), valida a entrada e aplica limites ANTES de
 * qualquer chamada ao modelo. Nenhum segredo, prompt ou dado de outra aluna
 * volta para o navegador.
 */
import { sensitiveFindings } from "@/lib/support/tickets";
import { generateReply } from "@/lib/support-ai/engine";
import { HANDOFF_LABEL, detectHandoff, type HandoffTopic } from "@/lib/support-ai/escalation";
import { getSupportRuntime, rateLimited } from "@/lib/support-ai/server";
import { transcriptFileName } from "@/lib/support-ai/transcript";
import type { SourceRef, SupportMessage } from "@/lib/support-ai/types";

export interface ClientMessage {
  id: string;
  sender: "student" | "assistant" | "system";
  content: string;
  createdAt: string;
  seq: number;
  sources?: SourceRef[];
}

export type ChatError =
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "invalid_tab"
  | "invalid"
  | "too_long"
  | "sensitive"
  | "rate_limited"
  | "busy"
  | "closed"
  | "not_found"
  | "conversation_limit"
  | "daily_limit"
  | "reply_failed"
  | "reply_timeout"
  | "archive_failed";

const toClient = (m: SupportMessage): ClientMessage => ({ id: m.id, sender: m.sender, content: m.content, createdAt: m.createdAt, seq: m.seq, ...(m.sources ? { sources: m.sources } : {}) });

const GREETINGS = [
  "Oii! Tudo bem? 💗 Me conta, em que posso te ajudar?",
  "Oi! Pode me contar sua dúvida, que eu te ajudo.",
  "Olá! Como posso te ajudar hoje?",
];

export async function startConversationAction(tabId: string | null): Promise<
  | { ok: true; conversationId: string; messages: ClientMessage[]; providerLabel: string; demo: boolean; maxChars: number }
  | { ok: false; error: ChatError }
> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  const { runtime } = rt;
  if (rateLimited(`start:${runtime.ownerId}`)) return { ok: false, error: "rate_limited" };
  try {
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    const { conversation, messages } = await runtime.store.start(runtime.ownerId, runtime.ownerLabel, greeting);
    return { ok: true, conversationId: conversation.id, messages: messages.map(toClient), providerLabel: runtime.providerLabel, demo: runtime.demo, maxChars: runtime.config.maxMessageChars };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

type ReplyOutcome = { ok: true; reply: ClientMessage; handoff: { topic: HandoffTopic; label: string } | null } | { ok: false; error: ChatError };

async function reply(runtime: Extract<Awaited<ReturnType<typeof getSupportRuntime>>, { ok: true }>["runtime"], conversationId: string): Promise<ReplyOutcome> {
  const r = await generateReply(runtime.engine, runtime.ownerId, conversationId);
  if (!r.ok) {
    if (r.error === "closed") return { ok: false, error: "closed" };
    if (r.error === "not_found") return { ok: false, error: "not_found" };
    return { ok: false, error: r.error === "timeout" ? "reply_timeout" : "reply_failed" };
  }
  return { ok: true, reply: toClient(r.message), handoff: r.handoff ? { topic: r.handoff, label: HANDOFF_LABEL[r.handoff] } : null };
}

export async function sendMessageAction(
  tabId: string | null,
  conversationId: string,
  text: string,
): Promise<{ ok: true; student: ClientMessage; reply: ClientMessage | null; replyError?: ChatError; handoff: { topic: HandoffTopic; label: string } | null } | { ok: false; error: ChatError; found?: string[] }> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  const { runtime } = rt;
  const content = typeof text === "string" ? text.trim() : "";
  if (!content) return { ok: false, error: "invalid" };
  if (content.length > runtime.config.maxMessageChars) return { ok: false, error: "too_long" };
  // Dados sensíveis nunca são enviados ao modelo nem gravados: a aluna remove antes.
  const found = sensitiveFindings(content);
  if (found.length) return { ok: false, error: "sensitive", found };
  if (rateLimited(runtime.ownerId)) return { ok: false, error: "rate_limited" };

  const saved = await runtime.store.appendStudent(runtime.ownerId, conversationId, content, runtime.limits);
  if (!saved.ok) return { ok: false, error: saved.error === "archive_failed" ? "unavailable" : saved.error };
  const r = await reply(runtime, conversationId);
  if (!r.ok) {
    // A mensagem da aluna fica salva; a interface oferece “Tentar de novo”.
    return { ok: true, student: toClient(saved.value), reply: null, replyError: r.error, handoff: detectHandoff(content) ? { topic: detectHandoff(content)!, label: HANDOFF_LABEL[detectHandoff(content)!] } : null };
  }
  return { ok: true, student: toClient(saved.value), reply: r.reply, handoff: r.handoff };
}

export async function retryReplyAction(tabId: string | null, conversationId: string): Promise<ReplyOutcome> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  if (rateLimited(rt.runtime.ownerId)) return { ok: false, error: "rate_limited" };
  return reply(rt.runtime, conversationId);
}

export async function requestHandoffAction(
  tabId: string | null,
  conversationId: string,
  topic: string | null,
): Promise<{ ok: true; contactUrl: string | null } | { ok: false; error: ChatError }> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  const safeTopic = topic && topic in HANDOFF_LABEL ? HANDOFF_LABEL[topic as HandoffTopic] : null;
  const r = await rt.runtime.store.requestHandoff(rt.runtime.ownerId, conversationId, safeTopic);
  if (!r.ok) return { ok: false, error: r.error === "closed" ? "closed" : "not_found" };
  // Só um canal oficial verificado (configurado no servidor). Nunca “atendente acionado”.
  return { ok: true, contactUrl: rt.runtime.contactUrl };
}

export async function closeConversationAction(
  tabId: string | null,
  conversationId: string,
): Promise<{ ok: true; closedAt: string; fileName: string; alreadyClosed: boolean; persistent: boolean } | { ok: false; error: ChatError }> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  const r = await rt.runtime.store.close(rt.runtime.ownerId, conversationId);
  if (!r.ok) return { ok: false, error: r.error === "archive_failed" ? "archive_failed" : "not_found" };
  return {
    ok: true,
    closedAt: r.value.conversation.closedAt!,
    fileName: transcriptFileName(r.value.conversation),
    alreadyClosed: r.value.alreadyClosed,
    persistent: rt.runtime.store.persistent,
  };
}

export async function exportTranscriptAction(tabId: string | null, conversationId: string): Promise<{ ok: true; fileName: string; text: string } | { ok: false; error: ChatError }> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  const r = await rt.runtime.store.exportTranscript(rt.runtime.ownerId, conversationId);
  if (!r.ok) return { ok: false, error: r.error === "closed" ? "closed" : "not_found" };
  return { ok: true, fileName: transcriptFileName(r.value.conversation), text: r.value.text };
}

export async function listMyConversationsAction(tabId: string | null) {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false as const, error: rt.error };
  return { ok: true as const, conversations: await rt.runtime.store.listMine(rt.runtime.ownerId) };
}
