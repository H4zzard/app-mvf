import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { RulesFaqView } from "@/components/extras/rules-faq-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Regras & FAQ" };

export default function Page() {
  return (
    <DemoModule featureId="regras-faq">
      <RulesFaqView />
    </DemoModule>
  );
}
