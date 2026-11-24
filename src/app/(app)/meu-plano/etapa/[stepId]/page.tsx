import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OnboardingGate } from "@/components/auth/onboarding-gate";
import { JourneyStepView } from "@/components/plan/journey-step";
import { JOURNEY_STEPS } from "@/demo/journey-catalog";
import PageLoading from "@/app/(app)/loading";

export const metadata: Metadata = { title: "Etapa do plano" };

/** Uma microetapa da jornada (Meu Plano 2.0). ID desconhecido → 404 (o Proxy responde antes). */
export default function Page({ params }: PageProps<"/meu-plano/etapa/[stepId]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <StepPage params={params} />
    </Suspense>
  );
}

async function StepPage({ params }: { params: PageProps<"/meu-plano/etapa/[stepId]">["params"] }) {
  const { stepId } = await params;
  if (!JOURNEY_STEPS.some((s) => s.id === stepId)) notFound();
  return (
    <OnboardingGate>
      <JourneyStepView stepId={stepId} />
    </OnboardingGate>
  );
}
