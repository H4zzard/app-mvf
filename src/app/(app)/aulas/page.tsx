import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { CatalogView } from "@/components/aulas/catalog-view";

// Demo local: área de membros em trilhos (capas oficiais, aulas de exemplo). Alunas reais: “Em breve”.
export const metadata: Metadata = { title: "Aulas" };

export default function Page() {
  return (
    <DemoModule featureId="aulas">
      <CatalogView />
    </DemoModule>
  );
}
