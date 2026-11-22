/**
 * Estado da DEMONSTRAÇÃO dos módulos (aulas fora do plano, favoritos,
 * comunidade, agenda, Estúdio IA, desafios). Redutor PURO e determinístico:
 * sem React, sem relógio, sem rede, sem armazenamento. Vive só em memória no
 * modo demo local e some ao recarregar (ver CLAUDE.md, proibição 4).
 *
 * O progresso do PLANO continua no PlanProvider (store único do plano).
 */
import type { CommunityPost, SpaceId } from "../../demo/community.ts";
import { COMMUNITY_LIMITS, SEED_POSTS, SPACES } from "../../demo/community.ts";
import type { CharacterSheet } from "../studio/contracts.ts";
import type { StudioDrafts, StudioTool } from "../studio/drafts.ts";

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
  | { type: "post/add"; spaceId: SpaceId; body: string }
  | { type: "post/edit"; postId: string; body: string }
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

export function canPostIn(spaceId: SpaceId): boolean {
  return SPACES.find((s) => s.id === spaceId)?.studentsCanPost === true;
}

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
    case "post/add": {
      const body = cleanText(action.body, COMMUNITY_LIMITS.maxPostLength);
      if (!body || !canPostIn(action.spaceId)) return state;
      const seq = state.seq + 1;
      const post: CommunityPost = { id: `meu-post-${seq}`, spaceId: action.spaceId, author: { ...ME }, body, baseLikes: 0, comments: [] };
      return { ...state, seq, posts: [post, ...state.posts] };
    }
    case "post/edit": {
      const body = cleanText(action.body, COMMUNITY_LIMITS.maxPostLength);
      if (!body) return state;
      let changed = false;
      const posts = state.posts.map((p) => {
        if (p.id !== action.postId || !p.author.isMe || p.body === body) return p;
        changed = true;
        return { ...p, body, edited: true };
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
      if (!body || !state.posts.some((p) => p.id === action.postId)) return state;
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
