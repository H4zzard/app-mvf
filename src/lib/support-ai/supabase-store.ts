import "server-only";
/**
 * Repositório REAL do suporte (Supabase). Só é usado com MVF_SUPPORT_STORE=supabase,
 * DEPOIS das migrations do suporte (20261126120000, 20261127120000 e 20261127150000).
 * A aluna NUNCA recebe a transcrição: o TXT é gravado pelo servidor e só a equipe exporta (admin.ts).
 *
 * - Operações da aluna: cliente com a sessão dela (RLS + funções que checam acesso ativo).
 * - Respostas do assistente, resumo e arquivamento do TXT: cliente de serviço (servidor),
 *   porque a aluna não pode forjar mensagens do assistente.
 * O `ownerId` recebido é sempre o `auth.uid()` do servidor; o banco confere de novo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTranscript } from "./transcript";
import type { AssistantExtras, ConversationSummary, StoreResult, SupportStore, CloseOutcome } from "./store";
import type { ChatAction, CloseReason, MessageMeta, SourceRef, SupportConversation, SupportMessage } from "./types";

type Row = Record<string, unknown>;

function toConversation(r: Row): SupportConversation {
  return {
    id: String(r.id),
    ownerId: String(r.user_id),
    ownerLabel: String(r.owner_label),
    status: r.status as SupportConversation["status"],
    origin: "central_de_ajuda",
    category: (r.category as string | null) ?? null,
    summary: (r.summary as string | null) ?? null,
    summaryUpToSeq: Number(r.summary_up_to_seq ?? 0),
    handoffRequestedAt: (r.handoff_requested_at as string | null) ?? null,
    handoffTopic: (r.handoff_topic as string | null) ?? null,
    startedAt: String(r.started_at),
    closedAt: (r.closed_at as string | null) ?? null,
    closeReason: (r.close_reason as CloseReason | null) ?? null,
    pendingSince: (r.pending_since as string | null) ?? null,
    transcript: (r.transcript as string | null) ?? null,
    transcriptGeneratedAt: (r.transcript_generated_at as string | null) ?? null,
    retentionUntil: (r.retention_until as string | null) ?? null,
  };
}

function toMessage(r: Row): SupportMessage {
  const sources = Array.isArray(r.sources) ? (r.sources as SourceRef[]) : [];
  const actions = Array.isArray(r.actions) ? (r.actions as ChatAction[]) : [];
  const meta = r.meta && typeof r.meta === "object" && "provider" in (r.meta as object) ? (r.meta as MessageMeta) : undefined;
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    sender: r.sender as SupportMessage["sender"],
    content: String(r.content),
    createdAt: new Date(String(r.created_at)).toISOString(),
    seq: Number(r.seq),
    ...(sources.length ? { sources } : {}),
    ...(actions.length ? { actions } : {}),
    ...(meta ? { meta } : {}),
  };
}

const asError = (e: unknown): StoreResult<never> => ({ ok: false, error: (["not_found", "closed", "busy", "conversation_limit", "daily_limit"].includes(String(e)) ? e : "not_found") as never });

/** Colunas que a ALUNA pode ler (migration 20261127150000). Nunca `select *` com a sessão dela. */
const STUDENT_CONVERSATION_COLUMNS = "id, user_id, owner_label, status, origin, category, handoff_requested_at, handoff_topic, started_at, closed_at, close_reason, message_count";
const STUDENT_MESSAGE_COLUMNS = "id, conversation_id, seq, sender, content, actions, created_at";
/** Campos internos lidos só pelo servidor, depois de a sessão da aluna provar que a conversa é dela. */
const INTERNAL_CONVERSATION_COLUMNS = "summary, summary_up_to_seq, pending_since, transcript_generated_at, retention_until";

