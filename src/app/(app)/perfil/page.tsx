import type { Metadata } from "next";
import { DemoModule } from "@/components/demo/demo-module";
import { ProfileView } from "@/components/extras/profile-view";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Perfil" };

export default function Page() {
  return (
    <DemoModule featureId="perfil">
      <ProfileView />
    </DemoModule>
  );
}
