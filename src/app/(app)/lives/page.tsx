import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { LivesView } from "@/components/extras/lives-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Lives" };

export default function Page() {
  return (
    <DemoModule featureId="lives">
      <LivesView />
    </DemoModule>
  );
}
