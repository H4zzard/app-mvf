import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { CommunityView } from "@/components/comunidade/community-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Comunidade" };

export default function Page() {
  return (
    <DemoModule featureId="comunidade">
      <CommunityView />
    </DemoModule>
  );
}
