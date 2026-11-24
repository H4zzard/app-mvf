import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { OnboardingProfile, TaskStatusMap } from "@/types";
import { buildPlan } from "../personalization/engine.ts";
import { EXAMPLE_PROFILE } from "../../demo/plan.ts";
import { TASK_CATALOG } from "../../demo/task-catalog.ts";
import { JOURNEY_PHASES, JOURNEY_STEPS } from "../../demo/journey-catalog.ts";
import { buildScenario } from "../../demo/scenarios.ts";
const SCENARIOS = (["nova", "com-plano", "evolucao"] as const).map(buildScenario);
import { catalog } from "../catalog/index.ts";
import { computeXp, type DemoStats } from "../demo/xp.ts";
import { parseSnapshot, serializeSnapshot } from "../demo/snapshot.ts";
import { isUnknownDetailPath } from "../routing/unknown-detail.ts";
import {
  applyUpdates,
  buildJourney,
  checkJourneyCatalog,
  chooseUpdates,
  completeUpdates,
  journeyStatusIds,
  neighbors,
  replanSummary,
  stepForTask,
  undoUpdates,
  viewOf,
} from "./journey.ts";
import { parsePrintsManifest, printsFor } from "./prints.ts";

const profile = (over: Partial<OnboardingProfile> = {}): OnboardingProfile => ({ ...EXAMPLE_PROFILE, ...over });
const STEP_IDS = new Set(JOURNEY_STEPS.map((s) => s.id));

/** Conclui uma etapa “como a aluna faria” e devolve o novo statusMap. */
function done(p: OnboardingProfile, map: TaskStatusMap, id: string): TaskStatusMap {
  const j = buildJourney(buildPlan(p), map);
  const u = completeUpdates(j, map, id);
  assert.ok(u.length > 0, `não foi possível concluir ${id} (estado: ${viewOf(j, id)?.state})`);
  return applyUpdates(map, u);
}

/** Segue a “próxima ação” até esgotar uma fase (como a aluna tocando em Concluí/Próxima). */
function walkPhase(p: OnboardingProfile, map: TaskStatusMap, phase: string): TaskStatusMap {
  for (let guard = 0; guard < 80; guard++) {
    const j = buildJourney(buildPlan(p), map);
    const ph = j.phases.find((x) => x.phase.id === phase)!;
    if (ph.complete) return map;
    const next = ph.steps.find((v) => v.applicable && !v.done && v.missing.length === 0);
    assert.ok(next, `fase ${phase} travada`);
    if (next!.step.kind === "decisao") map = applyUpdates(map, chooseUpdates(j, map, next!.step.id, next!.step.options![1].id));
    else map = done(p, map, next!.step.id);
  }
  throw new Error("loop");
}

/** XP como o DemoProvider calcula (atividades do plano concluídas). */
function xpOf(p: OnboardingProfile, map: TaskStatusMap): number {
  const plan = buildPlan(p);
  const completed = plan.tasks.filter((t) => map[t.id] === "completed");
  const s: DemoStats = {
    planLessons: completed.filter((t) => t.type === "lesson").length,
    planActions: completed.filter((t) => t.type === "action").length,
    extraLessons: 0,
    lessonsTotal: completed.filter((t) => t.lessonId).length,
    posts: 0,
    comments: 0,
    promptsCopied: 0,
    favorites: 0,
    rsvps: 0,
    challengesClaimed: [],
  };
  return computeXp(s).xp;
}

/* --------------------------------- Catálogo --------------------------------- */

test("catálogo: IDs estáveis t-…, pré-requisitos anteriores, aulas existentes, toda atividade coberta", () => {
  const errors = checkJourneyCatalog(
    { steps: JOURNEY_STEPS, phases: JOURNEY_PHASES },
    {
      taskIds: TASK_CATALOG.map((t) => t.id),
      lessonExists: (id) => Boolean(catalog.getLesson(id)),
      routeExists: (href) => existsSync(join("src/app/(app)", href.split("?")[0], "page.tsx")),
    },
  );
  assert.deepEqual(errors, []);
  assert.equal(JOURNEY_PHASES.length, 6);
});

