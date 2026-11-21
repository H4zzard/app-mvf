import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { ChallengesView } from "@/components/gamificacao/challenges-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Desafios" };

export default function Page() {
  return (
    <DemoModule featureId="desafios">
      <ChallengesView />
    </DemoModule>
  );
}
