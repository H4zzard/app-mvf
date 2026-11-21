import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, checkPlanIntegrity, scheduleDays } from "./engine.ts";
import { diffPlans } from "./diff.ts";
import { TASK_CATALOG } from "../../demo/task-catalog.ts";
import { DEMO_LESSONS } from "../../demo/lessons.ts";
import { EXAMPLE_PROFILES } from "../../demo/example-profiles.ts";
import { EXAMPLE_PROFILE, DEMO_INITIAL_STATUS } from "../../demo/plan.ts";
import { computeProgress, getNextTask } from "../plan.ts";

const plans = Object.fromEntries(EXAMPLE_PROFILES.map((e) => [e.key, buildPlan(e.profile)]));
const ids = (key: string) => new Set(plans[key].tasks.map((t) => t.id));

const AVATAR_CORE = ["t-aula-personagem", "t-ficha-personagem", "t-aula-consistencia", "t-variacoes", "t-aula-flow"];
const HANDS_CORE = ["t-aula-enquadramento", "t-aula-close", "t-teste-maos"];
const CAMERA_CORE = ["t-aula-camera", "t-teste-camera", "t-aula-demonstracao"];
const BASE = [
  "t-elegibilidade",
  "t-escolher-produto",
  "t-conformidade",
  "t-aula-roteiro",
  "t-primeiro-video",
  "t-publicar",
  "t-aula-metricas",
  "t-proximos-videos",
];

describe("catálogo", () => {
  test("IDs únicos e pré-requisitos apenas para trás (sem ciclos)", () => {
    const seen = new Set<string>();
    for (const t of TASK_CATALOG) {
      assert.ok(!seen.has(t.id), `ID duplicado: ${t.id}`);
      for (const p of t.prerequisites) {
        assert.ok(seen.has(p), `${t.id} depende de ${p}, que não vem antes`);
      }
      seen.add(t.id);
    }
  });

  test("toda aula referenciada existe no catálogo de aulas demo", () => {
    const lessons = new Set(DEMO_LESSONS.map((l) => l.id));
    for (const t of TASK_CATALOG) if (t.lessonId) assert.ok(lessons.has(t.lessonId), t.lessonId);
  });

  test("os 18 IDs da trilha original continuam existindo", () => {
    const legacy = [
      "t-boas-vindas", "t-fundamentos", "t-conta-pronta", "t-aula-produto", "t-escolher-produto", "t-perfil",
      "t-aula-personagem", "t-ficha-personagem", "t-aula-consistencia", "t-variacoes", "t-aula-roteiro",
      "t-roteiros", "t-aula-flow", "t-primeiro-video", "t-aula-checklist", "t-publicar", "t-aula-metricas",
      "t-proximos-videos",
    ];
    const all = new Set(TASK_CATALOG.map((t) => t.id));
    for (const id of legacy) assert.ok(all.has(id), id);
  });
});

describe("cinco perfis obrigatórios", () => {
  for (const { key, label } of EXAMPLE_PROFILES) {
    test(`${label}: plano íntegro (4–6 etapas, sem duplicatas, dependências válidas)`, () => {
      assert.deepEqual(checkPlanIntegrity(plans[key]), []);
    });
    test(`${label}: contém a base comum`, () => {
      for (const id of BASE) assert.ok(ids(key).has(id), `${key} sem ${id}`);
    });
  }

  test("planos diferem entre si", () => {
    const signatures = new Set(EXAMPLE_PROFILES.map((e) => [...ids(e.key)].sort().join(",")));
    assert.equal(signatures.size, EXAMPLE_PROFILES.length);
  });

  test("é determinístico", () => {
    for (const e of EXAMPLE_PROFILES) assert.deepEqual(buildPlan(e.profile), plans[e.key]);
  });

  test("1 · avatar: núcleo de avatar, IA básica, checagem de conta; sem câmera nem mãos", () => {
    const s = ids("p1-avatar");
    for (const id of [...AVATAR_CORE, "t-aula-ia-basico", "t-conta-pronta"]) assert.ok(s.has(id), id);
    for (const id of [...CAMERA_CORE, ...HANDS_CORE]) assert.ok(!s.has(id), id);
    assert.ok(plans["p1-avatar"].tips.some((t) => t.includes("Google Flow")), "dica de celular + Flow");
  });

  test("2 · mãos: não força rosto nem avatar; sem checagem de conta; 15 min espalha mais dias", () => {
    const s = ids("p2-maos");
    for (const id of [...HANDS_CORE, "t-aula-edicao"]) assert.ok(s.has(id), id);
    for (const id of [...CAMERA_CORE, ...AVATAR_CORE]) assert.ok(!s.has(id), id);
    assert.ok(!s.has("t-conta-pronta"));
    assert.ok(plans["p2-maos"].totalDaysSuggested > plans["p5-avatar-maos"].totalDaysSuggested);
  });

  test("3 · aparece: núcleo de câmera SEM avatar; experiente tem fundamentos opcionais; consistência", () => {
    const plan = plans["p3-camera-experiente"];
    const s = ids("p3-camera-experiente");
    for (const id of CAMERA_CORE) assert.ok(s.has(id), id);
    for (const id of [...AVATAR_CORE, "t-aula-ia-basico", ...HANDS_CORE]) assert.ok(!s.has(id), id);
    for (const id of ["t-organizar-rotina", "t-revisar-videos", "t-lote-semanal"]) assert.ok(s.has(id), id);
    const optional = plan.tasks.filter((t) => t.optional).map((t) => t.id);
    assert.ok(optional.includes("t-fundamentos") && optional.includes("t-boas-vindas"));
    for (const id of ["t-elegibilidade", "t-conformidade"]) assert.ok(!optional.includes(id), `${id} nunca opcional`);
    assert.ok(!s.has("t-perfil"), "experiente não refaz perfil");
  });

  test("4 · explorar: orientação de formatos + acesso NUMI e checagem de conta", () => {
    const s = ids("p4-explorar");
    for (const id of ["t-aula-formatos", "t-escolher-experimento", "t-acesso-numi", "t-conta-pronta"]) {
      assert.ok(s.has(id), id);
    }
    for (const id of [...AVATAR_CORE, ...HANDS_CORE, ...CAMERA_CORE]) assert.ok(!s.has(id), id);
    const plan = plans["p4-explorar"];
    const publish = plan.tasks.find((t) => t.id === "t-publicar");
    assert.ok(publish?.prerequisites.includes("t-acesso-numi"), "NUMI antes de divulgar");
    assert.match(publish?.whyInPlan ?? "", /ninguém pode garantir/);
  });

  test("5 · avatar + mãos: os dois núcleos, sem duplicar fundamentos/roteiro", () => {
    const plan = plans["p5-avatar-maos"];
    const s = ids("p5-avatar-maos");
    for (const id of [...AVATAR_CORE, ...HANDS_CORE]) assert.ok(s.has(id), id);
    assert.ok(!s.has("t-aula-ia-basico"), "usa IA com frequência");
    for (const id of ["t-fundamentos", "t-aula-roteiro", "t-roteiros", "t-aula-edicao"]) {
      assert.equal(plan.tasks.filter((t) => t.id === id).length, 1, id);
    }
    assert.match(plan.stages.find((st) => st.id === "s-formato")?.title ?? "", /avatar de IA \+ mãos e produto/);
  });

  test("“talvez” com formato definido não injeta câmera", () => {
    const plan = buildPlan({ ...EXAMPLE_PROFILES[1].profile, wantsToAppear: "talvez" });
    const s = new Set(plan.tasks.map((t) => t.id));
    for (const id of CAMERA_CORE) assert.ok(!s.has(id), id);
    assert.ok(plan.tips.some((t) => t.includes("talvez")));
  });

  test("perfil incompleto (sem formato) cai em explorar, nunca em plano vazio", () => {
    const plan = buildPlan({ ...EXAMPLE_PROFILES[1].profile, formats: [] });
    assert.ok(plan.tasks.some((t) => t.id === "t-aula-formatos"));
    assert.deepEqual(checkPlanIntegrity(plan), []);
  });
});