test("catálogo: sem métricas, garantias ou valores; procedimentos do TikTok marcados para revisão", () => {
  const text = JOURNEY_STEPS.map((s) => `${s.title} ${typeof s.instruction === "string" ? s.instruction : s.instruction({ has: () => false, tracks: [], profile: EXAMPLE_PROFILE, minutes: 30 } as never)}`).join(" ");
  assert.doesNotMatch(text, /\d+\s?%|CTR|convers|estoque|R\$|garant|fatur/i);
  for (const id of ["t-j-conta-criar", "t-j-perfil-abrir", "t-j-publicar-postar"]) assert.equal(JOURNEY_STEPS.find((s) => s.id === id)?.procedureReview, true, id);
});

test("validação: pré-requisito fora de ordem e atividade sem etapa são detectados", () => {
  const steps = [...JOURNEY_STEPS];
  const bad = { ...steps[0], prerequisites: ["t-j-conta-decisao"] };
  const errs = checkJourneyCatalog({ steps: [bad, ...steps.slice(1)], phases: JOURNEY_PHASES }, { taskIds: [...TASK_CATALOG.map((t) => t.id), "t-nova-atividade"], lessonExists: () => true });
  assert.ok(errs.some((e) => /não é uma etapa anterior/.test(e)));
  assert.ok(errs.some((e) => /t-nova-atividade sem nenhuma etapa/.test(e)));
});

/* --------------------------------- Casos A–I --------------------------------- */

test("Caso A — iniciante sem conta: cria a conta em microetapas e conclui a preparação", () => {
  const p = profile({ accountReady: "nao" });
  const j0 = buildJourney(buildPlan(p), {});
  assert.equal(j0.current?.step.id, "t-boas-vindas");
  assert.equal(viewOf(j0, "t-j-conta-criar")?.applicable, true);
  assert.equal(viewOf(j0, "t-j-conta-criar")?.state, "bloqueada");
  let map: TaskStatusMap = {};
  map = applyUpdates(map, chooseUpdates(j0, map, "t-j-conta-decisao", "nao-tenho"));
  map = done(p, map, "t-j-conta-instalar");
  map = done(p, map, "t-j-conta-criar");
  map = walkPhase(p, map, "f-conta");
  const j = buildJourney(buildPlan(p), map);
  assert.equal(j.phases[0].complete, true);
  assert.equal(map["t-perfil"], "completed", "todas as microetapas do perfil ⇒ atividade antiga concluída");
  assert.equal(j.currentPhase?.phase.id, "f-presenca", "segue para a próxima fase");
});

test("Caso B — já tem conta: criação pulada com justificativa, sem fingir conclusão", () => {
  const p = profile({ accountReady: "sim" });
  let map: TaskStatusMap = {};
  const j0 = buildJourney(buildPlan(p), map);
  assert.equal(viewOf(j0, "t-j-conta-criar")?.state, "nao_aplicavel");
  assert.match(viewOf(j0, "t-j-conta-criar")!.reason!, /já tem conta/);
  map = applyUpdates(map, chooseUpdates(j0, map, "t-j-conta-decisao", "tenho"));
  const j = buildJourney(buildPlan(p), map);
  assert.equal(viewOf(j, "t-j-conta-criar")?.done, false, "não aplicável nunca vira concluída");
  assert.equal(viewOf(j, "t-j-perfil-abrir")?.missing.length, 0, "segue direto para a configuração");
  // Onboarding dizia “sim”, mas na jornada ela diz que não tem: a criação volta.
  const back = applyUpdates(map, chooseUpdates(j, map, "t-j-conta-decisao", "nao-tenho"));
  assert.equal(viewOf(buildJourney(buildPlan(p), back), "t-j-conta-criar")?.applicable, true);
  assert.equal(back["t-j-flag-tem-conta"], "pending");
});

