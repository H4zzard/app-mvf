/**
 * Motor da JORNADA INTERATIVA. Módulo PURO (sem React, rede, relógio ou storage).
 *
 * Entrada: o plano já gerado pelo motor de personalização (`buildPlan`) e o
 * `statusMap` do PlanProvider. Saída: fases, microetapas com estado, etapa atual,
 * progresso de execução × aprendizado. As ações (concluir, desfazer, escolher)
 * devolvem só ATUALIZAÇÕES do statusMap — quem grava é o PlanProvider (memória na
 * demo; Server Action + RLS no app real). Nenhum estado paralelo.
 *
 * XP: microetapas não dão XP sozinhas. Quando TODAS as etapas aplicáveis de uma
 * atividade antiga terminam, a atividade é marcada concluída e a regra de XP
 * existente (`computeXp`) conta UMA vez. Concluir de novo não muda nada.
 */
import type { PersonalizedPlan, TaskStatus, TaskStatusMap } from "@/types";
import { deriveContext, type PlanContext } from "../personalization/context.ts";
import { JOURNEY_PHASES, JOURNEY_STEPS } from "../../demo/journey-catalog.ts";
import { JOURNEY_VERSION, type Journey, type JourneyFlags, type JourneyPhase, type JourneyStep, type PhaseView, type StepView } from "./types.ts";

export interface JourneySources {
  steps: JourneyStep[];
  phases: JourneyPhase[];
}

const DEFAULT: JourneySources = { steps: JOURNEY_STEPS, phases: JOURNEY_PHASES };

export type StatusUpdate = [taskId: string, status: TaskStatus];

const isDone = (map: TaskStatusMap, id: string) => map[id] === "completed";
const resolve = <T>(v: T | ((ctx: PlanContext) => T), ctx: PlanContext): T => (typeof v === "function" ? (v as (c: PlanContext) => T)(ctx) : v);

export function readFlags(map: TaskStatusMap): JourneyFlags {
  return { hasAccount: isDone(map, "t-j-flag-tem-conta") ? true : isDone(map, "t-j-flag-sem-conta") ? false : null };
}

export function buildJourney(plan: PersonalizedPlan, map: TaskStatusMap, sources: JourneySources = DEFAULT): Journey {
  const ctx = deriveContext(plan.profile);
  const flags = readFlags(map);
  const planTasks = new Set(plan.tasks.map((t) => t.id));
  const byId = new Map(sources.steps.map((s) => [s.id, s]));

  const applicable = (s: JourneyStep) => (s.owner === null || planTasks.has(s.owner)) && (s.appliesWhen ? s.appliesWhen(ctx, flags) : true);
  const done = (s: JourneyStep): boolean => {
    if (s.kind === "decisao") return (s.options ?? []).some((o) => isDone(map, o.flagId));
    // Progresso histórico: atividade antiga concluída ⇒ suas microetapas contam como feitas.
    return isDone(map, s.id) || (s.owner !== null && s.owner !== s.id && isDone(map, s.owner));
  };
  const appl = new Map(sources.steps.map((s) => [s.id, applicable(s)]));
  const doneMap = new Map(sources.steps.map((s) => [s.id, done(s)]));
  const missingOf = (s: JourneyStep) =>
    s.prerequisites
      .map((id) => byId.get(id))
      .filter((p): p is JourneyStep => Boolean(p) && appl.get(p!.id) === true && !doneMap.get(p!.id))
      .map((p) => ({ id: p.id, title: p.title }));

  let currentId: string | null = null;
  for (const s of sources.steps) {
    if (appl.get(s.id) && !doneMap.get(s.id) && missingOf(s).length === 0) {
      currentId = s.id;
      break;
    }
  }

  const phaseById = new Map(sources.phases.map((p) => [p.id, p]));
  const counters = new Map<string, number>();
  const steps: StepView[] = sources.steps.map((s, index) => {
    const a = appl.get(s.id) as boolean;
    const d = a && (doneMap.get(s.id) as boolean);
    const missing = a && !d ? missingOf(s) : [];
    const n = a ? (counters.get(s.phase) ?? 0) + 1 : 0;
    if (a) counters.set(s.phase, n);
    const state: StepView["state"] = !a ? "nao_aplicavel" : d ? "concluida" : s.id === currentId ? "atual" : missing.length ? "bloqueada" : "disponivel";
    const reason = !a
      ? (s.notApplicableReason?.(ctx, flags) ?? "Esta etapa não se aplica ao seu perfil.")
      : missing.length
        ? `Libera depois de: ${missing.map((m) => m.title).join(", ")}.`
        : undefined;
    return {
      step: s,
      phase: phaseById.get(s.phase) as JourneyPhase,
      index,
      number: n,
      state,
      done: d,
      applicable: a,
      instruction: resolve(s.instruction, ctx),
      expected: resolve(s.expected, ctx),
      shortcut: s.shortcut ? resolve(s.shortcut, ctx) : undefined,
      missing,
      reason,
    };
  });

  const phases: PhaseView[] = sources.phases
    .map((phase) => {
      const own = steps.filter((v) => v.step.phase === phase.id);
      const app = own.filter((v) => v.applicable);
      return { phase, steps: own, done: app.filter((v) => v.done).length, total: app.length, complete: app.length > 0 && app.every((v) => v.done) };
    })
    .filter((p) => p.total > 0);

  const applicableViews = steps.filter((v) => v.applicable);
  const learning = applicableViews.filter((v) => v.step.kind === "aula");
  const execution = applicableViews.filter((v) => v.step.kind !== "aula");
  const doneCount = applicableViews.filter((v) => v.done).length;
  const current = steps.find((v) => v.step.id === currentId) ?? null;

  return {
    version: JOURNEY_VERSION,
    phases,
    steps,
    current,
    currentPhase: current ? (phases.find((p) => p.phase.id === current.step.phase) ?? null) : null,
    progress: {
      execution: { done: execution.filter((v) => v.done).length, total: execution.length },
      learning: { done: learning.filter((v) => v.done).length, total: learning.length },
      done: doneCount,
      total: applicableViews.length,
      percent: applicableViews.length ? Math.round((doneCount / applicableViews.length) * 100) : 0,
    },
    flags,
  };
}

