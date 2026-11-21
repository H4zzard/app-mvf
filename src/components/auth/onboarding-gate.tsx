import { Suspense } from "react";
import { redirectToOnboardingIfNeeded } from "@/lib/data/onboarding-guard";
import PageLoading from "@/app/(app)/loading";

/**
 * Envolve uma página que exige onboarding concluído. A checagem (servidor)
 * fica atrás de <Suspense>, como pede o Cache Components.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  await redirectToOnboardingIfNeeded();
  return <>{children}</>;
}
