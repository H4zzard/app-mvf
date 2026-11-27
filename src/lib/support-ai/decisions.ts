/**
 * Decisões do SERVIDOR sobre a conversa (o modelo só sugere). Módulo puro, testado.
 *  - encerramento automático: só com confirmação EXPLÍCITA de resolução da aluna;
 *  - botões “Abrir aula”: só com id real, existente e permitido, validado aqui.
 */
import { normalize } from "../support/search.ts";
import { detectHandoff } from "./escalation.ts";
import type { RetrievedChunk } from "./retrieval.ts";
import type { ChatAction, SupportConversation, SupportMessage } from "./types.ts";

/* ------------------------------ Encerramento automático ------------------------------ */

const RESOLVED: RegExp[] = [
  /\b(deu|ja deu) certo\b/,
  /\b(consegui|conseguimos)( resolver| achar| encontrar| entrar| acessar| fazer)?\b/,
  /\b(resolvi|resolveu|resolvido|ta resolvido|esta resolvido)\b/,
  /\b(era|e) so isso\b/,
  /\bso isso (mesmo|obrigad[ao])\b/,
  /\bja (achei|encontrei|vi|entendi tudo)\b/,
  /\bachei[,! ]+(valeu|obrigad[ao])\b/,
  /\bfuncionou\b/,
];
const NEGATION = /\b(nao|nem|ainda nao|nunca)\s+(\w+\s+){0,2}(deu|consegui|resolvi|resolveu|funcionou|achei|encontrei)\b/;

export type AutoCloseDecision = { close: true; reason: "resolvido" } | { close: false; why: "not_explicit" | "negated" | "question" | "handoff_pending" | "too_early" };

/**
 * Encerrar sozinho? Só se a aluna confirmou que resolveu, sem pergunta nova,
 * sem negação e sem assunto da equipe pendente. “ok”, “obrigada” ou “valeu”
 * sozinhos NÃO encerram (podem ser só um aceno no meio da explicação).
 */
export function decideAutoClose(text: string, conversation: Pick<SupportConversation, "handoffRequestedAt">, history: SupportMessage[]): AutoCloseDecision {
  const t = normalize(text).replace(/\s+/g, " ").trim();
  if (history.filter((m) => m.sender === "student").length < 1) return { close: false, why: "too_early" };
  if (/\?/.test(text)) return { close: false, why: "question" };
  if (NEGATION.test(t)) return { close: false, why: "negated" };
  if (!RESOLVED.some((re) => re.test(t))) return { close: false, why: "not_explicit" };
  const recentStudent = history.filter((m) => m.sender === "student").slice(-4);
  if (conversation.handoffRequestedAt || recentStudent.some((m) => detectHandoff(m.content)) || detectHandoff(text)) {
    return { close: false, why: "handoff_pending" };
  }
  return { close: true, reason: "resolvido" };
}

/* ------------------------------ Botões de aula ------------------------------ */

const MARKER = /\[\[\s*aula\s*:\s*([a-z0-9][a-z0-9-]{1,80})\s*\]\]/gi;

/** Separa o texto conversacional dos marcadores de ação sugeridos pelo modelo. */
export function extractLessonMarkers(text: string): { text: string; lessonIds: string[] } {
  const ids = [...text.matchAll(MARKER)].map((m) => m[1].toLowerCase());
  const clean = text
    .replace(MARKER, "")
    .replace(/\[\[[^\]]*\]\]/g, "") // qualquer outro marcador desconhecido some
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text: clean, lessonIds: [...new Set(ids)] };
}

/**
 * Quando o servidor não mostrou nenhum botão, remove frases que dizem que ele existe
 * (“deixei o botão aqui embaixo”, “é só tocar no botão abaixo”). Nunca altera o resto.
 */
export function dropButtonClaims(text: string): string {
  const claim = /\b(bot[aã]o|aula|link)\b[^.!?\n]*\b(aqui embaixo|aqui abaixo|logo abaixo|abaixo|embaixo)\b|\bdeixei (o |a )?(bot[aã]o|aula|link)\b/i;
  return text
    .split("\n")
    .map((line) => line.split(/(?<=[.!?…])\s+/).filter((s) => !claim.test(s)).join(" "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A aluna está procurando uma aula/conteúdo? */
export function wantsLesson(text: string): boolean {
  return /\b(aula|aulas|modulo|modulos|video ?aula|assistir|onde (fica|encontro|acho|esta|tem)|nao (to|estou|tou) achando|achar|encontrar|qual aula|que aula|ensina)\b/.test(normalize(text));
}

export interface LessonInfo {
  title: string;
  moduleTitle: string | null;
  href: string;
}

/**
 * Monta os botões “Abrir aula”:
 *  1. ids sugeridos pelo modelo, se existirem e forem permitidos (máx. 3);
 *  2. senão, se a aluna procura aula, as aulas dos trechos recuperados —
 *     uma só quando a primeira é claramente a melhor; até 3 quando estão próximas.
 * `resolve` valida existência, disponibilidade e permissão (servidor).
 */
export function buildLessonActions(input: {
  modelLessonIds: string[];
  retrieved: RetrievedChunk[];
  studentText: string;
  resolve: (lessonId: string) => LessonInfo | null;
}): ChatAction[] {
  const toAction = (lessonId: string): ChatAction | null => {
    const info = input.resolve(lessonId);
    return info ? { type: "open_lesson", lessonId, title: info.title, moduleTitle: info.moduleTitle, href: info.href } : null;
  };
  const fromModel = input.modelLessonIds.map(toAction).filter((a): a is ChatAction => a !== null).slice(0, 3);
  if (fromModel.length) return fromModel;
  if (!wantsLesson(input.studentText)) return [];
  const lessons = input.retrieved.filter((r) => r.doc.lessonId);
  if (!lessons.length) return [];
  const [first, second] = lessons;
  const pool = second && second.score >= first.score * 0.62 ? lessons.slice(0, 3) : [first];
  const out: ChatAction[] = [];
  for (const r of pool) {
    const a = toAction(r.doc.lessonId!);
    if (a && !out.some((x) => x.lessonId === a.lessonId)) out.push(a);
  }
  return out;
}

/** O id pedido para abrir foi realmente oferecido nesta conversa? (impede abrir aula arbitrária pelo chat). */
export function lessonWasOffered(history: SupportMessage[], lessonId: string): boolean {
  return history.some((m) => m.sender === "assistant" && m.actions?.some((a) => a.type === "open_lesson" && a.lessonId === lessonId));
}