export const viewOf = (j: Journey, stepId: string) => j.steps.find((v) => v.step.id === stepId);

/** Concluir uma microetapa. Vazio = nada a fazer (já concluída, bloqueada, não aplicável ou decisão). */
export function completeUpdates(j: Journey, map: TaskStatusMap, stepId: string): StatusUpdate[] {
  const v = viewOf(j, stepId);
  if (!v || !v.applicable || v.done || v.missing.length || v.step.kind === "decisao") return [];
  const updates: StatusUpdate[] = [[stepId, "completed"]];
  const owner = v.step.owner;
  if (owner && owner !== stepId && !isDone(map, owner)) {
    const siblings = j.steps.filter((s) => s.applicable && s.step.owner === owner && s.step.id !== stepId);
    if (siblings.every((s) => s.done)) updates.push([owner, "completed"]);
  }
  return updates;
}

/**
 * Desfazer (reabrir). Se a atividade antiga estava concluída, ela volta a pendente e as
 * outras microetapas dela ficam gravadas como concluídas (nada se perde).
 */
export function undoUpdates(j: Journey, map: TaskStatusMap, stepId: string): StatusUpdate[] {
  const v = viewOf(j, stepId);
  if (!v || !v.applicable || !v.done || v.step.kind === "decisao") return [];
  const updates: StatusUpdate[] = [[stepId, "pending"]];
  const owner = v.step.owner;
  if (owner && owner !== stepId && isDone(map, owner)) {
    updates.push([owner, "pending"]);
    for (const s of j.steps) {
      if (s.step.owner === owner && s.step.id !== stepId && s.applicable && s.done && !isDone(map, s.step.id)) updates.push([s.step.id, "completed"]);
    }
  }
  return updates;
}

/** Escolher uma opção de uma etapa de decisão (troca a escolha anterior, se houver). */
export function chooseUpdates(j: Journey, map: TaskStatusMap, stepId: string, optionId: string): StatusUpdate[] {
  const v = viewOf(j, stepId);
  const option = v?.step.options?.find((o) => o.id === optionId);
  if (!v || !v.applicable || !option || isDone(map, option.flagId)) return [];
  const updates: StatusUpdate[] = [[option.flagId, "completed"]];
  for (const o of v.step.options ?? []) if (o.id !== optionId && isDone(map, o.flagId)) updates.push([o.flagId, "pending"]);
  return updates;
}

export function applyUpdates(map: TaskStatusMap, updates: StatusUpdate[]): TaskStatusMap {
  const next = { ...map };
  for (const [id, s] of updates) next[id] = s;
  return next;
}

/** Primeira etapa aplicável (preferindo pendente) de uma atividade antiga — para links antigos. */
export function stepForTask(j: Journey, taskId: string): StepView | undefined {
  const own = j.steps.filter((v) => v.applicable && (v.step.owner === taskId || v.step.id === taskId));
  return own.find((v) => !v.done) ?? own[0];
}

