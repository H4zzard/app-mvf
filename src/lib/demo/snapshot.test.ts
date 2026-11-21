import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_SNAPSHOT_VERSION, parseSnapshot, serializeSnapshot } from "./snapshot.ts";
import { demoReducer, initialDemoState } from "./store.ts";
import { buildScenario } from "../../demo/scenarios.ts";
import { DEMO_INITIAL_STATUS } from "../../demo/plan.ts";

const evo = buildScenario("evolucao");
const base = { scenario: "evolucao" as const, plan: { mode: "personalized" as const, profile: evo.plan.profile, statusMap: evo.plan.statusMap }, demo: evo.demo };

describe("snapshot da demo (sessionStorage)", () => {
  test("ida e volta preserva plano, cenário e estado dos módulos", () => {
    let demo = demoReducer(base.demo, { type: "post/add", spaceId: "duvidas", body: "Pergunta de teste" });
    demo = demoReducer(demo, { type: "mission/join", missionId: "mi-dia-aula", baseline: 3 });
    demo = demoReducer(demo, { type: "reward/redeem", rewardId: "rw-destaque-mural", label: "Destaque", cost: 60, balance: 100 });
    const parsed = parseSnapshot(serializeSnapshot({ ...base, demo }));
    assert.ok(parsed);
    assert.equal(parsed.scenario, "evolucao");
    assert.deepEqual(parsed.plan.statusMap, evo.plan.statusMap);
    assert.equal(parsed.plan.profile?.preferredName, "Marina");
    assert.deepEqual(parsed.demo, { ...demo, studioSeed: null });
  });

  test("trilha de exemplo (sem perfil) também restaura", () => {
    const parsed = parseSnapshot(serializeSnapshot({ scenario: "padrao", plan: { mode: "example", profile: null, statusMap: DEMO_INITIAL_STATUS }, demo: initialDemoState() }));
    assert.equal(parsed?.plan.mode, "example");
  });

  test("semente do Estúdio nunca é restaurada", () => {
    const demo = demoReducer(initialDemoState(), { type: "studio/seed", seed: { from: "x", hook: "y" } });
    assert.equal(parseSnapshot(serializeSnapshot({ ...base, demo }))?.demo.studioSeed, null);
  });

  test("descarta: vazio, JSON inválido, outra versão ou grande demais", () => {
    assert.equal(parseSnapshot(null), null);
    assert.equal(parseSnapshot("{quebrado"), null);
    const other = JSON.parse(serializeSnapshot(base));
    other.v = DEMO_SNAPSHOT_VERSION + 1;
    assert.equal(parseSnapshot(JSON.stringify(other)), null);
    assert.equal(parseSnapshot("x".repeat(300_000)), null);
  });

  test("descarta dados adulterados", () => {
    type Raw = {
      scenario: string;
      plan: { statusMap: Record<string, string>; profile: Record<string, unknown> | null };
      demo: { posts: { spaceId: string }[]; likes: unknown; prompts: { copied: number }; history: unknown[] };
    };
    const mutate = (fn: (o: Raw) => void) => {
      const o = JSON.parse(serializeSnapshot(base));
      fn(o);
      return parseSnapshot(JSON.stringify(o));
    };
    assert.equal(mutate((o) => (o.plan.statusMap["../hack"] = "completed")), null, "ID de tarefa inválido");
    assert.equal(mutate((o) => (o.plan.statusMap["t-ok"] = "feito")), null, "status inválido");
    assert.equal(mutate((o) => { if (o.plan.profile) o.plan.profile.experience = "expert"; }), null, "perfil inválido");
    assert.equal(mutate((o) => (o.plan.profile = null)), null, "personalizado sem perfil");
    assert.equal(mutate((o) => (o.scenario = "producao")), null, "cenário desconhecido");
    assert.equal(mutate((o) => (o.demo.posts[0].spaceId = "admin")), null, "espaço inexistente");
    assert.equal(mutate((o) => (o.demo.likes = "tudo")), null, "lista inválida");
    assert.equal(mutate((o) => (o.demo.prompts.copied = -5)), null, "número negativo");
    assert.equal(mutate((o) => (o.demo.history = [{ id: "h", kind: "saque", label: "x", points: 1 }])), null, "histórico inválido");
  });
});
