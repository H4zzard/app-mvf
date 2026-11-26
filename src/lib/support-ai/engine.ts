/**
 * Orquestração de uma resposta do Assistente (usado só pelo servidor).
 *
 * mensagem da aluna (já gravada) → recuperação → resumo se preciso → contexto →
 * modelo com timeout → grava a resposta com as fontes. Falhas não inventam
 * resposta: liberam a pendência e devolvem o erro para a interface. Módulo puro
 * (dependências injetadas), testável.
 */
import { buildTurns, needsSummary, retrievalQuery, sourcesOf } from "./context.ts";
import { detectHandoff, type HandoffTopic } from "./escalation.ts";
import type { Retriever } from "./retrieval.ts";
import type { SupportStore } from "./store.ts";
import type { ProviderErrorCode, SupportMessage, SupportProvider } from "./types.ts";

export interface EngineDeps {
  store: SupportStore;
  provider: SupportProvider;
  retriever: Retriever;
  systemPrompt: string;
  summaryPrompt: string;
  recentWindow: number;
  timeoutMs: number;
  /** Link interno de uma aula EXISTENTE no catálogo (ou null). */
  lessonHref: (lessonId: string) => string | null;
  /** Modo demonstração (mostra rascunhos rotulados). */
  demo: boolean;
}

export type ReplyResult =
  | { ok: true; message: SupportMessage; handoff: HandoffTopic | null }
  | { ok: false; error: ProviderErrorCode | "not_found" | "closed" | "nothing_to_answer" };

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>, onTimeout: T): Promise<T> {
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      ctrl.abort();
      resolve(onTimeout);
    }, ms);
  });
  try {
    return await Promise.race([fn(ctrl.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Remove marcadores internos que o modelo possa ter ecoado. */
export function cleanReply(text: string): string {
  return text
    .replace(/<\s*\/?\s*(base_mvf|resumo_da_conversa|system)[^>]*>/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

export async function generateReply(deps: EngineDeps, ownerId: string, conversationId: string): Promise<ReplyResult> {
  const found = await deps.store.get(ownerId, conversationId);
  if (!found) return { ok: false, error: "not_found" };
  const { conversation, messages } = found;
  if (conversation.status !== "open") return { ok: false, error: "closed" };
  const lastStudent = [...messages].reverse().find((m) => m.sender === "student");
  const lastMessage = messages.at(-1);
  if (!lastStudent || lastMessage?.sender !== "student") {
    await deps.store.releasePending(conversationId);
    return { ok: false, error: "nothing_to_answer" };
  }

  // Só trechos realmente próximos da pergunta (≥ metade da relevância do melhor), no máximo 3:
  // menos ruído para o modelo e fontes honestas na interface.
  const hits = await deps.retriever.search(retrievalQuery(messages), { limit: 4 });
  const retrieved = hits.filter((r) => r.score >= (hits[0]?.score ?? 0) * 0.5).slice(0, 3);

  // Memória: resume o que saiu da janela recente (custo controlado, sem reenviar tudo).
  let summary = conversation.summary;
  if (needsSummary(messages, conversation.summaryUpToSeq, deps.recentWindow)) {
    const convo = messages.filter((m) => m.sender !== "system");
    const older = convo.slice(0, convo.length - deps.recentWindow);
    const text = older.map((m) => `${m.sender === "student" ? "Aluna" : "Assistente"}: ${m.content}`).join("\n");
    const res = await withTimeout(
      deps.timeoutMs,
      (signal) =>
        deps.provider.complete(
          [
            { role: "system", content: deps.summaryPrompt },
            { role: "user", content: `${summary ? `Resumo anterior:\n${summary}\n\n` : ""}Conversa:\n${text}` },
          ],
          { userKey: ownerId, signal },
        ),
      { ok: false as const, error: "timeout" as const },
    );
    if (res.ok && deps.provider.kind === "deepseek") {
      summary = cleanReply(res.text);
      await deps.store.setSummary(conversationId, summary, older.at(-1)!.seq);
    } else if (deps.provider.kind === "local") {
      // Resumo extrativo do modelo local: o que a aluna disse antes (sem inventar).
      summary = older.filter((m) => m.sender === "student").map((m) => `- A aluna disse: ${m.content.slice(0, 160)}`).slice(-6).join("\n");
      await deps.store.setSummary(conversationId, summary, older.at(-1)!.seq);
    }
  }

  const turns = buildTurns({ systemPrompt: deps.systemPrompt, summary, history: messages, retrieved, recentWindow: deps.recentWindow });
  const res = await withTimeout(deps.timeoutMs, (signal) => deps.provider.complete(turns, { userKey: ownerId, signal }), {
    ok: false as const,
    error: "timeout" as const,
  });
  if (!res.ok) {
    await deps.store.releasePending(conversationId);
    return { ok: false, error: res.error };
  }
  const text = cleanReply(res.text);
  if (!text) {
    await deps.store.releasePending(conversationId);
    return { ok: false, error: "invalid" };
  }
  // Assunto da equipe: a resposta é de encaminhamento, não da base — sem fontes para não sugerir o contrário.
  const handoff = detectHandoff(lastStudent.content);
  const saved = await deps.store.appendAssistant(conversationId, text, handoff ? [] : sourcesOf(retrieved, deps.lessonHref, deps.demo));
  if (!saved.ok) return { ok: false, error: saved.error === "closed" ? "closed" : "not_found" };
  return { ok: true, message: saved.value, handoff };
}