/** Anterior/próxima etapa APLICÁVEL na ordem da jornada (navegação da tela de execução). */
export function neighbors(j: Journey, stepId: string): { prev?: StepView; next?: StepView } {
  const list = j.steps.filter((v) => v.applicable);
  const i = list.findIndex((v) => v.step.id === stepId);
  return i < 0 ? {} : { prev: list[i - 1], next: list[i + 1] };
}

export interface ReplanSummary {
  /** Concluídas que continuam valendo. */
  kept: string[];
  /** Passaram a não se aplicar (a conclusão, se houver, fica guardada). */
  removed: string[];
  /** Entraram no caminho. */
  added: string[];
}

export function replanSummary(before: Journey, after: Journey): ReplanSummary {
  const was = new Map(before.steps.map((v) => [v.step.id, v]));
  const out: ReplanSummary = { kept: [], removed: [], added: [] };
  for (const v of after.steps) {
    const b = was.get(v.step.id);
    if (!b) continue;
    if (b.applicable && !v.applicable) out.removed.push(v.step.id);
    else if (!b.applicable && v.applicable) out.added.push(v.step.id);
    else if (v.applicable && v.done && b.done) out.kept.push(v.step.id);
  }
  return out;
}

/** Todos os IDs que a jornada pode gravar (etapas + sinalizadores de decisão). */
export function journeyStatusIds(steps: JourneyStep[] = JOURNEY_STEPS): string[] {
  return [...new Set([...steps.map((s) => s.id), ...steps.flatMap((s) => (s.options ?? []).map((o) => o.flagId))])];
}

/* -------------------------------- Validação -------------------------------- */

const ID = /^t-[a-z0-9-]{1,60}$/;

export function checkJourneyCatalog(
  sources: JourneySources,
  opts: { taskIds: string[]; lessonExists: (id: string) => boolean; routeExists?: (href: string) => boolean },
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const phaseIds = new Set(sources.phases.map((p) => p.id));
  const owners = new Set<string>();
  sources.steps.forEach((s, i) => {
    if (!ID.test(s.id)) errors.push(`${s.id}: ID deve seguir t-… (minúsculas, números e hífen).`);
    if (seen.has(s.id)) errors.push(`${s.id}: ID repetido.`);
    if (!phaseIds.has(s.phase)) errors.push(`${s.id}: fase inexistente ${s.phase}.`);
    if (s.owner && !opts.taskIds.includes(s.owner)) errors.push(`${s.id}: atividade inexistente ${s.owner}.`);
    if (s.owner && opts.taskIds.includes(s.id) && s.owner !== s.id) errors.push(`${s.id}: o ID de uma atividade antiga só pode ser etapa dela mesma.`);
    if (s.owner) owners.add(s.owner);
    for (const p of s.prerequisites) if (!seen.has(p)) errors.push(`${s.id}: pré-requisito ${p} não é uma etapa anterior.`);
    for (const l of s.lessons) if (!opts.lessonExists(l)) errors.push(`${s.id}: aula inexistente ${l}.`);
    if (s.kind === "aula" && s.lessons.length === 0) errors.push(`${s.id}: etapa de aula sem aula.`);
    if (s.kind === "decisao" && (!s.options || s.options.length < 2)) errors.push(`${s.id}: decisão precisa de 2+ opções.`);
    for (const o of s.options ?? []) if (!ID.test(o.flagId)) errors.push(`${s.id}: sinalizador inválido ${o.flagId}.`);
    if (s.title.length > 60) errors.push(`${s.id}: título longo (máx. 60).`);
    if (typeof s.instruction === "string" && s.instruction.length > 220) errors.push(`${s.id}: instrução longa (máx. 220).`);
    if (/\d+\s?%|R\$|garant|fatur/i.test(`${s.title} ${typeof s.instruction === "string" ? s.instruction : ""}`)) errors.push(`${s.id}: sem números de métrica, valores ou garantias.`);
    if (opts.routeExists && s.shortcut && typeof s.shortcut !== "function" && !opts.routeExists(s.shortcut.href)) errors.push(`${s.id}: atalho para rota inexistente ${s.shortcut.href}.`);
    seen.add(s.id);
    void i;
  });
  for (const t of opts.taskIds) if (!owners.has(t)) errors.push(`Atividade ${t} sem nenhuma etapa na jornada (o progresso dela sumiria do mapa).`);
  return errors;
}
