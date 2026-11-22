/**
 * Regras da Comunidade. Módulo PURO (sem React, rede ou relógio).
 *
 * - Acesso às salas Elite+/Icon: na demo há só SIMULAÇÃO de plano, que nunca é
 *   autorização. O acesso real virá do servidor (permissões da aluna) e da RLS.
 * - Participação que vale XP: só publicações/comentários PUBLICADOS, com texto
 *   mínimo e sem repetição do mesmo texto (o mesmo conteúdo nunca conta duas vezes).
 */
import type { CommunityPost, CommunitySpace, PostKind, PostLink, SpaceId } from "../../demo/community.ts";
import { COMMUNITY_LIMITS, SPACES } from "../../demo/community.ts";

/** Plano usado para salas exclusivas. Na demo: escolhido na simulação. */
export type MemberTier = "padrao" | "Elite+" | "Icon";
export type SpaceAccess = "aberto" | "liberado" | "bloqueado";

export const TIER_LABEL: Record<MemberTier, string> = { padrao: "Plano padrão", "Elite+": "Elite+", Icon: "Icon" };

/**
 * Elite+ e Icon são salas independentes: não presumimos hierarquia entre os
 * planos (regra em aberto em docs/DECISOES.md).
 */
export function spaceAccess(space: CommunitySpace, tier: MemberTier): SpaceAccess {
  if (!space.restricted) return "aberto";
  return space.restricted === tier ? "liberado" : "bloqueado";
}

export function canPostInSpace(spaceId: SpaceId, tier: MemberTier = "padrao"): boolean {
  const space = SPACES.find((s) => s.id === spaceId);
  return Boolean(space?.studentsCanPost) && spaceAccess(space as CommunitySpace, tier) !== "bloqueado";
}

/** Espaços onde a aluna pode publicar agora. */
export const postableSpaces = (tier: MemberTier) => SPACES.filter((s) => canPostInSpace(s.id, tier));

/* ------------------------------ Modelos de publicação ------------------------------ */

export interface PostTemplate {
  kind: PostKind;
  label: string;
  /** Espaço sugerido ao escolher o modelo. */
  space: SpaceId;
  /** Texto-guia com colchetes: a aluna substitui pelo que viveu. */
  scaffold: string;
  hint: string;
  /** Sugerir vínculo com aula ou desafio. */
  suggestLink?: PostLink["kind"];
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    kind: "duvida",
    label: "Dúvida",
    space: "duvidas",
    scaffold: "Estou na aula/etapa [qual] e não entendi [o quê]. Já tentei [o que você fez]. Alguém pode me ajudar?",
    hint: "Diga onde travou e o que já tentou: fica mais fácil ajudar.",
    suggestLink: "aula",
  },
  {
    kind: "conquista",
    label: "Conquista",
    space: "mural",
    scaffold: "Marco do dia: [o que você conseguiu fazer]. O que mais me ajudou foi [dica].",
    hint: "Comemore marcos de processo (primeiro vídeo, rotina, desafio). Não publique valores de vendas.",
    suggestLink: "desafio",
  },
  {
    kind: "aprendizado",
    label: "Aprendizado",
    space: "bastidores",
    scaffold: "Aprendi [o quê] na aula [qual]. Na prática, isso mudou [como você grava/edita/organiza].",
    hint: "Conte o que aprendeu e como aplicou.",
    suggestLink: "aula",
  },
  {
    kind: "experiencia",
    label: "Experiência",
    space: "bastidores",
    scaffold: "Testei [formato/ferramenta] e percebi que [o que funcionou ou não]. Próximo passo: [o que vai tentar].",
    hint: "Compartilhe bastidores reais, sem prometer resultado.",
  },
];

export const KIND_LABEL: Record<PostKind, string> = {
  conversa: "Conversa",
  duvida: "Dúvida",
  conquista: "Conquista",
  aprendizado: "Aprendizado",
  experiencia: "Experiência",
};

/** O modelo ainda tem colchetes não preenchidos? */
export const hasPlaceholders = (body: string) => /\[[^\]]{1,60}\]/.test(body);

/** Valores de venda/ganho: a comunidade não divulga resultados financeiros. */
const MONEY = /R\$\s?\d|\b\d+[.,]?\d*\s?(mil|k)\s?(em vendas|de vendas|de comiss)|fatur(ei|amento|ou)|lucr(ei|o de)|ganhei\s+(r\$|\d)|comiss(ão|ao|ões|oes)\s+de\s+(r\$|\d)/i;

export interface PostDraft {
  spaceId: SpaceId;
  body: string;
  kind?: PostKind;
  link?: PostLink | null;
}

export interface DraftCheck {
  errors: Partial<Record<"body" | "space", string>>;
  warnings: string[];
}

