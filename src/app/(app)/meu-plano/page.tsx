import type { Metadata } from "next";
import { PlanView } from "@/components/plan/plan-view";
import { OnboardingGate } from "@/components/auth/onboarding-gate";

export const metadata: Metadata = { title: "Meu Plano" };

export default function MeuPlanoPage() {
  return (
    <OnboardingGate>
      <PlanView />
    </OnboardingGate>
  );
}
