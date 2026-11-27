"use server";
/**
 * Server Actions da Nina (Assistente MVF). Cada chamada reautoriza no servidor
 * (getSupportRuntime → getViewer), valida a entrada e aplica limites ANTES de
 * qualquer chamada ao modelo. Nenhum segredo, prompt ou dado de outra aluna
 * volta para o navegador. Encerrar (manual, automático ou ao abrir aula) usa
 * SEMPRE o mesmo mecanismo do repositório (`store.close`).
 */
import { sensitiveFindings } from "@/lib/support/tickets";
import { resolveLessonForSession } from "@/lib/support-ai/base";
import { decideAutoClose, lessonWasOffered } from "@/lib/support-ai/decisions";
import { generateReply } from "@/lib/support-ai/engine";
import { HANDOFF_LABEL, detectHandoff, type HandoffTopic } from "@/lib/support-ai/escalation";
import { FAREWELLS, GREETINGS } from "@/lib/support-ai/persona";
import { getSupportRuntime, rateLimited } from "@/lib/support-ai/server";
import { transcriptFileName } from "@/lib/support-ai/transcript";
import type { ChatAction, CloseReason, MessageMeta, SourceRef, SupportMessage } from "@/lib/support-ai/types";

export interface ClientMessage {
  id: string;
  sender: "student" | "assistant" | "system";
  content: string;
  createdAt: string;
  seq: number;
  sources?: SourceRef[];
  actions?: ChatAction[];
  meta?: MessageMeta;
}

export type ChatError =
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "invalid_tab"
  | "provider_not_configured"
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
  | "archive_failed"
  | "lesson_unavailable";

export interface ClosedInfo {
  closedAt: string;
  fileName: string;
  persistent: boolean;
  reason: CloseReason;
}

const toClient = (m: SupportMessage): ClientMessage => ({
  id: m.id,
  sender: m.sender,
  content: m.content,
  createdAt: m.createdAt,
  seq: m.seq,
  ...(m.sources ? { sources: m.sources } : {}),
  ...(m.actions ? { actions: m.actions } : {}),
  ...(m.meta ? { meta: m.meta } : {}),
});

type Runtime = Extract<Awaited<ReturnType<typeof getSupportRuntime>>, { ok: true }>["runtime"];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

async function closeWith(runtime: Runtime, conversationId: string, reason: CloseReason): Promise<{ ok: true; closed: ClosedInfo } | { ok: false; error: ChatError }> {
  const r = await runtime.store.close(runtime.ownerId, conversationId, reason);
  if (!r.ok) return { ok: false, error: r.error === "archive_failed" ? "archive_failed" : "not_found" };
  return {
    ok: true,
    closed: {
      closedAt: r.value.conversation.closedAt!,
      fileName: transcriptFileName(r.value.conversation),
      persistent: runtime.store.persistent,
      reason: r.value.conversation.closeReason ?? reason,
    },
  };
}

export async function startConversationAction(tabId: string | null): Promise<
  | { ok: true; conversationId: string; messages: ClientMessage[]; providerLabel: string; providerKind: "deepseek" | "local"; demo: boolean; maxChars: number }
  | { ok: false; error: ChatError }
> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  const { runtime } = rt;
  if (rateLimited(`start:${runtime.ownerId}`)) return { ok: false, error: "rate_limited" };
  try {
    const { conversation, messages } = await runtime.store.start(runtime.ownerId, runtime.ownerLabel, pick(GREETINGS));
    return {
      ok: true,
      conversationId: conversation.id,
      messages: messages.map(toClient),
      providerLabel: runtime.providerLabel,
      providerKind: runtime.engine.provider.kind,
      demo: runtime.demo,
      maxChars: runtime.config.maxMessageChars,
    };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

type ReplyOutcome = { ok: true; reply: ClientMessage; handoff: { topic: HandoffTopic; label: string } | null } | { ok: false; error: ChatError };

async function reply(runtime: Runtime, conversationId: string): Promise<ReplyOutcome> {
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
): Promise<
  | {
      ok: true;
      student: ClientMessage;
      reply: ClientMessage | null;
      replyError?: ChatError;
      handoff: { topic: HandoffTopic; label: string } | null;
      /** Encerramento automático por resolução confirmada (decidido pelo servidor). */
      closed?: ClosedInfo;
      closeError?: ChatError;
    }
  | { ok: false; error: ChatError; found?: string[] }
> {
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

  // Encerramento automático: só com confirmação explícita da aluna (servidor decide e registra o motivo).
  const current = await runtime.store.get(runtime.ownerId, conversationId);
  if (current) {
    const decision = decideAutoClose(content, current.conversation, current.messages.slice(0, -1));
    if (decision.close) {
      const bye = await runtime.store.appendAssistant(conversationId, pick(FAREWELLS), { meta: { provider: "sistema" } });
      const done = await closeWith(runtime, conversationId, decision.reason);
      return {
        ok: true,
        student: toClient(saved.value),
        reply: bye.ok ? toClient(bye.value) : null,
        handoff: null,
        ...(done.ok ? { closed: done.closed } : { closeError: done.error }),
      };
    }
  }

  const r = await reply(runtime, conversationId);
  if (!r.ok) {
    // A mensagem da aluna fica salva; a interface oferece “Tentar de novo”.
    const topic = detectHandoff(content);
    return { ok: true, student: toClient(saved.value), reply: null, replyError: r.error, handoff: topic ? { topic, label: HANDOFF_LABEL[topic] } : null };
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

/**
 * “Abrir aula”: valida de novo o acesso e a aula, registra o evento, arquiva o
 * atendimento e SÓ ENTÃO devolve o destino. Idempotente (repetir não duplica).
 * Não conclui aula, não dá XP e não marca etapa do plano.
 */
export async function openLessonAction(
  tabId: string | null,
  conversationId: string,
  lessonId: string,
): Promise<{ ok: true; href: string; closed: ClosedInfo } | { ok: false; error: ChatError }> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  const { runtime } = rt;
  const found = await runtime.store.get(runtime.ownerId, conversationId);
  if (!found) return { ok: false, error: "not_found" };
  const lesson = resolveLessonForSession(String(lessonId), { demo: runtime.demo });
  if (!lesson || !lessonWasOffered(found.messages, String(lessonId))) return { ok: false, error: "lesson_unavailable" };
  if (found.conversation.status === "open") {
    const ev = await runtime.store.appendSystem(runtime.ownerId, conversationId, `A aluna abriu a aula “${lesson.title}”${lesson.moduleTitle ? ` (módulo ${lesson.moduleTitle})` : ""}.`);
    if (!ev.ok && ev.error !== "closed") return { ok: false, error: "not_found" };
  }
  const done = await closeWith(runtime, conversationId, "abriu_aula");
  if (!done.ok) return done;
  return { ok: true, href: lesson.href, closed: done.closed };
}

export async function closeConversationAction(tabId: string | null, conversationId: string): Promise<({ ok: true; alreadyClosed?: boolean } & ClosedInfo) | { ok: false; error: ChatError }> {
  const rt = await getSupportRuntime(tabId);
  if (!rt.ok) return { ok: false, error: rt.error };
  const done = await closeWith(rt.runtime, conversationId, "manual");
  return done.ok ? { ok: true, ...done.closed } : done;
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