test("Caso C — não quer aparecer: foto de avatar com atalho para o Estúdio, sem etapas de câmera", () => {
  const j = buildJourney(buildPlan(profile({ wantsToAppear: "nao", formats: ["avatar_ia"] })), {});
  assert.equal(viewOf(j, "t-j-perfil-foto-avatar")?.applicable, true);
  assert.equal(viewOf(j, "t-j-perfil-foto-avatar")?.shortcut?.href, "/estudio-ia/personagem");
  assert.equal(viewOf(j, "t-j-perfil-foto-rosto")?.applicable, false);
  assert.equal(viewOf(j, "t-teste-camera")?.applicable, false);
  assert.match(viewOf(j, "t-j-video-gravar")!.instruction, /Google Flow/);
  assert.equal(viewOf(j, "t-j-roteiro-completo")?.shortcut?.href, "/estudio-ia/animar");
});

test("Caso D — quer aparecer: foto de rosto, câmera, demonstração e roteiros para gravar", () => {
  const j = buildJourney(buildPlan(profile({ wantsToAppear: "sim", formats: [] })), {});
  for (const id of ["t-j-perfil-foto-rosto", "t-aula-camera", "t-teste-camera", "t-aula-demonstracao"]) assert.equal(viewOf(j, id)?.applicable, true, id);
  assert.equal(viewOf(j, "t-j-perfil-foto-avatar")?.applicable, false);
  assert.equal(viewOf(j, "t-j-roteiro-completo")?.shortcut?.href, "/estudio-ia/roteiros");
  assert.match(viewOf(j, "t-j-roteiro-formato")!.instruction, /falado/);
});

test("Caso E — sair e voltar: a etapa atual depende só do statusMap (nada se perde ao navegar)", () => {
  const p = profile();
  let map: TaskStatusMap = {};
  map = done(p, map, "t-boas-vindas");
  const a = buildJourney(buildPlan(p), map).current?.step.id;
  const b = buildJourney(buildPlan(p), { ...map }).current?.step.id;
  assert.equal(a, b);
  assert.notEqual(a, "t-boas-vindas");
});

test("Caso F — replanejamento: conclusões válidas ficam; não aplicáveis não viram concluídas", () => {
  const before = profile({ wantsToAppear: "nao", formats: ["avatar_ia"] });
  let map: TaskStatusMap = {};
  map = done(before, map, "t-boas-vindas");
  map = done(before, map, "t-elegibilidade");
  map = done(before, map, "t-j-presenca-confirmar");
  map = done(before, map, "t-aula-personagem");
  const after = profile({ wantsToAppear: "sim", formats: [] });
  const jb = buildJourney(buildPlan(before), map);
  const ja = buildJourney(buildPlan(after), map);
  const r = replanSummary(jb, ja);
  for (const id of ["t-boas-vindas", "t-elegibilidade", "t-j-presenca-confirmar"]) assert.ok(r.kept.includes(id), id);
  assert.ok(r.removed.includes("t-aula-personagem"));
  assert.ok(r.added.includes("t-aula-camera"));
  assert.equal(viewOf(ja, "t-aula-personagem")?.done, false, "fora do caminho: não conta como concluída");
  assert.equal(map["t-aula-personagem"], "completed", "mas o registro histórico fica guardado");
  const back = buildJourney(buildPlan(before), map);
  assert.equal(viewOf(back, "t-aula-personagem")?.done, true, "voltando ao perfil anterior, a conclusão reaparece");
});

test("Caso G — aula não cadastrada: a etapa funciona sem link quebrado", () => {
  const s = JOURNEY_STEPS.find((x) => x.id === "t-j-perfil-nome")!;
  assert.deepEqual(s.lessons, []);
  for (const st of JOURNEY_STEPS) for (const l of st.lessons) assert.ok(catalog.getLesson(l), `${st.id} → ${l}`);
});

