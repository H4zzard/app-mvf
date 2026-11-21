import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { RewardsView } from "@/components/gamificacao/rewards-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Recompensas" };

export default function Page() {
  return (
    <DemoModule featureId="recompensas">
      <RewardsView />
    </DemoModule>
  );
}
