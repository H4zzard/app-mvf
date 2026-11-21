/**
 * Snapshot da DEMONSTRAÇÃO para restaurar após recarregar (somente modo demo
 * local, via sessionStorage da aba). Módulo PURO: serializa e VALIDA.
 *
 * - Versionado: snapshot de outra versão é descartado.
 * - Validação completa: qualquer campo inválido descarta o snapshot inteiro.
 * - Só dados fictícios da demo. Nada de sessão, autenticação ou backend.
 */
import type { OnboardingProfile, TaskStatusMap } from "@/types";
import { sanitizeDraft, validateProfile } from "../../config/onboarding-questions.ts";
import { COMMUNITY_LIMITS, SPACES, type CommunityAuthor, type CommunityComment, type CommunityPost } from "../../demo/community.ts";
import type { DemoState, HistoryEntry, SavedPrompt } from "./store.ts";

export const DEMO_SNAPSHOT_KEY = "mvf-demo-snapshot";
export const DEMO_PERSIST_KEY = "mvf-demo-persist";
export const DEMO_SNAPSHOT_VERSION = 1;
const MAX_BYTES = 200_000;

export type SnapshotPlanMode = "example" | "first_access" | "personalized";
export type SnapshotScenario = "padrao" | "nova" | "com-plano" | "evolucao";

export interface DemoSnapshot {
  v: number;
  scenario: SnapshotScenario;
  plan: { mode: SnapshotPlanMode; profile: OnboardingProfile | null; statusMap: TaskStatusMap };
  demo: DemoState;
}

export function serializeSnapshot(s: Omit<DemoSnapshot, "v">): string {
  return JSON.stringify({ v: DEMO_SNAPSHOT_VERSION, ...s, demo: { ...s.demo, studioSeed: null } });
}

/* ------------------------------- validação ------------------------------- */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = 2000): v is string => typeof v === "string" && v.length <= max;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e7;
const strArray = (v: unknown, max = 500): v is string[] => Array.isArray(v) && v.length <= max && v.every((x) => isStr(x, 200));
const TASK_ID = /^t-[a-z0-9-]{1,60}$/;
const STATUSES = new Set(["pending", "in_progress", "completed"]);
const SPACE_IDS = new Set(SPACES.map((s) => s.id));

function author(v: unknown): CommunityAuthor | null {
  if (!isObj(v) || !isStr(v.name, 80) || !isStr(v.initials, 4)) return null;
  if (v.isMe !== undefined && typeof v.isMe !== "boolean") return null;
  if (v.isTeam !== undefined && typeof v.isTeam !== "boolean") return null;
  return { name: v.name, initials: v.initials, ...(v.isMe ? { isMe: true } : {}), ...(v.isTeam ? { isTeam: true } : {}) };
}

function comment(v: unknown): CommunityComment | null {
  if (!isObj(v) || !isStr(v.id, 80) || !isStr(v.body, COMMUNITY_LIMITS.maxCommentLength)) return null;
  const a = author(v.author);
  return a ? { id: v.id, author: a, body: v.body } : null;
}

function post(v: unknown): CommunityPost | null {
  if (!isObj(v) || !isStr(v.id, 80) || !isStr(v.body, COMMUNITY_LIMITS.maxPostLength) || !isNum(v.baseLikes)) return null;
  if (typeof v.spaceId !== "string" || !SPACE_IDS.has(v.spaceId as CommunityPost["spaceId"])) return null;
  const a = author(v.author);
  if (!a || !Array.isArray(v.comments) || v.comments.length > 200) return null;
  const comments = v.comments.map(comment);
  if (comments.some((c) => c === null)) return null;
  if (v.edited !== undefined && typeof v.edited !== "boolean") return null;
  return { id: v.id, spaceId: v.spaceId as CommunityPost["spaceId"], author: a, body: v.body, baseLikes: v.baseLikes, comments: comments as CommunityComment[], ...(v.edited ? { edited: true } : {}) };
}

function statusMap(v: unknown): TaskStatusMap | null {
  if (!isObj(v)) return null;
  const out: TaskStatusMap = {};
  for (const [k, s] of Object.entries(v)) {
    if (!TASK_ID.test(k) || typeof s !== "string" || !STATUSES.has(s)) return null;
    out[k] = s as TaskStatusMap[string];
  }
  return out;
}

function demoState(v: unknown): DemoState | null {
  if (!isObj(v)) return null;
  const fav = v.favorites;
  if (!isObj(fav) || !strArray(fav.virals) || !strArray(fav.products) || !strArray(fav.templates) || !strArray(fav.materials)) return null;
  if (!strArray(v.lessonsDone) || !strArray(v.likes) || !strArray(v.rsvps) || !strArray(v.challengesClaimed) || !strArray(v.rewardsRedeemed)) return null;
  if (!Array.isArray(v.posts) || v.posts.length > 300) return null;
  const posts = v.posts.map(post);
  if (posts.some((x) => x === null)) return null;
  const pr = v.prompts;
  if (!isObj(pr) || !isNum(pr.generated) || !isNum(pr.copied) || !Array.isArray(pr.saved) || pr.saved.length > 100) return null;
  const saved = pr.saved.filter((s): s is SavedPrompt => isObj(s) && isStr(s.id, 80) && isStr(s.title, 200) && isStr(s.text, 20000));
  if (saved.length !== pr.saved.length) return null;
  if (!isObj(v.missionsJoined) || !Object.entries(v.missionsJoined).every(([k, n]) => isStr(k, 80) && isNum(n))) return null;
  if (!Array.isArray(v.history) || v.history.length > 200) return null;
  const history = v.history.filter(
    (h): h is HistoryEntry => isObj(h) && isStr(h.id, 80) && (h.kind === "desafio" || h.kind === "recompensa") && isStr(h.label, 200) && isNum(h.points),
  );
  if (history.length !== v.history.length) return null;
  if (!isNum(v.supportRequests) || !isNum(v.seq)) return null;
  return {
    lessonsDone: v.lessonsDone,
    favorites: { virals: fav.virals, products: fav.products, templates: fav.templates, materials: fav.materials },
    posts: posts as CommunityPost[],
    likes: v.likes,
    rsvps: v.rsvps,
    prompts: { generated: pr.generated, copied: pr.copied, saved },
    challengesClaimed: v.challengesClaimed,
    missionsJoined: v.missionsJoined as Record<string, number>,
    rewardsRedeemed: v.rewardsRedeemed,
    history,
    supportRequests: v.supportRequests,
    studioSeed: null,
    seq: v.seq,
  };
}

/** Lê e valida. Qualquer problema → `null` (a demo começa do estado padrão). */
export function parseSnapshot(raw: string | null): DemoSnapshot | null {
  if (!raw || raw.length > MAX_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(data) || data.v !== DEMO_SNAPSHOT_VERSION) return null;
  if (!["padrao", "nova", "com-plano", "evolucao"].includes(data.scenario as string)) return null;
  const plan = data.plan;
  if (!isObj(plan) || !["example", "first_access", "personalized"].includes(plan.mode as string)) return null;
  const map = statusMap(plan.statusMap);
  if (!map) return null;
  let profile: OnboardingProfile | null = null;
  if (plan.mode === "personalized") {
    const check = validateProfile(sanitizeDraft(plan.profile));
    if (!check.ok) return null;
    profile = check.profile;
  } else if (plan.profile !== null) return null;
  const demo = demoState(data.demo);
  if (!demo) return null;
  return { v: DEMO_SNAPSHOT_VERSION, scenario: data.scenario as SnapshotScenario, plan: { mode: plan.mode as SnapshotPlanMode, profile, statusMap: map }, demo };
}
