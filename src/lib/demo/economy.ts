/**
 * Saldo de pontos, resgates e ranking da DEMONSTRAÇÃO. Funções puras.
 *
 * - XP ganho é derivado das ações (computeXp). Pontos gastos = soma dos resgates.
 * - Saldo = XP − gastos (nunca negativo na tela). Resgatar exige saldo e é único por recompensa.
 * - Ranking: recebe perfis (demo hoje; reais no futuro) e insere “você”.
 */
import type { RankingProfile, Reward } from "../../demo/rewards.ts";
import { LEVELS } from "./xp.ts";

export function spentPoints(redeemed: string[], rewards: Reward[]): number {
  return redeemed.reduce((sum, id) => sum + (rewards.find((r) => r.id === id)?.cost ?? 0), 0);
}

export function pointsBalance(xp: number, redeemed: string[], rewards: Reward[]): number {
  return Math.max(0, xp - spentPoints(redeemed, rewards));
}

export type RewardState = "resgatada" | "disponivel" | "bloqueada";

export function rewardState(reward: Reward, balance: number, redeemed: string[]): { state: RewardState; percent: number; missing: number } {
  if (redeemed.includes(reward.id)) return { state: "resgatada", percent: 100, missing: 0 };
  const percent = Math.min(100, Math.round((balance / reward.cost) * 100));
  return balance >= reward.cost ? { state: "disponivel", percent: 100, missing: 0 } : { state: "bloqueada", percent, missing: reward.cost - balance };
}

export function levelOf(xp: number): { number: number; name: string } {
  const l = [...LEVELS].reverse().find((x) => xp >= x.minXp) ?? LEVELS[0];
  return { number: l.number, name: l.name };
}

export interface RankingRow {
  id: string;
  name: string;
  initials: string;
  xp: number;
  position: number;
  isMe: boolean;
  isExample: boolean;
  level: { number: number; name: string };
}

/**
 * Ordena por XP (desc). Empates: mesma posição (ranking “1224”); “você” fica
 * na frente no desempate para não parecer penalizada.
 */
export function buildRanking(profiles: RankingProfile[], me: { name: string; initials: string; xp: number }): RankingRow[] {
  const rows = [
    { id: "me", name: me.name, initials: me.initials, xp: me.xp, isMe: true, isExample: false },
    ...profiles.map((p) => ({ ...p, isMe: false })),
  ].sort((a, b) => b.xp - a.xp || Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name, "pt-BR"));
  let lastXp: number | null = null;
  let lastPos = 0;
  return rows.map((r, i) => {
    const position = r.xp === lastXp ? lastPos : i + 1;
    lastXp = r.xp;
    lastPos = position;
    return { ...r, position, level: levelOf(r.xp) };
  });
}
