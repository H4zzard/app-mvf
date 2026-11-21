import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { ViralsView } from "@/components/virais/virals-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Vídeos Virais" };

export default function Page() {
  return (
    <DemoModule featureId="videos-virais">
      <ViralsView />
    </DemoModule>
  );
}
