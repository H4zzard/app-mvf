import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { CharacterTool } from "@/components/estudio/character-tool";

// Ferramenta de TEXTO do Estúdio IA (demo local). Fora da demo: “Em breve”, decidido no servidor.
export const metadata: Metadata = { title: "Criar Personagem · Estúdio IA" };

export default function Page() {
  return (
    <DemoModule featureId="estudio-ia">
      <CharacterTool />
    </DemoModule>
  );
}
