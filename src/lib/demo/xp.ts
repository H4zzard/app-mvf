/**
 * XP, níveis, selos e desafios da DEMONSTRAÇÃO.
 *
 * Tudo é derivado das ações feitas na sessão demo. Não representa ganhos
 * financeiros, vendas ou resultados. As regras oficiais de pontos ainda
 * estão em aberto (docs/DECISOES.md) e deverão vir de eventos verificáveis.
 * Módulo puro.
 */

export interface DemoStats {
  /** Tarefas do plano concluídas, por tipo. */
  planLessons: number;
  planActions: number;
  /** Aulas concluídas pela biblioteca que NÃO estão no plano (sem contar em dobro). */
  extraLessons: number;
  /** Total de aulas concluídas (plano + biblioteca), para selos e desafios. */
  lessonsTotal: number;
  posts: number;
  comments: number;
  promptsCopied: number;
  favorites: number;
  rsvps: number;
  /** IDs resgatados (marcos de Conquistas e missões de Desafios — IDs distintos). */
  challengesClaimed: string[];
}

export const XP_RULES = {
  planLesson: 10,
  planAction: 15,
  extraLesson: 10,
  post: 5,
  comment: 2,
  /** Só as 5 primeiras cópias contam (evita “farmar” XP). */
  promptCopied: 4,
  promptCopiedCap: 5,
} as const;

export const LEVELS = [
  { number: 1, name: "Começando", minXp: 0 },
  { number: 2, name: "Em movimento", minXp: 60 },
  { number: 3, name: "Criadora", minXp: 150 },
  { number: 4, name: "Constante", minXp: 260 },
  { number: 5, name: "Inspiração", minXp: 400 },
] as const;

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  metric: (s: DemoStats) => number;
  xp: number;
}

export const CHALLENGES: Challenge[] = [
  {
    id: "ch-3-aulas",
    title: "Maratona de aulas",
    description: "Conclua 3 aulas.",
    target: 3,
    metric: (s) => s.lessonsTotal,
    xp: 20,
  },
  {
    id: "ch-primeiro-prompt",
    title: "Primeiro roteiro",
    description: "Copie 1 roteiro gerado no Estúdio IA.",
    target: 1,
    metric: (s) => s.promptsCopied,
    xp: 15,
  },
  {
    id: "ch-comunidade",
    title: "Presença na comunidade",
    description: "Publique 1 postagem ou faça 2 comentários.",
    target: 1,
    metric: (s) => (s.posts >= 1 || s.comments >= 2 ? 1 : 0),
    xp: 15,
  },
  {
    id: "ch-referencias",
    title: "Caçadora de referências",
    description: "Salve 3 itens entre Virais, Marketplace e modelos.",
    target: 3,
    metric: (s) => s.favorites,
    xp: 10,
  },
];

export interface Badge {
  id: string;
  title: string;
  description: string;
  unlocked: (s: DemoStats) => boolean;
}

export const BADGES: Badge[] = [
  { id: "b-primeira-aula", title: "Primeira aula", description: "Concluiu a primeira aula.", unlocked: (s) => s.lessonsTotal >= 1 },
  { id: "b-mao-na-massa", title: "Mão na massa", description: "Concluiu a primeira atividade prática.", unlocked: (s) => s.planActions >= 1 },
  { id: "b-roteirista", title: "Roteirista", description: "Copiou um roteiro do Estúdio IA.", unlocked: (s) => s.promptsCopied >= 1 },
  { id: "b-voz-ativa", title: "Voz ativa", description: "Publicou na comunidade.", unlocked: (s) => s.posts >= 1 },
  { id: "b-curadora", title: "Curadora", description: "Salvou 3 referências.", unlocked: (s) => s.favorites >= 3 },
  { id: "b-agenda", title: "Na agenda", description: "Entrou na lista de uma live.", unlocked: (s) => s.rsvps >= 1 },
];

export function challengeProgress(c: Challenge, s: DemoStats): { value: number; done: boolean; claimed: boolean } {
  const value = Math.min(c.metric(s), c.target);
  return { value, done: value >= c.target, claimed: s.challengesClaimed.includes(c.id) };
}

export interface XpSummary {
  xp: number;
  breakdown: { label: string; xp: number }[];
  level: { number: number; name: string };
  nextLevel: { number: number; name: string; minXp: number } | null;
  xpToNext: number;
  /** 0–100 dentro do nível atual. */
  levelPercent: number;
  badgesUnlocked: number;
}

/* ------------------------------ Missões (Desafios) ------------------------------ */

export type MissionCadence = "diaria" | "semanal" | "especial";