test("Caso H — etapa já concluída: reabrir não dá XP de novo; desfazer devolve sem perder as irmãs", () => {
  const p = profile({ accountReady: "nao" });
  let map: TaskStatusMap = {};
  map = applyUpdates(map, chooseUpdates(buildJourney(buildPlan(p), map), map, "t-j-conta-decisao", "nao-tenho"));
  for (const id of ["t-j-conta-instalar", "t-j-conta-criar", "t-j-perfil-abrir", "t-j-perfil-foto-avatar", "t-j-perfil-nome", "t-j-perfil-bio"]) map = done(p, map, id);
  const before = xpOf(p, map);
  map = done(p, map, "t-j-perfil-conferir");
  const after = xpOf(p, map);
  assert.equal(after - before, 15, "a atividade t-perfil (ação) vale XP uma vez");
  const j = buildJourney(buildPlan(p), map);
  assert.deepEqual(completeUpdates(j, map, "t-j-perfil-conferir"), [], "concluir de novo não faz nada");
  const undone = applyUpdates(map, undoUpdates(j, map, "t-j-perfil-bio"));
  assert.equal(undone["t-perfil"], "pending");
  assert.equal(xpOf(p, undone), before, "desfazer tira o XP; concluir de novo devolve o mesmo valor");
  assert.equal(viewOf(buildJourney(buildPlan(p), undone), "t-j-perfil-nome")?.done, true, "irmãs continuam concluídas");
  assert.equal(xpOf(p, done(p, undone, "t-j-perfil-bio")), after);
});

test("Caso I — etapa bloqueada: mostra o que libera e não pode ser concluída", () => {
  const j = buildJourney(buildPlan(profile()), {});
  const v = viewOf(j, "t-j-produto-casa")!;
  assert.equal(v.state, "bloqueada");
  assert.deepEqual(v.missing.map((m) => m.id), ["t-aula-produto"]);
  assert.match(v.reason!, /Libera depois de: Como escolher produtos/);
  assert.deepEqual(completeUpdates(j, {}, "t-j-produto-casa"), []);
});

/* ------------------------------ Compatibilidade ------------------------------ */

test("progresso antigo preservado: atividade concluída no checklist ⇒ microetapas dela concluídas", () => {
  const p = profile();
  const map: TaskStatusMap = { "t-escolher-produto": "completed", "t-roteiros": "completed" };
  const j = buildJourney(buildPlan(p), map);
  for (const id of ["t-j-produto-casa", "t-j-produto-escolher", "t-j-roteiro-gancho"]) assert.equal(viewOf(j, id)?.done, true, id);
  for (const sc of SCENARIOS) {
    if (!sc.plan.profile) continue;
    const jj = buildJourney(buildPlan(sc.plan.profile), sc.plan.statusMap);
    const plan = buildPlan(sc.plan.profile);
    const legacyDone = plan.tasks.filter((t) => sc.plan.statusMap[t.id] === "completed");
    for (const t of legacyDone) assert.ok(jj.steps.filter((v) => v.applicable && (v.step.owner === t.id)).every((v) => v.done), `${sc.id}: ${t.id}`);
  }
});

test("links antigos: cada atividade do plano tem uma etapa de destino", () => {
  const p = profile();
  const plan = buildPlan(p);
  const j = buildJourney(plan, {});
  for (const t of plan.tasks) assert.ok(stepForTask(j, t.id), t.id);
  assert.equal(stepForTask(j, "t-escolher-produto")?.step.id, "t-j-produto-casa");
});

test("aulas × ações: concluir aula só marca etapas de aula; ações práticas não têm aula como gatilho", () => {
  const lessonTasks = new Set(TASK_CATALOG.filter((t) => t.lessonId).map((t) => t.id));
  for (const s of JOURNEY_STEPS) {
    if (s.kind === "acao") {
      assert.ok(!lessonTasks.has(s.id), `${s.id} é ação e não pode ser uma atividade de aula`);
      if (s.owner) assert.ok(!lessonTasks.has(s.owner), `${s.id}: dono ${s.owner} é atividade de aula`);
    }
    if (s.kind === "aula") assert.ok(lessonTasks.has(s.id) && s.owner === s.id, `${s.id}: etapa de aula = atividade de aula`);
  }
  // A sincronização antiga (DemoProvider) só toca atividades COM lessonId — nenhuma é prática.
  assert.ok(TASK_CATALOG.filter((t) => t.type === "action").every((t) => !t.lessonId));
});

test("progresso separa execução e aprendizado", () => {
  const p = profile();
  const j0 = buildJourney(buildPlan(p), {});
  const j1 = buildJourney(buildPlan(p), done(p, {}, "t-boas-vindas"));
  assert.equal(j1.progress.learning.done - j0.progress.learning.done, 1);
  assert.equal(j1.progress.execution.done, j0.progress.execution.done);
  assert.equal(j0.progress.total, j0.progress.execution.total + j0.progress.learning.total);
});

