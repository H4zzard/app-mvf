import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoModule } from "@/components/demo/demo-module";
import { SupportView } from "@/components/extras/support-view";
import { ChatEntry } from "@/components/suporte/chat-entry";

// Demo local: tela interativa com dados de exemplo. Alunas reais: “Em breve” (sem dados fictícios).
export const metadata: Metadata = { title: "Suporte" };

export default function Page() {
  return (
    <>
      <DemoModule featureId="suporte">
        <SupportView />
      </DemoModule>
      {/* Assistente MVF: só aparece se o atendimento estiver disponível (decisão no servidor). */}
      <Suspense fallback={null}>
        <ChatEntry />
      </Suspense>
    </>
  );
}
