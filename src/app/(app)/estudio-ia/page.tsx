import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { StudioView } from "@/components/estudio/studio-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Estúdio IA" };

export default function Page() {
  return (
    <DemoModule featureId="estudio-ia">
      <StudioView />
    </DemoModule>
  );
}