export function checkPostDraft(d: PostDraft, tier: MemberTier = "padrao"): DraftCheck {
  const errors: DraftCheck["errors"] = {};
  const warnings: string[] = [];
  const text = d.body.trim();
  if (!text) errors.body = "Escreva alguma coisa antes de publicar.";
  else if (text.length < COMMUNITY_LIMITS.minPostLength) errors.body = `Escreva pelo menos ${COMMUNITY_LIMITS.minPostLength} caracteres.`;
  else if (d.body.length > COMMUNITY_LIMITS.maxPostLength) errors.body = `Use até ${COMMUNITY_LIMITS.maxPostLength} caracteres.`;
  else if (hasPlaceholders(text)) errors.body = "Troque os trechos entre colchetes pelo que você viveu.";
  if (!canPostInSpace(d.spaceId, tier)) errors.space = "Escolha um espaço em que você pode publicar.";
  if (MONEY.test(text)) warnings.push("Evite valores de vendas, comissões ou ganhos: a comunidade compartilha processo e aprendizado, não resultados financeiros.");
  return { errors, warnings };
}

/* ------------------------------------ Denúncias ------------------------------------ */

export type ReportReason = "spam" | "ofensivo" | "promessa" | "dados_pessoais" | "outro";

export const REPORT_REASONS: { id: ReportReason; label: string; description: string }[] = [
  { id: "spam", label: "Spam ou divulgação", description: "Propaganda, links repetidos ou fora do tema." },
  { id: "ofensivo", label: "Desrespeito ou ofensa", description: "Ataques, preconceito ou linguagem agressiva." },
  { id: "promessa", label: "Promessa de ganho ou informação falsa", description: "Resultados garantidos, valores ou regras inventadas." },
  { id: "dados_pessoais", label: "Dados pessoais expostos", description: "Telefone, documento, endereço ou dados de outra pessoa." },
  { id: "outro", label: "Outro motivo", description: "Explique na observação." },
];

/* ------------------------------------ Busca e filtros ------------------------------------ */

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export interface FeedFilters {
  space: SpaceId | "todos";
  kind: PostKind | "todos";
  query: string;
}

/**
 * Feed visível: respeita o espaço, o tipo e a busca; nunca mostra salas
 * bloqueadas em “Todos” nem publicações ocultas pela moderação (exceto para a autora).
 */
export function visibleFeed(posts: CommunityPost[], f: FeedFilters, tier: MemberTier): CommunityPost[] {
  const terms = norm(f.query).split(/\s+/).filter(Boolean);
  return posts.filter((p) => {
    const space = SPACES.find((s) => s.id === p.spaceId);
    if (!space) return false;
    if (f.space === "todos" ? Boolean(space.restricted) : p.spaceId !== f.space) return false;
    if (spaceAccess(space, tier) === "bloqueado") return false;
    if (p.status === "oculta" && !p.author.isMe) return false;
    if (f.kind !== "todos" && (p.kind ?? "conversa") !== f.kind) return false;
    if (!terms.length) return true;
    const hay = norm([p.body, p.author.name, ...p.comments.filter((c) => !c.hidden).map((c) => c.body)].join(" "));
    return terms.every((t) => hay.includes(t));
  });
}

/* ------------------------------ Participação (XP) ------------------------------ */

/**
 * Quantas participações VALEM para XP e missões: publicações e comentários
 * da aluna, publicados, com texto mínimo e sem textos repetidos.
 */
export function participationCounts(posts: CommunityPost[]): { posts: number; comments: number } {
  const postBodies = new Set<string>();
  const commentBodies = new Set<string>();
  for (const p of posts) {
    if (p.author.isMe && p.status !== "oculta" && p.body.trim().length >= COMMUNITY_LIMITS.minPostLength) postBodies.add(norm(p.body).replace(/\s+/g, " ").trim());
    for (const c of p.comments) {
      if (c.author.isMe && !c.hidden && c.body.trim().length >= COMMUNITY_LIMITS.minCommentLength) commentBodies.add(norm(c.body).replace(/\s+/g, " ").trim());
    }
  }
  return { posts: postBodies.size, comments: commentBodies.size };
}

/* --------------------------------- Contratos de denúncia --------------------------------- */

export type ReportStatus = "pendente" | "mantida" | "ocultada";

/** Denúncia registrada (na demo, só no estado local; futuro: tabela com RLS). */
export interface CommunityReport {
  id: string;
  target: { postId: string; commentId?: string };
  reason: ReportReason;
  note: string;
  status: ReportStatus;
}

export const isReportReason = (v: unknown): v is ReportReason => REPORT_REASONS.some((r) => r.id === v);

/** Papel visualizado na demo. “moderacao” é SIMULAÇÃO: o papel real vem de `user_roles`. */
export type CommunityViewAs = "aluna" | "moderacao";
export const rolesForViewAs = (v: CommunityViewAs) => (v === "moderacao" ? (["moderator"] as const) : (["student"] as const));
