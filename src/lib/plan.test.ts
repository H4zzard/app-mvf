import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { LearningPlan, PlanTask } from "@/types";
import { computeProgress, computeStageProgress, getDailySuggestion, getNextTask, getUpcomingTasks } from "./plan.ts";

function task(id: string, extra: Partial<PlanTask> = {}): PlanTask {
  return {
    id,
    stageId: "s1",
    order: 1,
    title: id,
    type: "action",
    durationMinutes: 10,
    prerequisites: [],
    daySuggestion: 1,
    description: "",
    objective: "",
    completionCriteria: "",
    whyInPlan: "",
    ...extra,
  };
}

function plan(tasks: PlanTask[]): LearningPlan {
  return {
    id: "p",
    title: "",
    subtitle: "",
    profileLabel: "",
    totalDaysSuggested: 1,
    stages: [{ id: "s1", order: 1, title: "", shortTitle: "", description: "", dayRange: { start: 1, end: 1 } }],
    tasks: tasks.map((t, i) => ({ ...t, order: i + 1 })),
  };
}

describe("seletores do plano", () => {
  test("plano vazio: 0%, sem próximo passo, sem rotina", () => {
    const p = plan([]);
    assert.deepEqual(computeProgress(p, {}), { total: 0, completed: 0, remaining: 0, percent: 0 });
    assert.equal(getNextTask(p, {}), undefined);
    assert.deepEqual(getUpcomingTasks(p, {}, 3), []);
    assert.deepEqual(getDailySuggestion(p, {}, 30), { tasks: [], totalMinutes: 0 });
    assert.equal(computeStageProgress(p, {}, "s1").percent, 0);
  });

  test("tudo concluído: 100% e sem próximo passo", () => {
    const p = plan([task("a"), task("b")]);
    const done = { a: "completed", b: "completed" } as const;
    assert.equal(computeProgress(p, done).percent, 100);
    assert.equal(getNextTask(p, done), undefined);
  });

  test("status de atividades fora do plano não contam no progresso", () => {
    const p = plan([task("a"), task("b")]);
    assert.equal(computeProgress(p, { a: "completed", fora: "completed" }).completed, 1);
  });

  test("próximo passo prioriza em andamento, depois obrigatória com pré-requisitos cumpridos", () => {
    const p = plan([task("a"), task("b", { prerequisites: ["a"] }), task("c")]);
    assert.equal(getNextTask(p, { c: "in_progress" })?.id, "c");
    assert.equal(getNextTask(p, {})?.id, "a");
  });

  test("opcionais ficam para depois das obrigatórias, mas não somem", () => {
    const p = plan([task("opt", { optional: true }), task("req")]);
    assert.equal(getNextTask(p, {})?.id, "req");
    assert.equal(getNextTask(p, { req: "completed" })?.id, "opt");
  });

  test("pré-requisito não bloqueia: sem candidata livre, devolve a primeira pendente", () => {
    const p = plan([task("x", { prerequisites: ["fora-do-plano"] })]);
    assert.equal(getNextTask(p, {})?.id, "x");
  });
});
