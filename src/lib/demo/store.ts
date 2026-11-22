/**
 * Estado da DEMONSTRAÇÃO dos módulos (aulas fora do plano, favoritos,
 * comunidade, agenda, Estúdio IA, desafios). Redutor PURO e determinístico:
 * sem React, sem relógio, sem rede, sem armazenamento. Vive só em memória no
 * modo demo local e some ao recarregar (ver CLAUDE.md, proibição 4).
 *
 * O progresso do PLANO continua no PlanProvider (store único do plano).
 */
import type { CommunityPost, SpaceId } from "../../demo/community.ts";
import type { PostKind, PostLink } from "../../demo/community.ts";
import { COMMUNITY_LIMITS, SEED_POSTS } from "../../demo/community.ts";
import { canPostInSpace, isReportReason, type CommunityReport, type CommunityViewAs, type MemberTier, type ReportReason } from "../community/rules.ts";
import { TICKET_LIMITS, isTicketCategory, validateTicket, type SupportTicket, type TicketDraft } from "../support/tickets.ts";
import type { CharacterSheet } from "../studio/contracts.ts";
import type { StudioDrafts, StudioTool } from "../studio/drafts.ts";
import type { RecordingStyle } from "../studio/contracts.ts";
import type { StudioProductSeed } from "../products/studio-bridge.ts";

export type FavoriteKind = "virals" | "products" | "templates" | "materials";

export interface SavedPrompt {
  id: string;
  title: string;
  text: string;
}

/**
 * Semente para o Estúdio IA (ex.: “Usar no Estúdio” a partir de Virais/Marketplace,
 * ou “Usar no Animador” a partir de uma ficha). Consumida uma vez pela ferramenta
 * indicada em `target`. `hook` é só INSPIRAÇÃO exibida: nunca vira fala sozinho.
 */
export interface StudioSeed {
  from: string;
  target?: StudioTool;
  hook?: string;
  productName?: string;
  productCategory?: string;
  characterId?: string;
  format?: "avatar" | "maos_produto";
  /** Produto do catálogo (Marketplace): só o que está cadastrado, nada comercial. */
  product?: StudioProductSeed;
  /** Estilo de vídeo escolhido antes de abrir os Roteiros (a aluna pode trocar). */
  style?: RecordingStyle;
}

export interface DemoState {
  /** Aulas marcadas como concluídas na biblioteca (as do plano também refletem no plano). */
  lessonsDone: string[];
  favorites: Record<FavoriteKind, string[]>;
  posts: CommunityPost[];
  likes: string[];
  rsvps: string[];
  prompts: { generated: number; copied: number; saved: SavedPrompt[] };
  challengesClaimed: string[];
  /** Missões em que a aluna entrou → valor da métrica na adesão (linha de base). */
  missionsJoined: Record<string, number>;
  /** Recompensas resgatadas na simulação (uma vez cada). */
  rewardsRedeemed: string[];
  /** Histórico de resgates (XP de desafios e recompensas), mais recente primeiro. */
  history: HistoryEntry[];
  supportRequests: number;
  /**
   * Comunidade — SIMULAÇÃO da demo (nunca autorização): plano para as salas
   * exclusivas e papel visualizado (aluna ou moderação). O real vem do servidor.
   */
  communitySim: { tier: MemberTier; viewAs: CommunityViewAs };
  /** Denúncias registradas só nesta sessão (nada é enviado à equipe). */
  reports: CommunityReport[];
  /** Solicitações de suporte: rascunho ou simulação (nada é enviado). */
  supportTickets: SupportTicket[];
  /**
   * “Meus produtos”: produtos que a aluna QUER DIVULGAR (lista pessoal na demo).
   * Não significa afiliação efetivada no TikTok Shop. Mais recente primeiro.
   * Os SALVOS (coração) continuam em `favorites.products`.
   */
  productsPromoting: string[];
  studioSeed: StudioSeed | null;
  /** Fichas de personagem salvas no Estúdio (demo, em memória). */
  studioCharacters: CharacterSheet[];
  /** Rascunhos das três ferramentas do Estúdio (demo, em memória). */
  studioDrafts: StudioDrafts;
  /** Contador para IDs determinísticos de itens criados na sessão. */
  seq: number;
}

export interface HistoryEntry {
  id: string;
  kind: "desafio" | "recompensa";
  label: string;
  /** XP ganho (desafio) ou pontos usados (recompensa). */
  points: number;
}

export const STUDIO_MAX_CHARACTERS = 20;
/** Limite de “Meus produtos” na demo. */
export const MY_PRODUCTS_MAX = 30;

export const ME = { name: "Você", initials: "EU", isMe: true } as const;

