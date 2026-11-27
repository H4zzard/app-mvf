import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChatView } from "@/components/suporte/chat-view";
import { supportChatStatus } from "@/lib/support-ai/server";
import PageLoading from "@/app/(app)/loading";

export const metadata: Metadata = { title: "Nina · Suporte MVF" };

/**
 * Atendimento do Assistente MVF. Decisão NO SERVIDOR:
 * - demo local: chat com adaptador em memória (rotulado);
 * - conta real: só com o suporte ativado (flag + banco + DeepSeek). Senão, aviso honesto.
 * A barra inferior e a lateral ficam ocultas aqui pela regra de “modo foco” do App Shell.
 */
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const status = await supportChatStatus();
  if (status.available) return <ChatView demo={status.demo} providerLabel={status.providerLabel} />;
  // Desenvolvimento: DeepSeek escolhida sem chave → avisa (nunca usa o modelo local escondido).
  const missingKey = status.demo && status.reason === "missing_key";
  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      <Link href="/suporte" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand hover:bg-blush">
        <ArrowLeft aria-hidden className="size-4" /> Voltar para a Central de ajuda
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-fg">Assistente MVF</h1>
      <p className="text-muted">
        {missingKey
          ? "A conversa está configurada para usar a DeepSeek (MVF_SUPPORT_PROVIDER=deepseek), mas a chave DEEPSEEK_API_KEY não foi encontrada no servidor. Veja docs/CONFIGURACAO_NINA.md."
          : "O atendimento por conversa ainda não foi ativado. Enquanto isso, use as respostas da Central de ajuda."}
      </p>
    </div>
  );
}
