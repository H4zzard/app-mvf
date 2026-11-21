import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { AchievementsView } from "@/components/conquistas/achievements-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Conquistas" };

export default function Page() {
  return (
    <DemoModule featureId="conquistas">
      <AchievementsView />
    </DemoModule>
  );
}
