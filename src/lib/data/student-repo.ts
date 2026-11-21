import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toPersistedState, type PersistedPlanState } from "@/lib/data/student-state";

/**
 * Leitura do estado da aluna autenticada, com o cliente da SESSÃO (RLS):
 * só retorna linhas da própria aluna e só com acesso ativo.
 * Chamar apenas depois de getViewer() confirmar `member`.
 */
export const loadStudentState = cache(async (userId: string): Promise<PersistedPlanState> => {
  const supabase = await createSupabaseServerClient();
  const [submission, snapshot, progress] = await Promise.all([
    supabase.from("onboarding_submissions").select("answers, status").eq("user_id", userId).maybeSingle(),
    supabase.from("user_plan_snapshots").select("revision").eq("user_id", userId).eq("is_active", true).maybeSingle(),
    supabase.from("user_task_progress").select("task_id, status").eq("user_id", userId),
  ]);
  if (submission.error || snapshot.error || progress.error) {
    throw new Error("Falha ao carregar o plano.");
  }
  return toPersistedState({
    submission: submission.data,
    activeRevision: (snapshot.data?.revision as number | undefined) ?? null,
    progress: progress.data ?? [],
  });
});
