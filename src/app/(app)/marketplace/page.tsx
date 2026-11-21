import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { MarketplaceView } from "@/components/marketplace/marketplace-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Marketplace" };

export default function Page() {
  return (
    <DemoModule featureId="marketplace">
      <MarketplaceView />
    </DemoModule>
  );
}
