import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { StudioHub } from "@/components/estudio/studio-hub";

// Demo local: três ferramentas de TEXTO com modelos locais. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Estúdio IA" };

export default function Page() {
  return (
    <DemoModule featureId="estudio-ia">
      <StudioHub />
    </DemoModule>
  );
}
