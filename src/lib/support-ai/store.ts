/**
 * Repositório de atendimentos — contrato único + implementação EM MEMÓRIA.
 *
 * A memória serve ao modo demonstração local (cada aba tem seu dono `demo:<id>`,
 * some ao reiniciar o servidor ou recarregar a aba) e aos testes. A versão real
 * (Supabase, `supabase-store.ts`) segue o MESMO contrato e as mesmas regras,
 * reforçadas por RLS e funções SQL. Módulo puro.
 *
 * Regras:
 *  - isolamento: toda operação recebe o dono; conversa de outra pessoa = “não encontrada”;
 *  - uma resposta por vez por conversa (`pendingSince`);
 *  - limites por conversa e por 24 h;
 *  - encerramento em duas fases: “closing” bloqueia novas mensagens → TXT → “closed”.
 *    É idempotente; se o arquivamento falhar, NÃO vira “closed” e pode ser repetido.
 */
import { buildTranscript } from "./transcript.ts";
import type { SourceRef, SupportConversation, SupportMessage } from "./types.ts";

export type StoreError = "not_found" | "closed" | "busy" | "conversation_limit" | "daily_limit" | "archive_failed";
export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: StoreError };

export interface Limits {
  maxMessagesPerConversation: number;
  dailyMessagesPerUser: number;
  /** Depois disso, uma resposta “pendente” é considerada abandonada (ms). */
  pendingStaleMs: number;
}

export interface CloseOutcome {
  conversation: SupportConversation;
  transcript: string;
  alreadyClosed: boolean;
}

export interface ConversationSummary {
  id: string;
  status: SupportConversation["status"];
  startedAt: string;
  closedAt: string | null;
  messageCount: number;
  handoffRequested: boolean;
}

export interface SupportStore {
  readonly persistent: boolean;
  start(ownerId: string, ownerLabel: string, greeting: string): Promise<{ conversation: SupportConversation; messages: SupportMessage[] }>;
  get(ownerId: string, conversationId: string): Promise<{ conversation: SupportConversation; messages: SupportMessage[] } | null>;
  appendStudent(ownerId: string, conversationId: string, content: string, limits: Limits): Promise<StoreResult<SupportMessage>>;
  /** Chamado só pelo servidor, depois da resposta do modelo. Libera a pendência. */
  appendAssistant(conversationId: string, content: string, sources?: SourceRef[]): Promise<StoreResult<SupportMessage>>;
  releasePending(conversationId: string): Promise<void>;
  setSummary(conversationId: string, summary: string, upToSeq: number): Promise<void>;
  requestHandoff(ownerId: string, conversationId: string, topic: string | null): Promise<StoreResult<SupportConversation>>;
  close(ownerId: string, conversationId: string): Promise<StoreResult<CloseOutcome>>;
  listMine(ownerId: string): Promise<ConversationSummary[]>;
  /** Só atendimentos ENCERRADOS têm TXT. */
  exportTranscript(ownerId: string, conversationId: string): Promise<StoreResult<{ text: string; conversation: SupportConversation }>>;
}

const DAY = 24 * 60 * 60 * 1000;

