import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { SupportView } from "@/components/extras/support-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Suporte" };

export default function Page() {
  return (
    <DemoModule featureId="suporte">
      <SupportView />
    </DemoModule>
  );
}