export function createSupabaseStore(user: SupabaseClient, service: SupabaseClient): SupportStore {
  async function load(id: string) {
    // 1) Dona: a sessão da aluna (RLS) precisa enxergar a conversa.
    const { data: c } = await user.from("support_conversations").select(STUDENT_CONVERSATION_COLUMNS).eq("id", id).maybeSingle();
    if (!c) return null;
    // 2) Memória interna do atendimento (resumo, pendência): servidor. O TXT nunca é carregado aqui.
    const { data: internal } = await service.from("support_conversations").select(INTERNAL_CONVERSATION_COLUMNS).eq("id", id).single();
    const { data: ms } = await user.from("support_messages").select(STUDENT_MESSAGE_COLUMNS).eq("conversation_id", id).order("seq");
    return { conversation: toConversation({ ...(internal ?? {}), ...c, transcript: null }), messages: (ms ?? []).map(toMessage) };
  }

  /** Confirma no banco que o TXT foi gravado (sem trazer o texto). */
  async function archived(id: string) {
    const { data } = await service.from("support_conversations").select("status, transcript_generated_at").eq("id", id).single();
    return Boolean(data && data.status === "closed" && data.transcript_generated_at);
  }

  return {
    persistent: true,

    async start(_ownerId, ownerLabel, greeting) {
      const { data, error } = await user.rpc("support_start_conversation", { p_owner_label: ownerLabel, p_greeting: greeting });
      if (error || !data) throw new Error("support_start_failed");
      const found = await load(String(data));
      if (!found) throw new Error("support_start_failed");
      return found;
    },

    async get(_ownerId, id) {
      return load(id); // RLS garante que só a dona lê
    },

    async appendStudent(_ownerId, id, content) {
      // Limites vêm do banco (support_settings); os do app são só a primeira barreira.
      const { data, error } = await user.rpc("support_append_student_message", { p_conversation: id, p_content: content });
      if (error) return { ok: false, error: "not_found" };
      const r = data as { ok: boolean; error?: string; seq?: number };
      if (!r.ok) return asError(r.error);
      const { data: m } = await user.from("support_messages").select(STUDENT_MESSAGE_COLUMNS).eq("conversation_id", id).eq("seq", r.seq!).single();
      return { ok: true, value: toMessage(m as Row) };
    },

    async appendAssistant(id, content, extras: AssistantExtras = {}) {
      const { data, error } = await service.rpc("support_append_assistant_message", {
        p_conversation: id,
        p_content: content,
        p_sources: extras.sources ?? [],
        p_meta: extras.meta ?? {},
        p_actions: extras.actions ?? [],
      });
      if (error) return { ok: false, error: "not_found" };
      const r = data as { ok: boolean; error?: string; seq?: number };
      if (!r.ok) return asError(r.error);
      const { data: m } = await service.from("support_messages").select("*").eq("conversation_id", id).eq("seq", r.seq!).single();
      return { ok: true, value: toMessage(m as Row) };
    },

    async appendSystem(_ownerId, id, content) {
      // Confere a dona pela sessão (RLS) antes de gravar pelo servidor.
      if (!(await load(id))) return { ok: false, error: "not_found" };
      const { data, error } = await service.rpc("support_append_system_message", { p_conversation: id, p_content: content });
      if (error) return { ok: false, error: "not_found" };
      const r = data as { ok: boolean; error?: string; seq?: number };
      if (!r.ok) return asError(r.error);
      const { data: m } = await service.from("support_messages").select("*").eq("conversation_id", id).eq("seq", r.seq!).single();
      return { ok: true, value: toMessage(m as Row) };
    },

    async releasePending(id) {
      await service.rpc("support_release_pending", { p_conversation: id });
    },

    async setSummary(id, summary, upToSeq) {
      await service.rpc("support_set_summary", { p_conversation: id, p_summary: summary, p_up_to_seq: upToSeq });
    },

    async requestHandoff(ownerId, id, topic) {
      const { data, error } = await user.rpc("support_request_handoff", { p_conversation: id, p_topic: topic });
      if (error || !(data as { ok: boolean }).ok) return { ok: false, error: "not_found" };
      const found = await load(id);
      return found ? { ok: true, value: found.conversation } : { ok: false, error: "not_found" };
    },

    async close(_ownerId, id, reason: CloseReason = "manual"): Promise<StoreResult<CloseOutcome>> {
      // "resolvido" só pelo servidor (a função da aluna aceita apenas manual/abriu_aula).
      if (reason === "resolvido" && (await load(id))) await service.rpc("support_set_close_reason", { p_conversation: id, p_reason: reason });
      const { data, error } = await user.rpc("support_begin_close", { p_conversation: id, p_reason: reason === "abriu_aula" ? "abriu_aula" : "manual" });
      if (error) return { ok: false, error: "not_found" };
      const begin = data as { ok: boolean; status?: string; error?: string };
      if (!begin.ok) return asError(begin.error);
      const found = await load(id);
      if (!found) return { ok: false, error: "not_found" };
      if (begin.status === "closed" && (await archived(id))) {
        return { ok: true, value: { conversation: found.conversation, alreadyClosed: true, persisted: true } };
      }
      const closedAt = new Date().toISOString();
      let transcript: string;
      try {
        transcript = buildTranscript(found.conversation, found.messages, closedAt);
      } catch {
        return { ok: false, error: "archive_failed" };
      }
      const { data: fin, error: e2 } = await service.rpc("support_finish_close", {
        p_conversation: id,
        p_transcript: transcript,
        p_closed_at: closedAt,
        p_message_count: found.messages.length,
      });
      if (e2 || !(fin as { ok: boolean }).ok) return { ok: false, error: "archive_failed" };
      // Só confirma o encerramento depois de ler do banco que o TXT foi gravado.
      const after = await load(id);
      if (!after || !(await archived(id))) return { ok: false, error: "archive_failed" };
      return { ok: true, value: { conversation: after.conversation, alreadyClosed: Boolean((fin as { already_closed?: boolean }).already_closed), persisted: true } };
    },

    async listMine(): Promise<ConversationSummary[]> {
      const { data } = await user
        .from("support_conversations")
        .select("id, status, started_at, closed_at, message_count, handoff_requested_at")
        .order("started_at", { ascending: false })
        .limit(50);
      return (data ?? []).map((r: Row) => ({
        id: String(r.id),
        status: r.status as ConversationSummary["status"],
        startedAt: String(r.started_at),
        closedAt: (r.closed_at as string | null) ?? null,
        messageCount: Number(r.message_count),
        handoffRequested: r.handoff_requested_at !== null,
      }));
    },

  };
}
