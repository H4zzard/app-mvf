/**
 * Orquestração de uma resposta do Assistente (usado só pelo servidor).
 *
 * mensagem da aluna (já gravada) → recuperação → resumo se preciso → contexto →
 * modelo com timeout → grava a resposta com as fontes. Falhas não inventam
 * resposta: liberam a pendência e devolvem o erro para a interface. Módulo puro
 * (dependências injetadas), testável.
 */
import { buildTurns, needsSummary, retrievalQuery, sourcesOf } from "./context.ts";
import { buildLessonActions, dropButtonClaims, extractLessonMarkers, type LessonInfo } from "./decisions.ts";
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
  /** Valida aula para botão: existe, está disponível e a sessão pode abrir (servidor). */
  resolveLesson: (lessonId: string) => LessonInfo | null;
  /** Registro técnico mínimo (sem conteúdo). */
  log?: (line: string) => void;
  /** Existe canal humano oficial configurado? (a Nina não promete contato quando não existe). */
  humanChannel?: boolean;
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

/** Remove marcadores internos que o modelo possa ter ecoado (os de ação são tratados à parte). */
export function cleanReply(text: string): string {
  return text
    .replace(/<\s*\/?\s*(base_mvf|resumo_da_conversa|system)[^>]*>/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1") // o chat não formata markdown
    .replace(/\s+[—–]\s+/g, ", ") // travessão vira vírgula (estilo da Nina)
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
  // Fatos do sistema que a Nina precisa saber para não prometer o que não existe.
  turns.splice(1, 0, {
    role: "system",
    content: `<contexto_sistema>\n${
      deps.humanChannel
        ? "Canal humano oficial: configurado. Ao tocar em Falar com a equipe, o app mostra o link do canal oficial."
        : "Canal humano oficial: AINDA NÃO EXISTE. O botão Falar com a equipe só registra o pedido no atendimento. Não diga que a aluna vai falar com uma pessoa, que a equipe vai ajudar ou responder, nem que algo foi encaminhado. Diga que os canais oficiais ainda vão ser divulgados pela equipe."
    }\n</contexto_sistema>`,
  });
  const started = Date.now();
  const res = await withTimeout(deps.timeoutMs, (signal) => deps.provider.complete(turns, { userKey: ownerId, signal }), {
    ok: false as const,
    error: "timeout" as const,
  });
  deps.log?.(
    `[nina] provedor=${deps.provider.kind}${deps.provider.model ? ` modelo=${deps.provider.model}` : ""} status=${res.ok ? "ok" : res.error} ms=${Date.now() - started}${res.ok && res.usage ? ` tokens=${res.usage.input}/${res.usage.output}` : ""}`,
  );
  if (!res.ok) {
    await deps.store.releasePending(conversationId);
    return { ok: false, error: res.error };
  }
  const { text: withoutMarkers, lessonIds } = extractLessonMarkers(res.text);
  const draftText = cleanReply(withoutMarkers);
  if (!draftText) {
    await deps.store.releasePending(conversationId);
    return { ok: false, error: "invalid" };
  }
  // Assunto da equipe: a resposta é de encaminhamento, não da base — sem fontes para não sugerir o contrário.
  const handoff = detectHandoff(lastStudent.content);
  // Botões: o servidor valida cada id (existe, disponível, permitido). Assunto da equipe não leva botão de aula.
  const actions = handoff ? [] : buildLessonActions({ modelLessonIds: lessonIds, retrieved, studentText: lastStudent.content, resolve: deps.resolveLesson });
  // Sem botão validado, a resposta não pode dizer que deixou um botão.
  const text = actions.length ? draftText : dropButtonClaims(draftText) || draftText;
  const saved = await deps.store.appendAssistant(conversationId, text, {
    sources: handoff ? [] : sourcesOf(retrieved, deps.lessonHref, deps.demo),
    actions,
    meta: {
      provider: deps.provider.kind,
      ...(deps.provider.model ? { model: res.model ?? deps.provider.model } : {}),
      ...(res.usage ? { tokensIn: res.usage.input, tokensOut: res.usage.output } : {}),
    },
  });
  if (!saved.ok) return { ok: false, error: saved.error === "closed" ? "closed" : "not_found" };
  return { ok: true, message: saved.value, handoff };
}
