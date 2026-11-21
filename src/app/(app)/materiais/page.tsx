import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { MaterialsView } from "@/components/extras/materials-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Materiais" };

export default function Page() {
  return (
    <DemoModule featureId="materiais">
      <MaterialsView />
    </DemoModule>
  );
}
