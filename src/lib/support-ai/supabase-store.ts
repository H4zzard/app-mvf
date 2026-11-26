import "server-only";
/**
 * Repositório REAL do suporte (Supabase). Só é usado com MVF_SUPPORT_STORE=supabase,
 * DEPOIS da migration 20261126120000_suporte_ia.sql aplicada com autorização.
 *
 * - Operações da aluna: cliente com a sessão dela (RLS + funções que checam acesso ativo).
 * - Respostas do assistente, resumo e arquivamento do TXT: cliente de serviço (servidor),
 *   porque a aluna não pode forjar mensagens do assistente.
 * O `ownerId` recebido é sempre o `auth.uid()` do servidor; o banco confere de novo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTranscript } from "./transcript";
import type { ConversationSummary, StoreResult, SupportStore, CloseOutcome } from "./store";
import type { SourceRef, SupportConversation, SupportMessage } from "./types";

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
    pendingSince: (r.pending_since as string | null) ?? null,
    transcript: (r.transcript as string | null) ?? null,
    transcriptGeneratedAt: (r.transcript_generated_at as string | null) ?? null,
    retentionUntil: (r.retention_until as string | null) ?? null,
  };
}

function toMessage(r: Row): SupportMessage {
  const sources = Array.isArray(r.sources) ? (r.sources as SourceRef[]) : [];
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    sender: r.sender as SupportMessage["sender"],
    content: String(r.content),
    createdAt: new Date(String(r.created_at)).toISOString(),
    seq: Number(r.seq),
    ...(sources.length ? { sources } : {}),
  };
}

const asError = (e: unknown): StoreResult<never> => ({ ok: false, error: (["not_found", "closed", "busy", "conversation_limit", "daily_limit"].includes(String(e)) ? e : "not_found") as never });

export function createSupabaseStore(user: SupabaseClient, service: SupabaseClient): SupportStore {
  async function load(id: string) {
    const { data: c } = await user.from("support_conversations").select("*").eq("id", id).maybeSingle();
    if (!c) return null;
    const { data: ms } = await user.from("support_messages").select("*").eq("conversation_id", id).order("seq");
    return { conversation: toConversation(c), messages: (ms ?? []).map(toMessage) };
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
      const { data: m } = await user.from("support_messages").select("*").eq("conversation_id", id).eq("seq", r.seq!).single();
      return { ok: true, value: toMessage(m as Row) };
    },

    async appendAssistant(id, content, sources) {
      const { data, error } = await service.rpc("support_append_assistant_message", { p_conversation: id, p_content: content, p_sources: sources ?? [], p_meta: {} });
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

    async close(_ownerId, id): Promise<StoreResult<CloseOutcome>> {
      const { data, error } = await user.rpc("support_begin_close", { p_conversation: id });
      if (error) return { ok: false, error: "not_found" };
      const begin = data as { ok: boolean; status?: string; error?: string };
      if (!begin.ok) return asError(begin.error);
      const found = await load(id);
      if (!found) return { ok: false, error: "not_found" };
      if (begin.status === "closed" && found.conversation.transcript) {
        return { ok: true, value: { conversation: found.conversation, transcript: found.conversation.transcript, alreadyClosed: true } };
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
      const after = await load(id);
      if (!after?.conversation.transcript) return { ok: false, error: "archive_failed" };
      return { ok: true, value: { conversation: after.conversation, transcript: after.conversation.transcript, alreadyClosed: Boolean((fin as { already_closed?: boolean }).already_closed) } };
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

    async exportTranscript(_ownerId, id) {
      const found = await load(id);
      if (!found) return { ok: false, error: "not_found" };
      if (found.conversation.status !== "closed" || !found.conversation.transcript) return { ok: false, error: "closed" };
      return { ok: true, value: { text: found.conversation.transcript, conversation: found.conversation } };
    },
  };
}