export function createMemoryStore(opts: {
  now?: () => Date;
  newId?: () => string;
  /** Persistência do TXT (injetável para simular falha de arquivamento nos testes). */
  archive?: (conv: SupportConversation, transcript: string) => Promise<void>;
} = {}): SupportStore & { _dump(): { conversations: SupportConversation[]; messages: SupportMessage[] }; purgeOwnersIdleSince(ms: number): number } {
  const now = opts.now ?? (() => new Date());
  const newId = opts.newId ?? (() => crypto.randomUUID());
  const archive = opts.archive ?? (async () => {});
  const conversations = new Map<string, SupportConversation>();
  const messages = new Map<string, SupportMessage[]>();
  const closing = new Map<string, Promise<StoreResult<CloseOutcome>>>();

  const own = (ownerId: string, id: string) => {
    const c = conversations.get(id);
    return c && c.ownerId === ownerId ? c : null;
  };
  const push = (conv: SupportConversation, sender: SupportMessage["sender"], content: string, sources?: SourceRef[]) => {
    const list = messages.get(conv.id)!;
    const msg: SupportMessage = {
      id: newId(),
      conversationId: conv.id,
      sender,
      content,
      createdAt: now().toISOString(),
      seq: list.length + 1,
      ...(sources?.length ? { sources } : {}),
    };
    list.push(msg);
    return msg;
  };
  const snapshot = (c: SupportConversation) => ({ conversation: { ...c }, messages: (messages.get(c.id) ?? []).map((m) => ({ ...m })) });

  const store = {
    persistent: false,

    async start(ownerId: string, ownerLabel: string, greeting: string) {
      const t = now().toISOString();
      const conv: SupportConversation = {
        id: newId(),
        ownerId,
        ownerLabel,
        status: "open",
        origin: "central_de_ajuda",
        category: null,
        summary: null,
        summaryUpToSeq: 0,
        handoffRequestedAt: null,
        handoffTopic: null,
        startedAt: t,
        closedAt: null,
        pendingSince: null,
        transcript: null,
        transcriptGeneratedAt: null,
        retentionUntil: null,
      };
      conversations.set(conv.id, conv);
      messages.set(conv.id, []);
      push(conv, "assistant", greeting);
      return snapshot(conv);
    },

    async get(ownerId: string, id: string) {
      const c = own(ownerId, id);
      return c ? snapshot(c) : null;
    },

    async appendStudent(ownerId: string, id: string, content: string, limits: Limits): Promise<StoreResult<SupportMessage>> {
      const c = own(ownerId, id);
      if (!c) return { ok: false, error: "not_found" };
      if (c.status !== "open") return { ok: false, error: "closed" };
      if (c.pendingSince && now().getTime() - Date.parse(c.pendingSince) < limits.pendingStaleMs) return { ok: false, error: "busy" };
      const list = messages.get(id)!;
      if (list.filter((m) => m.sender === "student").length >= limits.maxMessagesPerConversation) return { ok: false, error: "conversation_limit" };
      const since = now().getTime() - DAY;
      let today = 0;
      for (const conv of conversations.values()) {
        if (conv.ownerId !== ownerId) continue;
        today += (messages.get(conv.id) ?? []).filter((m) => m.sender === "student" && Date.parse(m.createdAt) >= since).length;
      }
      if (today >= limits.dailyMessagesPerUser) return { ok: false, error: "daily_limit" };
      const msg = push(c, "student", content);
      c.pendingSince = msg.createdAt;
      return { ok: true, value: { ...msg } };
    },

    async appendAssistant(id: string, content: string, sources?: SourceRef[]): Promise<StoreResult<SupportMessage>> {
      const c = conversations.get(id);
      if (!c) return { ok: false, error: "not_found" };
      if (c.status !== "open") {
        c.pendingSince = null;
        return { ok: false, error: "closed" };
      }
      const msg = push(c, "assistant", content, sources);
      c.pendingSince = null;
      return { ok: true, value: { ...msg } };
    },

    async releasePending(id: string) {
      const c = conversations.get(id);
      if (c) c.pendingSince = null;
    },

    async setSummary(id: string, summary: string, upToSeq: number) {
      const c = conversations.get(id);
      if (c && upToSeq > c.summaryUpToSeq) {
        c.summary = summary;
        c.summaryUpToSeq = upToSeq;
      }
    },

    async requestHandoff(ownerId: string, id: string, topic: string | null): Promise<StoreResult<SupportConversation>> {
      const c = own(ownerId, id);
      if (!c) return { ok: false, error: "not_found" };
      if (c.status !== "open") return { ok: false, error: "closed" };
      if (!c.handoffRequestedAt) {
        c.handoffRequestedAt = now().toISOString();
        c.handoffTopic = topic;
        if (topic && !c.category) c.category = topic;
      }
      return { ok: true, value: { ...c } };
    },

    async close(ownerId: string, id: string): Promise<StoreResult<CloseOutcome>> {
      const c = own(ownerId, id);
      if (!c) return { ok: false, error: "not_found" };
      if (c.status === "closed" && c.transcript) return { ok: true, value: { conversation: { ...c }, transcript: c.transcript, alreadyClosed: true } };
      // Pedidos simultâneos de encerramento compartilham o MESMO trabalho (idempotência).
      const inflight = closing.get(id);
      if (inflight) return inflight;
      const job = (async (): Promise<StoreResult<CloseOutcome>> => {
        c.status = "closing"; // daqui em diante nenhuma mensagem nova entra
        c.pendingSince = null;
        const closedAt = now().toISOString();
        let transcript: string;
        try {
          transcript = buildTranscript(c, messages.get(id) ?? [], closedAt);
          await archive(c, transcript);
        } catch {
          return { ok: false, error: "archive_failed" }; // continua “closing”: pode tentar de novo
        }
        c.status = "closed";
        c.closedAt = closedAt;
        c.transcript = transcript;
        c.transcriptGeneratedAt = closedAt;
        return { ok: true, value: { conversation: { ...c }, transcript, alreadyClosed: false } };
      })();
      closing.set(id, job);
      try {
        return await job;
      } finally {
        closing.delete(id);
      }
    },

    async listMine(ownerId: string) {
      return [...conversations.values()]
        .filter((c) => c.ownerId === ownerId)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map((c) => ({
          id: c.id,
          status: c.status,
          startedAt: c.startedAt,
          closedAt: c.closedAt,
          messageCount: messages.get(c.id)?.length ?? 0,
          handoffRequested: c.handoffRequestedAt !== null,
        }));
    },

    async exportTranscript(ownerId: string, id: string): Promise<StoreResult<{ text: string; conversation: SupportConversation }>> {
      const c = own(ownerId, id);
      if (!c) return { ok: false, error: "not_found" };
      if (c.status !== "closed" || !c.transcript) return { ok: false, error: "closed" };
      return { ok: true, value: { text: c.transcript, conversation: { ...c } } };
    },

    _dump() {
      return { conversations: [...conversations.values()].map((c) => ({ ...c })), messages: [...messages.values()].flat().map((m) => ({ ...m })) };
    },

    /** Limpeza do adaptador de demonstração (não é política de retenção real). */
    purgeOwnersIdleSince(ms: number) {
      const limit = now().getTime() - ms;
      let n = 0;
      for (const c of [...conversations.values()]) {
        const last = messages.get(c.id)?.at(-1)?.createdAt ?? c.startedAt;
        if (Date.parse(last) < limit) {
          conversations.delete(c.id);
          messages.delete(c.id);
          n++;
        }
      }
      return n;
    },
  };
  return store;
}
