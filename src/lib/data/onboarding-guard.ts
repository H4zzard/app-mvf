import "server-only";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { loadStudentState } from "@/lib/data/student-repo";

/**
 * Aluna autenticada sem onboarding concluído vai para /onboarding (no servidor).
 * Modo demo não redireciona (mantém a trilha de exemplo testável).
 */
export async function redirectToOnboardingIfNeeded(): Promise<void> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") return;
  const state = await loadStudentState(viewer.userId);
  if (!state.profile) redirect("/onboarding");
}
