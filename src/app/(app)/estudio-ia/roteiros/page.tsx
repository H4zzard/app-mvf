import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { RecordingTool } from "@/components/estudio/recording-tool";

// Ferramenta de TEXTO do Estúdio IA (demo local). Fora da demo: “Em breve”, decidido no servidor.
export const metadata: Metadata = { title: "Roteiros para Gravar Aparecendo · Estúdio IA" };

export default function Page() {
  return (
    <DemoModule featureId="estudio-ia">
      <RecordingTool />
    </DemoModule>
  );
}
