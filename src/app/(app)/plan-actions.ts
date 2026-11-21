"use server";

/**
 * Server Actions do plano. Cada ação:
 *  1. reautoriza no servidor (sessão verificada + acesso ativo no banco);
 *  2. valida a entrada (nada vindo do cliente é confiável);
 *  3. grava com o cliente da sessão → RLS garante "só a própria aluna".
 * O plano é SEMPRE gerado aqui pelo motor determinístico, nunca recebido do cliente.
 */
import type { TaskStatus } from "@/types";
import { ONBOARDING_VERSION, sanitizeDraft, validateProfile } from "@/config/onboarding-questions";
import { buildPlan, ENGINE_VERSION } from "@/lib/personalization/engine";
import { TASK_CATALOG } from "@/demo/task-catalog";
import { authorizeMemberAction } from "@/lib/auth/viewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: "unauthenticated" | "forbidden" | "unconfigured" | "demo" | "invalid" | "conflict" | "server" };

const KNOWN_TASK_IDS = new Set(TASK_CATALOG.map((t) => t.id));
const STATUSES = new Set<TaskStatus>(["pending", "in_progress", "completed"]);

export async function setTaskStatusAction(taskId: unknown, status: unknown): Promise<ActionResult> {
  if (typeof taskId !== "string" || !KNOWN_TASK_IDS.has(taskId) || !STATUSES.has(status as TaskStatus)) {
    return { ok: false, error: "invalid" };
  }
  const auth = await authorizeMemberAction();
  if (!auth.ok) return auth;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_task_status", { p_task_id: taskId, p_status: status });
  if (error) {
    console.error("[plano] set_task_status falhou", { code: error.code });
    return { ok: false, error: "server" };
  }
  return { ok: true };
}

export async function applyProfileAction(
  answers: unknown,
  expectedRevision: unknown,
): Promise<ActionResult<{ revision: number }>> {
  if (typeof expectedRevision !== "number" || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
    return { ok: false, error: "invalid" };
  }
  const validation = validateProfile(sanitizeDraft(answers));
  if (!validation.ok) return { ok: false, error: "invalid" };
  const auth = await authorizeMemberAction();
  if (!auth.ok) return auth;

  const plan = buildPlan(validation.profile);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("apply_onboarding", {
    p_answers: validation.profile,
    p_onboarding_version: ONBOARDING_VERSION,
    p_engine_version: ENGINE_VERSION,
    p_task_ids: plan.tasks.map((t) => t.id),
    p_plan: plan,
    p_expected_revision: expectedRevision,
  });
  if (error) {
    if (error.message?.includes("revision_conflict") || error.code === "40001") return { ok: false, error: "conflict" };
    console.error("[plano] apply_onboarding falhou", { code: error.code });
    return { ok: false, error: "server" };
  }
  return { ok: true, revision: data as number };
}

export async function saveOnboardingDraftAction(answers: unknown): Promise<ActionResult> {
  const draft = sanitizeDraft(answers);
  const auth = await authorizeMemberAction();
  if (!auth.ok) return auth;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_onboarding_draft", {
    p_answers: draft,
    p_onboarding_version: ONBOARDING_VERSION,
  });
  if (error) return { ok: false, error: "server" };
  return { ok: true };
}