describe("dias sugeridos", () => {
  test("respeita o tempo diário e não fraciona atividade longa", () => {
    assert.deepEqual(scheduleDays([10, 15, 20, 45, 5], 30), [
      { start: 1, end: 1 },
      { start: 1, end: 1 },
      { start: 2, end: 2 },
      { start: 3, end: 4 },
      { start: 5, end: 5 },
    ]);
  });

  test("atividade marcada como novo dia não divide o dia com a anterior", () => {
    assert.deepEqual(scheduleDays([10, 10], 60, [false, true]), [
      { start: 1, end: 1 },
      { start: 2, end: 2 },
    ]);
    for (const e of EXAMPLE_PROFILES) {
      const plan = buildPlan(e.profile);
      const pub = plan.tasks.find((t) => t.id === "t-publicar");
      const met = plan.tasks.find((t) => t.id === "t-aula-metricas");
      assert.ok(met && pub && met.daySuggestion > (pub.dayEnd ?? pub.daySuggestion), e.key);
    }
  });

  test("mais tempo por dia → menos dias", () => {
    const base = EXAMPLE_PROFILES[1].profile;
    const days = (["15", "30", "60", "90_mais"] as const).map(
      (m) => buildPlan({ ...base, dailyMinutes: m }).totalDaysSuggested,
    );
    for (let i = 1; i < days.length; i++) assert.ok(days[i] < days[i - 1], `dias: ${days.join(" > ")}`);
  });
});

describe("integração com progresso e replanejamento", () => {
  test("exemplo demo: estado inicial referencia IDs do plano e define o próximo passo", () => {
    const plan = buildPlan(EXAMPLE_PROFILE);
    const planIds = new Set(plan.tasks.map((t) => t.id));
    for (const id of Object.keys(DEMO_INITIAL_STATUS)) assert.ok(planIds.has(id), id);
    assert.equal(getNextTask(plan, DEMO_INITIAL_STATUS)?.id, "t-aula-produto");
  });

  test("ajustar respostas preserva concluídas por ID e recupera as que voltam", () => {
    const avatar = plans["p1-avatar"];
    const status = { "t-fundamentos": "completed", "t-aula-personagem": "completed" } as const;
    const hands = buildPlan({ ...EXAMPLE_PROFILES[0].profile, formats: ["maos_produto"] });

    const d1 = diffPlans(avatar, hands, status);
    assert.equal(d1.keptCompleted, 1); // t-fundamentos continua
    assert.equal(d1.removedCompleted, 1); // t-aula-personagem sai
    assert.ok(d1.added.some((t) => t.id === "t-aula-close"));
    // Progresso do novo plano só conta atividades presentes nele.
    assert.equal(computeProgress(hands, status).completed, 1);

    const back = diffPlans(hands, avatar, status);
    assert.equal(back.restoredCompleted, 1); // personagem volta concluída
    assert.equal(computeProgress(avatar, status).completed, 2);
  });

  test("mesmas respostas → prévia sem mudanças", () => {
    assert.equal(diffPlans(plans["p2-maos"], buildPlan(EXAMPLE_PROFILES[1].profile), {}).unchanged, true);
  });
});
