import type { OnboardingProfile } from "@/types";

/**
 * Nome usado nas saudações. Prioriza o nome preferido do onboarding.
 * Sem login real, não usamos o nome da conta demo: o fallback é “parceira”.
 */
export function greetingName(profile: OnboardingProfile | null | undefined): string {
  return profile?.preferredName?.trim() || "parceira";
}