export function initialDemoState(overrides: Partial<DemoState> = {}): DemoState {
  return {
    lessonsDone: [],
    favorites: { virals: [], products: [], templates: [], materials: [] },
    posts: SEED_POSTS.map((p) => ({ ...p, comments: [...p.comments] })),
    likes: [],
    rsvps: [],
    prompts: { generated: 0, copied: 0, saved: [] },
    challengesClaimed: [],
    missionsJoined: {},
    rewardsRedeemed: [],
    history: [],
    supportRequests: 0,
    communitySim: { tier: "padrao", viewAs: "aluna" },
    reports: [],
    supportTickets: [],
    productsPromoting: [],
    studioSeed: null,
    studioCharacters: [],
    studioDrafts: {},
    seq: 0,
    ...overrides,
  };
}

export type DemoAction =
  | { type: "lesson/set"; lessonId: string; done: boolean }
  | { type: "favorite/toggle"; kind: FavoriteKind; id: string }
  | { type: "post/add"; spaceId: SpaceId; body: string; kind?: PostKind; link?: PostLink | null }
  | { type: "post/edit"; postId: string; body: string; link?: PostLink | null }
  | { type: "post/delete"; postId: string }
  | { type: "post/like"; postId: string }
  | { type: "comment/add"; postId: string; body: string }
  | { type: "comment/delete"; postId: string; commentId: string }
  | { type: "rsvp/toggle"; eventId: string }
  | { type: "prompt/generated" }
  | { type: "prompt/copied" }
  | { type: "prompt/save"; title: string; text: string }
  | { type: "prompt/remove"; id: string }
  | { type: "challenge/claim"; challengeId: string; eligible: boolean; label?: string; xp?: number }
  | { type: "mission/join"; missionId: string; baseline: number }
  | { type: "reward/redeem"; rewardId: string; label: string; cost: number; balance: number }
  | { type: "support/send" }
  | { type: "community/sim"; tier?: MemberTier; viewAs?: CommunityViewAs }
  | { type: "report/add"; target: { postId: string; commentId?: string }; reason: ReportReason; note: string }
  | { type: "report/resolve"; reportId: string; decision: "manter" | "ocultar" }
  | { type: "ticket/save"; id?: string; draft: TicketDraft }
  | { type: "ticket/simulate"; id: string }
  | { type: "ticket/delete"; id: string }
  | { type: "product/promote"; id: string; on: boolean }
  | { type: "studio/seed"; seed: StudioSeed | null }
  | { type: "studio/draft"; draft: StudioDrafts }
  | { type: "studio/character-save"; sheet: CharacterSheet }
  | { type: "studio/character-remove"; id: string }
  | { type: "reset"; state: DemoState };

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export function cleanText(raw: string, max: number): string | null {
  const text = raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  return text.length === 0 || text.length > max ? null : text;
}

/** Pode publicar neste espaço? (salas exclusivas dependem do plano — na demo, simulado). */
export function canPostIn(spaceId: SpaceId, tier: MemberTier = "padrao"): boolean {
  return canPostInSpace(spaceId, tier);
}

