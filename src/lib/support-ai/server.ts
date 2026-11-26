import "server-only";
/**
 * Runtime do Assistente MVF no SERVIDOR: quem pode usar, qual repositório,
 * qual busca e qual modelo. Toda Server Action do chat passa por aqui.
 *
 * - Demo local: repositório em memória por aba (`demo:<id da aba>`), base do
 *   repositório (rascunhos rotulados) e modelo local — ou DeepSeek, só se o
 *   operador configurar a chave E ligar MVF_SUPPORT_AI_ENABLED.
 * - Conta real: só com MVF_SUPPORT_AI_ENABLED=true + MVF_SUPPORT_STORE=supabase
 *   (migration aplicada) + DeepSeek configurada + chave de serviço. Senão: indisponível.
 *   Nada de “IA de mentira” para alunas reais.
 */
import { getViewer } from "@/lib/auth/viewer";
import { can } from "@/lib/auth/permissions";
import { readConfig } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allRepoKnowledge, lessonHref } from "./base";
import { chatAvailability, readSupportConfig, remoteModelEnabled, type SupportConfig } from "./config";
import { createDeepSeekProvider } from "./deepseek";
import type { EngineDeps } from "./engine";
import { usableDocuments } from "./knowledge";
import { createLocalProvider } from "./local-provider";
import { createMemoryRetriever, type Retriever, type RetrievedChunk } from "./retrieval";
import { createMemoryStore, type Limits, type SupportStore } from "./store";
import { createSupabaseStore } from "./supabase-store";
import { SUMMARY_PROMPT, SYSTEM_PROMPT } from "./system-prompt";
import type { KnowledgeDocument } from "./types";

export type RuntimeError = "unauthenticated" | "forbidden" | "unavailable" | "invalid_tab";

export interface SupportRuntime {
  ownerId: string;
  ownerLabel: string;
  demo: boolean;
  store: SupportStore;
  limits: Limits;
  config: SupportConfig;
  engine: EngineDeps;
  providerLabel: string;
  /** Canal oficial verificado para encaminhamento humano (MVF_SUPPORT_CONTACT_URL), ou null. */
  contactUrl: string | null;
}

const TAB_RE = /^[0-9a-f-]{36}$/;
const IDLE_DEMO_MS = 2 * 60 * 60 * 1000;

// Singletons do processo (o adaptador de demonstração vive só na memória deste servidor).
const g = globalThis as unknown as {
  __mvfSupportMemory?: ReturnType<typeof createMemoryStore>;
  __mvfSupportDemoRetriever?: Retriever;
  __mvfSupportRate?: Map<string, number[]>;
};

function demoStore() {
  g.__mvfSupportMemory ??= createMemoryStore();
  g.__mvfSupportMemory.purgeOwnersIdleSince(IDLE_DEMO_MS);
  return g.__mvfSupportMemory;
}

function demoRetriever(): Retriever {
  g.__mvfSupportDemoRetriever ??= createMemoryRetriever(usableDocuments(allRepoKnowledge(), { includeDrafts: true, audience: "alunas" }));
  return g.__mvfSupportDemoRetriever;
}

/** Busca na base do banco (só documentos aprovados). */
function supabaseRetriever(service: ReturnType<typeof createSupabaseAdminClient>): Retriever {
  return {
    async search(query, opts = {}) {
      if (!service || !query.trim()) return [];
      const { data, error } = await service.rpc("support_search_knowledge", { p_query: query, p_limit: opts.limit ?? 4, p_include_drafts: false });
      if (error || !Array.isArray(data)) return [];
      return (data as { chunk_id: string; document_id: string; title: string; lesson_id: string | null; status: string; content: string; rank: number }[]).map(
        (r, ord): RetrievedChunk => {
          const doc: KnowledgeDocument = {
            id: r.document_id,
            title: r.title,
            origin: "banco",
            type: "material",
            ...(r.lesson_id ? { lessonId: r.lesson_id } : {}),
            version: 1,
            updatedAt: "2026-01-01",
            status: r.status as KnowledgeDocument["status"],
            access: "alunas",
            text: r.content,
          };
          return { chunk: { id: r.chunk_id, docId: r.document_id, ord, text: r.content, hash: "" }, doc, score: r.rank };
        },
      );
    },
  };
}

/** Limitador de frequência por usuária no processo (1ª barreira; o banco aplica os limites reais). */
export function rateLimited(ownerId: string, now = Date.now()): boolean {
  g.__mvfSupportRate ??= new Map();
  const list = (g.__mvfSupportRate.get(ownerId) ?? []).filter((t) => now - t < 60_000);
  if (list.length && now - list[list.length - 1] < 1_500) return true; // 1 envio a cada 1,5 s
  if (list.length >= 12) return true; // 12 por minuto
  list.push(now);
  g.__mvfSupportRate.set(ownerId, list);
  return false;
}

