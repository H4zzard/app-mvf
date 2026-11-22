import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { AnimationTool } from "@/components/estudio/animation-tool";

// Ferramenta de TEXTO do Estúdio IA (demo local). Fora da demo: “Em breve”, decidido no servidor.
export const metadata: Metadata = { title: "Animar Personagem · Estúdio IA" };

export default function Page() {
  return (
    <DemoModule featureId="estudio-ia">
      <AnimationTool />
    </DemoModule>
  );
}
