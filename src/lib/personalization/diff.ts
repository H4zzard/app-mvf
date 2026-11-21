/**
 * Prévia de mudanças ao ajustar respostas: o que entra, o que sai e o que é
 * preservado. Módulo puro.
 */
import type { LearningPlan, PlanTask, TaskStatusMap } from "@/types";

export interface PlanDiff {
  added: PlanTask[];
  removed: PlanTask[];
  /** Atividades que continuam no plano. */
  keptCount: number;
  /** Concluídas que continuam visíveis e concluídas. */
  keptCompleted: number;
  /** Concluídas que saem do plano agora (o status fica guardado na sessão). */
  removedCompleted: number;
  /** Concluídas anteriormente fora do plano que VOLTAM com o novo plano. */
  restoredCompleted: number;
  before: { tasks: number; stages: number; days: number };
  after: { tasks: number; stages: number; days: number };
  unchanged: boolean;
}

export function diffPlans(
  previous: LearningPlan | null,
  next: LearningPlan,
  statusMap: TaskStatusMap,
): PlanDiff {
  const prevTasks = previous?.tasks ?? [];
  const prevIds = new Set(prevTasks.map((t) => t.id));
  const nextIds = new Set(next.tasks.map((t) => t.id));
  const done = (id: string) => statusMap[id] === "completed";

  const added = next.tasks.filter((t) => !prevIds.has(t.id));
  const removed = prevTasks.filter((t) => !nextIds.has(t.id));
  const kept = next.tasks.filter((t) => prevIds.has(t.id));
  const changedText =
    previous !== null &&
    (previous.title !== next.title ||
      previous.totalDaysSuggested !== next.totalDaysSuggested ||
      next.tasks.some((t) => {
        const old = prevTasks.find((p) => p.id === t.id);
        return !old || old.whyInPlan !== t.whyInPlan || old.daySuggestion !== t.daySuggestion;
      }));

  return {
    added,
    removed,
    keptCount: kept.length,
    keptCompleted: kept.filter((t) => done(t.id)).length,
    removedCompleted: removed.filter((t) => done(t.id)).length,
    restoredCompleted: added.filter((t) => done(t.id)).length,
    before: {
      tasks: prevTasks.length,
      stages: previous?.stages.length ?? 0,
      days: previous?.totalDaysSuggested ?? 0,
    },
    after: { tasks: next.tasks.length, stages: next.stages.length, days: next.totalDaysSuggested },
    unchanged: added.length === 0 && removed.length === 0 && !changedText,
  };
}
