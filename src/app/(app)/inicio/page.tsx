import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { OnboardingGate } from "@/components/auth/onboarding-gate";

export const metadata: Metadata = { title: "Início" };

export default function InicioPage() {
  return (
    <OnboardingGate>
      <DashboardView />
    </OnboardingGate>
  );
}