test("atalho do Início: a próxima microetapa pendente é a etapa atual, e a navegação segue a ordem", () => {
  const p = profile();
  const j = buildJourney(buildPlan(p), {});
  assert.ok(j.current && j.current.applicable && !j.current.done && j.current.missing.length === 0);
  const { prev, next } = neighbors(j, j.current!.step.id);
  assert.equal(prev, undefined);
  assert.ok(next && next.index > j.current!.index);
});

test("fluxo completo: percorrer as 6 fases em sequência termina o caminho e conta o XP uma vez por atividade", () => {
  const p = profile({ wantsToAppear: "nao", formats: ["maos_produto"], accountReady: "nao", goal: "consistencia" });
  let map: TaskStatusMap = {};
  for (const ph of JOURNEY_PHASES) {
    const j = buildJourney(buildPlan(p), map);
    if (j.phases.some((x) => x.phase.id === ph.id)) map = walkPhase(p, map, ph.id);
  }
  const j = buildJourney(buildPlan(p), map);
  assert.equal(j.current, null);
  assert.equal(j.progress.percent, 100);
  const plan = buildPlan(p);
  assert.ok(plan.tasks.every((t) => map[t.id] === "completed"), "todas as atividades do motor concluídas");
  assert.equal(xpOf(p, map), xpOf(p, { ...map }));
});

/* --------------------------------- Prints --------------------------------- */

test("prints: manifesto oficial vazio e válido; etapa sem print devolve lista vazia (placeholder)", () => {
  assert.deepEqual(printsFor("t-j-perfil-abrir", STEP_IDS), []);
  const ok = parsePrintsManifest(
    { version: 1, prints: [{ stepId: "t-j-perfil-abrir", order: 1, src: "/jornada/t-j-perfil-abrir-1.webp", alt: "Tela do perfil com o botão Editar perfil", caption: "Toque em Editar perfil", screen: "TikTok · Perfil", capturedAt: "2026-11-24", tapHint: { x: 50, y: 30 } }] },
    STEP_IDS,
  );
  assert.ok(ok.ok);
  const bad = parsePrintsManifest({ version: 1, prints: [{ stepId: "t-x", order: 0, src: "https://cdn.com/a.png", alt: "", caption: "", screen: "", capturedAt: "ontem", tapHint: { x: 150, y: 0 } }] }, STEP_IDS);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(bad.errors.length >= 5);
  const files = existsSync("public/jornada") ? readdirSync("public/jornada").filter((f) => /\.(png|jpe?g|webp)$/.test(f)) : [];
  assert.deepEqual(files, [], "nenhuma imagem inventada no repositório");
});

/* ------------------------- Persistência e servidor ------------------------- */

test("IDs gravados no formato aceito pelo banco (user_task_progress) e pela Server Action", () => {
  for (const id of journeyStatusIds()) assert.match(id, /^t-[a-z0-9-]{1,60}$/, id);
  assert.ok(journeyStatusIds().includes("t-j-flag-tem-conta"));
});

test("modo demo: microetapas sobrevivem ao snapshot opcional (mesma regra das tarefas)", () => {
  const map: TaskStatusMap = { "t-j-perfil-abrir": "completed", "t-j-flag-tem-conta": "completed" };
  const raw = serializeSnapshot({ scenario: "padrao", plan: { mode: "personalized", profile: EXAMPLE_PROFILE, statusMap: map }, demo: SCENARIOS[0].demo });
  assert.deepEqual(parseSnapshot(raw)?.plan.statusMap, map);
});

test("rota de etapa: ID desconhecido → 404; etapas válidas preservadas", () => {
  assert.equal(isUnknownDetailPath("/meu-plano/etapa/t-j-perfil-abrir"), false);
  assert.equal(isUnknownDetailPath("/meu-plano/etapa/t-boas-vindas"), false);
  assert.equal(isUnknownDetailPath("/meu-plano/etapa/nao-existe"), true);
  assert.equal(isUnknownDetailPath("/meu-plano"), false);
});
