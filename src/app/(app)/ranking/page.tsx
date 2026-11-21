import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { RankingView } from "@/components/gamificacao/ranking-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Ranking" };

export default function Page() {
  return (
    <DemoModule featureId="ranking">
      <RankingView />
    </DemoModule>
  );
}
