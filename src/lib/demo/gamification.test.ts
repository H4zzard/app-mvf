import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { demoReducer, initialDemoState } from "./store.ts";
import { MISSIONS, computeXp, missionProgress, type DemoStats } from "./xp.ts";
import { buildRanking, pointsBalance, rewardState, spentPoints } from "./economy.ts";
import { DEMO_RANKING, DEMO_REWARDS } from "../../demo/rewards.ts";
import { DEMO_MATERIALS } from "../../demo/materials.ts";
import { DEMO_FAQ_FULL, DEMO_RULES } from "../../demo/rules.ts";

const zero: DemoStats = { planLessons: 0, planActions: 0, extraLessons: 0, lessonsTotal: 0, posts: 0, comments: 0, promptsCopied: 0, favorites: 0, rsvps: 0, challengesClaimed: [] };
const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe("missões: participação e XP sem duplicar", () => {
  test("sem participar não há progresso; ações antigas não contam (linha de base)", () => {
    const m = mission("mi-sem-aulas");
    const stats = { ...zero, lessonsTotal: 5 };
    assert.deepEqual(missionProgress(m, stats, {}), { value: 0, state: "disponivel" });
    assert.deepEqual(missionProgress(m, stats, { [m.id]: 5 }), { value: 0, state: "em_andamento" });
    assert.deepEqual(missionProgress(m, { ...stats, lessonsTotal: 8 }, { [m.id]: 5 }), { value: 3, state: "pronta" });
  });

  test("resgate rende XP uma única vez e entra no histórico", () => {
    const m = mission("mi-dia-aula");
    let s = demoReducer(initialDemoState(), { type: "mission/join", missionId: m.id, baseline: 2 });
    s = demoReducer(s, { type: "mission/join", missionId: m.id, baseline: 9 });
    assert.equal(s.missionsJoined[m.id], 2, "segunda adesão não muda a linha de base");
    const claim = { type: "challenge/claim" as const, challengeId: m.id, eligible: true, label: m.title, xp: m.xp };
    s = demoReducer(demoReducer(s, claim), claim);
    assert.deepEqual(s.challengesClaimed, [m.id]);
    assert.equal(s.history.length, 1);
    const xp = computeXp({ ...zero, challengesClaimed: s.challengesClaimed });
    assert.equal(xp.xp, m.xp);
    assert.equal(xp.breakdown.find((b) => b.label === "Missões de desafios")!.xp, m.xp);
    assert.equal(missionProgress(m, { ...zero, challengesClaimed: s.challengesClaimed }, s.missionsJoined).state, "resgatada");
    assert.equal(demoReducer(s, { type: "mission/join", missionId: m.id, baseline: 0 }), s, "missão resgatada não reabre");
  });
});

describe("loja de recompensas", () => {
  test("saldo = XP − resgates, nunca negativo", () => {
    assert.equal(spentPoints(["rw-destaque-mural", "rw-feedback-perfil"], DEMO_REWARDS), 210);
    assert.equal(pointsBalance(300, ["rw-destaque-mural"], DEMO_REWARDS), 240);
    assert.equal(pointsBalance(10, ["rw-kit-numi"], DEMO_REWARDS), 0);
  });

  test("resgate só com saldo e uma vez por recompensa", () => {
    const r = DEMO_REWARDS.find((x) => x.id === "rw-feedback-perfil")!;
    let s = demoReducer(initialDemoState(), { type: "reward/redeem", rewardId: r.id, label: r.title, cost: r.cost, balance: 100 });
    assert.deepEqual(s.rewardsRedeemed, []);
    s = demoReducer(s, { type: "reward/redeem", rewardId: r.id, label: r.title, cost: r.cost, balance: 200 });
    s = demoReducer(s, { type: "reward/redeem", rewardId: r.id, label: r.title, cost: r.cost, balance: 200 });
    assert.deepEqual(s.rewardsRedeemed, [r.id]);
    assert.equal(s.history[0].kind, "recompensa");
  });

  test("estado e progresso de cada recompensa", () => {
    const r = DEMO_REWARDS.find((x) => x.cost === 150)!;
    assert.deepEqual(rewardState(r, 75, []), { state: "bloqueada", percent: 50, missing: 75 });
    assert.equal(rewardState(r, 150, []).state, "disponivel");
    assert.equal(rewardState(r, 0, [r.id]).state, "resgatada");
  });
});

describe("ranking", () => {
  test("ordena por XP, posição com empate e você destacada", () => {
    const rows = buildRanking(DEMO_RANKING, { name: "Você", initials: "EU", xp: 240 });
    assert.equal(rows[0].xp, Math.max(...DEMO_RANKING.map((p) => p.xp)));
    const me = rows.find((r) => r.isMe)!;
    const tie = rows.find((r) => r.xp === 240 && !r.isMe)!;
    assert.equal(me.position, tie.position, "empate divide a posição");
    assert.ok(rows.indexOf(me) < rows.indexOf(tie), "você na frente no desempate");
    assert.ok(rows.filter((r) => !r.isMe).every((r) => r.isExample && r.name.includes("(exemplo)")));
  });

  test("sem perfis de exemplo, só você", () => {
    const rows = buildRanking([], { name: "Você", initials: "EU", xp: 0 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].position, 1);
  });
});

describe("materiais, regras e FAQ", () => {
  test("nenhum material promete arquivo inexistente; IDs únicos", () => {
    assert.ok(DEMO_MATERIALS.length >= 15);
    assert.ok(DEMO_MATERIALS.every((m) => m.file === null));
    assert.equal(new Set(DEMO_MATERIALS.map((m) => m.id)).size, DEMO_MATERIALS.length);
  });

  test("regras e FAQ têm IDs únicos", () => {
    assert.equal(new Set(DEMO_RULES.map((r) => r.id)).size, DEMO_RULES.length);
    assert.equal(new Set(DEMO_FAQ_FULL.map((f) => f.id)).size, DEMO_FAQ_FULL.length);
  });
});
