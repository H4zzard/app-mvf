/**
 * Conversão das linhas do banco para o estado do plano no cliente.
 * Módulo puro (testável). O carregamento em si fica em student-repo.ts.
 */
import type { OnboardingAnswers, OnboardingProfile, TaskStatus, TaskStatusMap } from "@/types";
import { sanitizeDraft, validateProfile } from "../../config/onboarding-questions.ts";

export interface PersistedPlanState {
  /** Perfil concluído e válido; `null` se ainda não fez (ou se ficou inválido após mudança de versão). */
  profile: OnboardingProfile | null;
  /** Rascunho para retomar o onboarding. */
  draft: OnboardingAnswers | null;
  /** Status por ID estável — inclusive de tarefas fora do plano atual. */
  statusMap: TaskStatusMap;
  /** Revisão do plano ativo (0 = nenhum). Usada no controle de concorrência. */
  revision: number;
}

export interface StateRows {
  submission: { answers: unknown; status: string } | null;
  activeRevision: number | null;
  progress: { task_id: string; status: string }[];
}

const STATUSES = new Set<TaskStatus>(["pending", "in_progress", "completed"]);

export function toPersistedState(rows: StateRows): PersistedPlanState {
  const statusMap: TaskStatusMap = {};
  for (const p of rows.progress) {
    if (STATUSES.has(p.status as TaskStatus)) statusMap[p.task_id] = p.status as TaskStatus;
  }
  let profile: OnboardingProfile | null = null;
  let draft: OnboardingAnswers | null = null;
  if (rows.submission) {
    const answers = sanitizeDraft(rows.submission.answers);
    if (rows.submission.status === "completed") {
      const v = validateProfile(answers);
      if (v.ok) profile = v.profile;
      else draft = answers; // versão antiga/incompleta: retoma como rascunho, sem inventar respostas
    } else {
      draft = Object.keys(answers).length > 0 ? answers : null;
    }
  }
  return { profile, draft, statusMap, revision: rows.activeRevision ?? 0 };
}