/**
 * Missões exigem PARTICIPAR: o progresso conta só o que foi feito depois da
 * adesão (linha de base = valor da métrica no momento em que entrou). Assim a
 * mesma ação antiga não completa missões novas, e cada missão rende XP uma vez.
 * Na demo não há relógio: “diária/semanal” é o tipo do desafio; o ciclo reinicia no reset.
 */
export interface Mission {
  id: string;
  cadence: MissionCadence;
  title: string;
  description: string;
  target: number;
  metric: (s: DemoStats) => number;
  xp: number;
  /** Onde a aluna faz a ação. */
  href: string;
}

export const MISSIONS: Mission[] = [
  { id: "mi-dia-aula", cadence: "diaria", title: "Uma aula hoje", description: "Conclua 1 aula.", target: 1, metric: (s) => s.lessonsTotal, xp: 10, href: "/aulas" },
  { id: "mi-dia-pratica", cadence: "diaria", title: "Mão na massa", description: "Conclua 1 atividade prática do plano.", target: 1, metric: (s) => s.planActions, xp: 10, href: "/meu-plano" },
  { id: "mi-dia-comentario", cadence: "diaria", title: "Troca do dia", description: "Comente em uma postagem da comunidade.", target: 1, metric: (s) => s.comments, xp: 5, href: "/comunidade" },
  { id: "mi-sem-aulas", cadence: "semanal", title: "Semana de estudos", description: "Conclua 3 aulas.", target: 3, metric: (s) => s.lessonsTotal, xp: 30, href: "/aulas" },
  { id: "mi-sem-posts", cadence: "semanal", title: "Voz na comunidade", description: "Publique 2 postagens.", target: 2, metric: (s) => s.posts, xp: 25, href: "/comunidade" },
  { id: "mi-sem-referencias", cadence: "semanal", title: "Banco de referências", description: "Salve 3 referências, produtos ou modelos.", target: 3, metric: (s) => s.favorites, xp: 15, href: "/videos-virais" },
  { id: "mi-esp-roteiros", cadence: "especial", title: "Maratona de roteiros", description: "Copie 2 roteiros no Estúdio IA.", target: 2, metric: (s) => s.promptsCopied, xp: 40, href: "/estudio-ia" },
  { id: "mi-esp-live", cadence: "especial", title: "Presença ao vivo", description: "Entre na lista de lembrete de 1 live.", target: 1, metric: (s) => s.rsvps, xp: 20, href: "/lives" },
];

export const CADENCE_LABEL: Record<MissionCadence, string> = { diaria: "Diárias", semanal: "Semanais", especial: "Especiais de conteúdo" };

export type MissionState = "disponivel" | "em_andamento" | "pronta" | "resgatada";

export function missionProgress(
  m: Mission,
  s: DemoStats,
  joined: Record<string, number>,
): { value: number; state: MissionState } {
  if (s.challengesClaimed.includes(m.id)) return { value: m.target, state: "resgatada" };
  if (!(m.id in joined)) return { value: 0, state: "disponivel" };
  const value = Math.max(0, Math.min(m.metric(s) - joined[m.id], m.target));
  return { value, state: value >= m.target ? "pronta" : "em_andamento" };
}

export function computeXp(s: DemoStats): XpSummary {
  const claimed = CHALLENGES.filter((c) => s.challengesClaimed.includes(c.id) && challengeProgress(c, s).done);
  const missionsXp = MISSIONS.filter((m) => s.challengesClaimed.includes(m.id)).reduce((sum, m) => sum + m.xp, 0);
  const breakdown = [
    { label: "Aulas do plano", xp: s.planLessons * XP_RULES.planLesson },
    { label: "Atividades práticas", xp: s.planActions * XP_RULES.planAction },
    { label: "Aulas extras", xp: s.extraLessons * XP_RULES.extraLesson },
    { label: "Comunidade", xp: s.posts * XP_RULES.post + s.comments * XP_RULES.comment },
    { label: "Estúdio IA", xp: Math.min(s.promptsCopied, XP_RULES.promptCopiedCap) * XP_RULES.promptCopied },
    { label: "Marcos de conquistas", xp: claimed.reduce((sum, c) => sum + c.xp, 0) },
    { label: "Missões de desafios", xp: missionsXp },
  ];
  const xp = breakdown.reduce((sum, b) => sum + b.xp, 0);
  const current = [...LEVELS].reverse().find((l) => xp >= l.minXp) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.minXp > xp) ?? null;
  const span = next ? next.minXp - current.minXp : 1;
  return {
    xp,
    breakdown,
    level: { number: current.number, name: current.name },
    nextLevel: next ? { number: next.number, name: next.name, minXp: next.minXp } : null,
    xpToNext: next ? next.minXp - xp : 0,
    levelPercent: next ? Math.round(((xp - current.minXp) / span) * 100) : 100,
    badgesUnlocked: BADGES.filter((b) => b.unlocked(s)).length,
  };
}
