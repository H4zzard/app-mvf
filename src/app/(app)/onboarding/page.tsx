import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Monte seu plano" };

/**
 * Onboarding conversacional (roteirizado, sem IA). No produto real, a aluna
 * sem onboarding chegará aqui após login + validação de compra no servidor —
 * essa regra NÃO está implementada nesta fase.
 */
export default function OnboardingPage() {
  return <OnboardingFlow />;
}
