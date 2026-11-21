/**
 * Seletores puros do plano. Não dependem de React nem da origem dos dados,
 * então servem tanto para a demonstração quanto para dados reais futuros.
 */
import type { LearningPlan, PlanStage, PlanTask, TaskStatus, TaskStatusMap } from "@/types";

export interface Progress {
  total: number;
  completed: number;
  remaining: number;
  percent: number;
}

export function getStatus(map: TaskStatusMap, taskId: string): TaskStatus {
  return map[taskId] ?? "pending";
}

/** Tarefas na ordem do plano (ordem da etapa, depois ordem da tarefa). */
export function orderedTasks(plan: LearningPlan): PlanTask[] {
  const stageOrder = new Map(plan.stages.map((s) => [s.id, s.order]));
  return [...plan.tasks].sort(
    (a, b) =>
      (stageOrder.get(a.stageId) ?? 0) - (stageOrder.get(b.stageId) ?? 0) ||
      a.order - b.order,
  );
}

export function tasksOfStage(plan: LearningPlan, stageId: string): PlanTask[] {
  return orderedTasks(plan).filter((t) => t.stageId === stageId);
}

function progressOf(tasks: PlanTask[], map: TaskStatusMap): Progress {
  const total = tasks.length;
  const completed = tasks.filter((t) => getStatus(map, t.id) === "completed").length;
  return {
    total,
    completed,
    remaining: total - completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function computeProgress(plan: LearningPlan, map: TaskStatusMap): Progress {
  return progressOf(plan.tasks, map);
}

export function computeStageProgress(
  plan: LearningPlan,
  map: TaskStatusMap,
  stageId: string,
): Progress {
  return progressOf(tasksOfStage(plan, stageId), map);
}

export function missingPrerequisites(
  plan: LearningPlan,
  map: TaskStatusMap,
  task: PlanTask,
): PlanTask[] {
  return task.prerequisites
    .filter((id) => getStatus(map, id) !== "completed")
    .map((id) => plan.tasks.find((t) => t.id === id))
    .filter((t): t is PlanTask => Boolean(t));
}

/**
 * Próximo passo, sempre extraído da fila do plano:
 * 1. a tarefa "em andamento";
 * 2. a primeira pendente NÃO opcional com pré-requisitos cumpridos;
 * 3. a primeira pendente não opcional;
 * 4. a primeira pendente opcional.
 * Plano vazio ou todo concluído → `undefined`.
 */
export function getNextTask(plan: LearningPlan, map: TaskStatusMap): PlanTask | undefined {
  const tasks = orderedTasks(plan);
  const open = tasks.filter((t) => getStatus(map, t.id) !== "completed");
  const required = open.filter((t) => !t.optional);
  return (
    open.find((t) => getStatus(map, t.id) === "in_progress") ??
    required.find((t) => missingPrerequisites(plan, map, t).length === 0) ??
    required[0] ??
    open[0]
  );
}

/** Próximas `count` tarefas não concluídas, começando pelo próximo passo. */
export function getUpcomingTasks(
  plan: LearningPlan,
  map: TaskStatusMap,
  count: number,
): PlanTask[] {
  const next = getNextTask(plan, map);
  if (!next) return [];
  const rest = orderedTasks(plan).filter(
    (t) => t.id !== next.id && getStatus(map, t.id) !== "completed",
  );
  return [next, ...rest].slice(0, count);
}

/**
 * Sugestão de rotina: tarefas seguintes que cabem nos minutos diários.
 * Sempre inclui ao menos uma tarefa, mesmo que ultrapasse o tempo.
 */
export function getDailySuggestion(
  plan: LearningPlan,
  map: TaskStatusMap,
  dailyMinutes: number,
): { tasks: PlanTask[]; totalMinutes: number } {
  const upcoming = getUpcomingTasks(plan, map, plan.tasks.length);
  const tasks: PlanTask[] = [];
  let totalMinutes = 0;
  for (const task of upcoming) {
    if (tasks.length > 0 && totalMinutes + task.durationMinutes > dailyMinutes) break;
    tasks.push(task);
    totalMinutes += task.durationMinutes;
  }
  return { tasks, totalMinutes };
}

export function getStage(plan: LearningPlan, stageId: string): PlanStage | undefined {
  return plan.stages.find((s) => s.id === stageId);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** "Dia 3" ou, quando a atividade passa do tempo diário, "Dias 3–4". */
export function formatTaskDays(task: PlanTask): string {
  return task.dayEnd && task.dayEnd > task.daySuggestion
    ? `Dias ${task.daySuggestion}–${task.dayEnd}`
    : `Dia ${task.daySuggestion}`;
}

export function formatDayRange(stage: PlanStage): string {
  const { start, end } = stage.dayRange;
  return start === end ? `Dia ${start}` : `Dias ${start}–${end}`;
}