const normBody = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const LINK_ID = /^[a-z0-9-]{1,60}$/;
const validLink = (l: PostLink | null | undefined): PostLink | undefined =>
  l && (l.kind === "aula" || l.kind === "desafio") && LINK_ID.test(l.id) ? { kind: l.kind, id: l.id } : undefined;

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "lesson/set": {
      const has = state.lessonsDone.includes(action.lessonId);
      if (has === action.done) return state;
      return {
        ...state,
        lessonsDone: action.done ? [...state.lessonsDone, action.lessonId] : state.lessonsDone.filter((x) => x !== action.lessonId),
      };
    }
    case "favorite/toggle":
      return { ...state, favorites: { ...state.favorites, [action.kind]: toggle(state.favorites[action.kind], action.id) } };
    case "product/promote": {
      const has = state.productsPromoting.includes(action.id);
      if (has === action.on || !/^[a-z0-9-]{1,60}$/.test(action.id)) return state;
      if (action.on && state.productsPromoting.length >= MY_PRODUCTS_MAX) return state;
      return {
        ...state,
        productsPromoting: action.on ? [action.id, ...state.productsPromoting] : state.productsPromoting.filter((x) => x !== action.id),
      };
    }
    case "post/add": {
      const body = cleanText(action.body, COMMUNITY_LIMITS.maxPostLength);
      if (!body || body.length < COMMUNITY_LIMITS.minPostLength || !canPostIn(action.spaceId, state.communitySim.tier)) return state;
      // Mesmo texto publicado de novo não vira outra publicação (nem outro XP).
      if (state.posts.some((p) => p.author.isMe && normBody(p.body) === normBody(body))) return state;
      const seq = state.seq + 1;
      const link = validLink(action.link);
      const kind = action.kind && action.kind !== "conversa" ? action.kind : undefined;
      const post: CommunityPost = { id: `meu-post-${seq}`, spaceId: action.spaceId, author: { ...ME }, body, baseLikes: 0, comments: [], ...(kind ? { kind } : {}), ...(link ? { link } : {}) };
      return { ...state, seq, posts: [post, ...state.posts] };
    }
    case "post/edit": {
      const body = cleanText(action.body, COMMUNITY_LIMITS.maxPostLength);
      if (!body || body.length < COMMUNITY_LIMITS.minPostLength) return state;
      let changed = false;
      const posts = state.posts.map((p) => {
        if (p.id !== action.postId || !p.author.isMe) return p;
        const link = action.link === undefined ? p.link : validLink(action.link);
        if (p.body === body && JSON.stringify(link) === JSON.stringify(p.link)) return p;
        // Editar para um texto igual a outra publicação sua não é permitido (anti-duplicação).
        if (state.posts.some((o) => o.id !== p.id && o.author.isMe && normBody(o.body) === normBody(body))) return p;
        changed = true;
        const { link: _old, ...rest } = p;
        void _old;
        return { ...rest, body, edited: true, ...(link ? { link } : {}) };
      });
      return changed ? { ...state, posts } : state;
    }
    case "post/delete": {
      const target = state.posts.find((p) => p.id === action.postId);
      if (!target?.author.isMe) return state;
      return { ...state, posts: state.posts.filter((p) => p.id !== action.postId), likes: state.likes.filter((id) => id !== action.postId) };
    }
    case "post/like":
      if (!state.posts.some((p) => p.id === action.postId)) return state;
      return { ...state, likes: toggle(state.likes, action.postId) };
    case "comment/add": {
      const body = cleanText(action.body, COMMUNITY_LIMITS.maxCommentLength);
      const target = state.posts.find((p) => p.id === action.postId);
      if (!body || body.length < COMMUNITY_LIMITS.minCommentLength || !target || (target.status === "oculta" && !target.author.isMe)) return state;
      const seq = state.seq + 1;
      return {
        ...state,
        seq,
        posts: state.posts.map((p) =>
          p.id === action.postId ? { ...p, comments: [...p.comments, { id: `meu-comentario-${seq}`, author: { ...ME }, body }] } : p,
        ),
      };
    }
    case "comment/delete":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.postId ? { ...p, comments: p.comments.filter((c) => !(c.id === action.commentId && c.author.isMe)) } : p,
        ),
      };
    case "rsvp/toggle":
      return { ...state, rsvps: toggle(state.rsvps, action.eventId) };
    case "prompt/generated":
      return { ...state, prompts: { ...state.prompts, generated: state.prompts.generated + 1 } };
    case "prompt/copied":
      return { ...state, prompts: { ...state.prompts, copied: state.prompts.copied + 1 } };
    case "prompt/save": {
      if (state.prompts.saved.some((s) => s.text === action.text)) return state;
      const seq = state.seq + 1;
      return {
        ...state,
        seq,
        prompts: { ...state.prompts, saved: [{ id: `prompt-${seq}`, title: action.title, text: action.text }, ...state.prompts.saved] },
      };
    }
    case "prompt/remove":
      return { ...state, prompts: { ...state.prompts, saved: state.prompts.saved.filter((s) => s.id !== action.id) } };
    case "challenge/claim": {
      if (!action.eligible || state.challengesClaimed.includes(action.challengeId)) return state;
      const seq = state.seq + 1;
      return {
        ...state,
        seq,
        challengesClaimed: [...state.challengesClaimed, action.challengeId],
        history: action.label
          ? [{ id: `h-${seq}`, kind: "desafio", label: action.label, points: action.xp ?? 0 }, ...state.history]
          : state.history,
      };
    }
    case "mission/join":
      if (action.missionId in state.missionsJoined || state.challengesClaimed.includes(action.missionId)) return state;
      return { ...state, missionsJoined: { ...state.missionsJoined, [action.missionId]: action.baseline } };
    case "reward/redeem": {
      if (state.rewardsRedeemed.includes(action.rewardId) || action.balance < action.cost) return state;
      const seq = state.seq + 1;
      return {
        ...state,
        seq,
        rewardsRedeemed: [...state.rewardsRedeemed, action.rewardId],
        history: [{ id: `h-${seq}`, kind: "recompensa", label: action.label, points: action.cost }, ...state.history],
      };
    }
    case "support/send":
      return { ...state, supportRequests: state.supportRequests + 1 };
    case "community/sim": {
      const tier = action.tier ?? state.communitySim.tier;
      const viewAs = action.viewAs ?? state.communitySim.viewAs;
      if (tier === state.communitySim.tier && viewAs === state.communitySim.viewAs) return state;
      return { ...state, communitySim: { tier, viewAs } };
    }
    case "report/add": {
      const { postId, commentId } = action.target;
      const post = state.posts.find((p) => p.id === postId);
      if (!post || !isReportReason(action.reason)) return state;
      const comment = commentId ? post.comments.find((c) => c.id === commentId) : undefined;
      if (commentId ? !comment || comment.author.isMe : post.author.isMe) return state; // não denuncia o próprio conteúdo
      if (state.reports.some((r) => r.target.postId === postId && r.target.commentId === commentId)) return state; // uma vez por item
      const note = action.note.trim() ? cleanText(action.note, COMMUNITY_LIMITS.maxReportNote) : "";
      if (note === null) return state;
      if (action.reason === "outro" && !note) return state;
      const seq = state.seq + 1;
      const report: CommunityReport = { id: `denuncia-${seq}`, target: commentId ? { postId, commentId } : { postId }, reason: action.reason, note, status: "pendente" };
      return { ...state, seq, reports: [report, ...state.reports] };
    }
    case "report/resolve": {
      // Só no papel de moderação (SIMULADO na demo; no real, permissão community:moderate no servidor).
      if (state.communitySim.viewAs !== "moderacao") return state;
      const report = state.reports.find((r) => r.id === action.reportId && r.status === "pendente");
      if (!report) return state;
      const status: CommunityReport["status"] = action.decision === "ocultar" ? "ocultada" : "mantida";
      const reports = state.reports.map((r) => (r.id === report.id ? { ...r, status } : r));
      if (action.decision === "manter") return { ...state, reports };
      const posts = state.posts.map((p) => {
        if (p.id !== report.target.postId) return p;
        if (!report.target.commentId) return { ...p, status: "oculta" as const };
        return { ...p, comments: p.comments.map((c) => (c.id === report.target.commentId ? { ...c, hidden: true } : c)) };
      });
      return { ...state, reports, posts };
    }
    case "ticket/save": {
      const d = action.draft;
      const subject = d.subject.replace(/\s+/g, " ").trim();
      const description = d.description.replace(/\r\n/g, "\n").trim();
      // Rascunho aceita texto incompleto, mas nunca dados sensíveis nem tamanho acima do limite.
      const errs = validateTicket({ subject, category: d.category, description });
      const blocking = [errs.subject, errs.description].some((m) => m?.startsWith("Remova") || m?.startsWith("Use até"));
      if (blocking || !isTicketCategory(d.category) || (!subject && !description)) return state;
      if (action.id) {
        const current = state.supportTickets.find((t) => t.id === action.id);
        if (!current || current.status !== "rascunho") return state;
        return { ...state, supportTickets: state.supportTickets.map((t) => (t.id === action.id ? { ...t, subject, category: d.category as SupportTicket["category"], description } : t)) };
      }
      if (state.supportTickets.length >= TICKET_LIMITS.maxTickets) return state;
      const seq = state.seq + 1;
      const ticket: SupportTicket = { id: `ticket-${seq}`, subject, category: d.category, description, status: "rascunho", assignee: null };
      return { ...state, seq, supportTickets: [ticket, ...state.supportTickets] };
    }
    case "ticket/simulate": {
      const t = state.supportTickets.find((x) => x.id === action.id);
      // Só um rascunho COMPLETO e válido vira simulação de envio.
      if (!t || t.status !== "rascunho" || Object.keys(validateTicket(t)).length) return state;
      return {
        ...state,
        supportRequests: state.supportRequests + 1,
        supportTickets: state.supportTickets.map((x) => (x.id === t.id ? { ...x, status: "simulado" } : x)),
      };
    }
    case "ticket/delete":
      return { ...state, supportTickets: state.supportTickets.filter((t) => t.id !== action.id) };
    case "studio/seed":
      return { ...state, studioSeed: action.seed };
    case "studio/draft":
      return { ...state, studioDrafts: { ...state.studioDrafts, ...action.draft } };
    case "studio/character-save": {
      if (state.studioCharacters.length >= STUDIO_MAX_CHARACTERS && !state.studioCharacters.some((c) => c.id === action.sheet.id)) return state;
      const rest = state.studioCharacters.filter((c) => c.id !== action.sheet.id);
      return { ...state, studioCharacters: [action.sheet, ...rest] };
    }
    case "studio/character-remove":
      return { ...state, studioCharacters: state.studioCharacters.filter((c) => c.id !== action.id) };
    case "reset":
      return action.state;
  }
}

/** Quantidade de curtidas exibida (exemplo + a sua). */
export function likeCount(state: DemoState, post: CommunityPost): number {
  return post.baseLikes + (state.likes.includes(post.id) ? 1 : 0);
}