export async function getSupportRuntime(tabId: string | null): Promise<{ ok: true; runtime: SupportRuntime } | { ok: false; error: RuntimeError }> {
  const viewer = await getViewer();
  const config = readSupportConfig();
  const app = readConfig();
  const limits: Limits = {
    maxMessagesPerConversation: config.maxMessagesPerConversation,
    dailyMessagesPerUser: config.dailyMessagesPerUser,
    pendingStaleMs: config.timeoutMs * 2,
  };
  const remote = remoteModelEnabled(config);
  const provider = remote && config.deepseek
    ? createDeepSeekProvider({ ...config.deepseek, maxOutputTokens: config.maxOutputTokens })
    : createLocalProvider();
  const base = { systemPrompt: SYSTEM_PROMPT, summaryPrompt: SUMMARY_PROMPT, recentWindow: config.recentWindow, timeoutMs: config.timeoutMs, lessonHref };

  if (viewer.kind === "demo") {
    if (!tabId || !TAB_RE.test(tabId)) return { ok: false, error: "invalid_tab" };
    const store = demoStore();
    return {
      ok: true,
      runtime: {
        ownerId: `demo:${tabId}`,
        ownerLabel: "Aluna demo (demonstração)",
        demo: true,
        store,
        limits,
        config,
        engine: { ...base, store, provider, retriever: demoRetriever(), demo: true },
        providerLabel: provider.label,
        contactUrl: app.supportContactUrl,
      },
    };
  }
  if (viewer.kind === "anonymous" || viewer.kind === "unconfigured") return { ok: false, error: "unauthenticated" };
  if (viewer.kind !== "member") return { ok: false, error: "forbidden" };
  if (!chatAvailability(config, "member").available || !remote) return { ok: false, error: "unavailable" };
  const service = createSupabaseAdminClient();
  if (!service) return { ok: false, error: "unavailable" };
  const store = createSupabaseStore(await createSupabaseServerClient(), service);
  return {
    ok: true,
    runtime: {
      ownerId: viewer.userId,
      // Nome autorizado (o mesmo da saudação do app). Nunca e-mail.
      ownerLabel: (viewer.displayName ?? "").trim().slice(0, 120) || "Aluna",
      demo: false,
      store,
      limits,
      config,
      engine: { ...base, store, provider, retriever: supabaseRetriever(service), demo: false },
      providerLabel: provider.label,
      contactUrl: app.supportContactUrl,
    },
  };
}

/** O chat aparece para esta sessão? (decisão no servidor, para a página). */
export async function supportChatStatus(): Promise<{ available: boolean; demo: boolean; providerLabel: string }> {
  const viewer = await getViewer();
  const config = readSupportConfig();
  const label = remoteModelEnabled(config) ? "Assistente com IA (DeepSeek)" : "modelo local (sem IA)";
  if (viewer.kind === "demo") return { available: true, demo: true, providerLabel: label };
  if (viewer.kind !== "member") return { available: false, demo: false, providerLabel: label };
  const ok = chatAvailability(config, "member").available && remoteModelEnabled(config) && Boolean(readConfig().serviceRoleKey);
  return { available: ok, demo: false, providerLabel: label };
}

/* ------------------------------- Equipe ------------------------------- */

/**
 * Consulta de atendimentos pela equipe (admin/support). Autorização em DUAS camadas:
 * permissão do app aqui + função SQL que confere o papel e registra o acesso.
 * Ainda sem tela: será ligada ao painel de gestão real depois da ativação.
 */
export async function listConversationsForStaff(filters: { status?: string; from?: string; to?: string; idPrefix?: string; handoffOnly?: boolean } = {}) {
  const viewer = await getViewer();
  if (viewer.kind !== "member" || !can(viewer.roles, "support:history")) return { ok: false as const, error: "forbidden" as const };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("support_admin_list", {
    p_status: filters.status ?? null,
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_id_prefix: filters.idPrefix ?? null,
    p_handoff_only: filters.handoffOnly ?? false,
  });
  return error ? { ok: false as const, error: "unavailable" as const } : { ok: true as const, rows: data };
}

export async function getConversationForStaff(conversationId: string) {
  const viewer = await getViewer();
  if (viewer.kind !== "member" || !can(viewer.roles, "support:history")) return { ok: false as const, error: "forbidden" as const };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("support_admin_get", { p_conversation: conversationId });
  return error || !data ? { ok: false as const, error: "not_found" as const } : { ok: true as const, data };
}
