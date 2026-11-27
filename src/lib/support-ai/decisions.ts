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

/**
 * Confirmações aceitas. Cada padrão precisa ser praticamente a mensagem INTEIRA:
 * depois de tirar o padrão e as palavras de cortesia, sobra no máximo uma palavra.
 * Assim “é só isso que aparece pra mim” ou “consegui entrar mas não acho a aula” não encerram.
 */
const CONFIRMATIONS: { re: RegExp; reason: "resolvido" | "manual" }[] = [
  { re: /\b(agora |ja |tudo )?deu (tudo )?certo\b/, reason: "resolvido" },
  { re: /\b(agora |ja )?(consegui|conseguimos)( resolver| achar| encontrar| entrar| acessar| fazer)?\b/, reason: "resolvido" },
  { re: /\b(ja |agora )?(resolvi|resolveu|resolvido|ta resolvido|esta resolvido|tudo resolvido)\b/, reason: "resolvido" },
  { re: /\b(era|e) so isso( mesmo)?\b|\bso isso( mesmo)?\b/, reason: "resolvido" },
  { re: /\b(agora |ja )?(achei|encontrei)( sim)?\b/, reason: "resolvido" },
  { re: /\b(agora |ja )?funcionou( sim)?\b/, reason: "resolvido" },
  { re: /\b(ta |esta )?tudo certo( agora)?\b/, reason: "resolvido" },
  { re: /\bpode (encerrar|finalizar|fechar)( o atendimento| a conversa)?\b/, reason: "manual" },
];

/** Palavras que não mudam o sentido de uma confirmação (cortesia, interjeições). */
const COURTESY = new Set(
  "obrigada obrigado obg obgd brigada brigado valeu vlw muito muita mt mto nina sim ah ahh ai ufa oba eba perfeito perfeita otimo otima show maravilha top beleza blz bom boa amei demais querida flor linda gracas deus a e ok okay oi aqui entao viu ta isso mesmo tb tambem ajuda pela pelo sua seu".split(" "),
);

/** Qualquer sinal de que ainda há problema ou dúvida bloqueia o encerramento. */
const BLOCKERS =
  /\b(nao|nem|nunca|ainda|mas|porem|entretanto|so que|parcial|parte|quase|metade|erro|errado|problema|travou|trava|continua|sumiu|nada|ninguem|duvida|talvez|acho que|vou tentar|tentando|depois|como|onde|qual|quando|por que|porque)\b/;

export type AutoCloseDecision =
  | { close: true; reason: "resolvido" | "manual" }
  | { close: false; why: "not_explicit" | "negated" | "question" | "handoff_pending" | "too_early" };

/**
 * Encerrar sozinho? Só se a mensagem inteira for uma confirmação clara (“Deu certo, obrigada!”,
 * “Agora achei”, “Pode encerrar”), sem pergunta, sem negação ou ressalva em nenhum ponto, e sem
 * assunto da equipe pendente. “ok”, “obrigada”, “vou tentar” ou “não” NUNCA encerram.
 * Quem decide é o servidor; uma resposta do modelo nunca encerra o atendimento.
 */
export function decideAutoClose(text: string, conversation: Pick<SupportConversation, "handoffRequestedAt">, history: SupportMessage[]): AutoCloseDecision {
  const t = normalize(text).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (history.filter((m) => m.sender === "student").length < 1) return { close: false, why: "too_early" };
  if (/\?/.test(text)) return { close: false, why: "question" };
  if (!t || t.split(" ").length > 12) return { close: false, why: "not_explicit" };
  if (BLOCKERS.test(t)) return { close: false, why: "negated" };
  const hit = CONFIRMATIONS.find(({ re }) => {
    const m = re.exec(t);
    if (!m) return false;
    const rest = `${t.slice(0, m.index)} ${t.slice(m.index + m[0].length)}`.split(" ").filter((w) => w && !COURTESY.has(w));
    return rest.length <= 1;
  });
  if (!hit) return { close: false, why: "not_explicit" };
  const recentStudent = history.filter((m) => m.sender === "student").slice(-4);
  if (conversation.handoffRequestedAt || recentStudent.some((m) => detectHandoff(m.content)) || detectHandoff(text)) {
    return { close: false, why: "handoff_pending" };
  }
  return { close: true, reason: hit.reason };
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

const STOP = new Set(
  "aula aulas como para pra pro por com sem uma umas uns que seu sua meu minha dos das nos nas pelo pela mais muito voce aqui onde qual quais esta este essa esse isso fazer faz tem ter ver vou ela ele the and nao sim tudo acho cade".split(" "),
);
const stems = (s: string) =>
  normalize(s)
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => w.slice(0, 5));

/** O título da aula tem pelo menos um termo forte em comum com a dúvida da aluna? */
export function titleMatches(title: string, studentText: string): boolean {
  const asked = new Set(stems(studentText));
  return stems(title).some((w) => asked.has(w));
}

/**
 * Monta os botões “Abrir aula” (o servidor decide; nada de chip aleatório):
 *  1. ids sugeridos pelo modelo, só se vieram nos trechos recuperados PARA ESTA PERGUNTA
 *     e forem permitidos (máx. 3);
 *  2. sem sugestão do modelo, no máximo UMA aula, e só se a aluna procura aula, a primeira
 *     é claramente a melhor e o título dela tem termo em comum com a dúvida.
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
  const retrievedIds = new Set(input.retrieved.map((r) => r.doc.lessonId).filter(Boolean));
  const fromModel = input.modelLessonIds
    .filter((id) => retrievedIds.has(id))
    .map(toAction)
    .filter((a): a is ChatAction => a !== null)
    .slice(0, 3);
  if (fromModel.length) return fromModel;
  if (!wantsLesson(input.studentText)) return [];
  const lessons = input.retrieved.filter((r) => r.doc.lessonId);
  const [first, second] = lessons;
  // Empate entre aulas diferentes = correspondência fraca: melhor não sugerir nenhuma.
  if (!first || (second && second.doc.lessonId !== first.doc.lessonId && second.score >= first.score * 0.62)) return [];
  const a = toAction(first.doc.lessonId!);
  return a && titleMatches(a.title, input.studentText) ? [a] : [];
}

/** O id pedido para abrir foi realmente oferecido nesta conversa? (impede abrir aula arbitrária pelo chat). */
export function lessonWasOffered(history: SupportMessage[], lessonId: string): boolean {
  return history.some((m) => m.sender === "assistant" && m.actions?.some((a) => a.type === "open_lesson" && a.lessonId === lessonId));
}
