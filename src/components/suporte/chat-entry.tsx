import { MessagesSquare } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { supportChatStatus } from "@/lib/support-ai/server";

/**
 * “Ainda precisa de ajuda?” — fim da Central de ajuda. Decisão no SERVIDOR:
 * só aparece quando o atendimento por conversa está disponível para a sessão
 * (sem botão que leva a algo desligado).
 */
export async function ChatEntry() {
  const status = await supportChatStatus();
  if (!status.available) return null;
  return (
    <section aria-labelledby="chat-entry-title" className="mx-auto mt-8 max-w-[1320px] rounded-2xl bg-wine-deep p-5 text-on-wine shadow-raised sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-wine-soft text-on-wine">
            <MessagesSquare className="size-5" />
          </span>
          <div>
            <h2 id="chat-entry-title" className="text-lg font-semibold text-on-wine">
              Ainda precisa de ajuda?
            </h2>
            <p className="mt-1 text-sm text-on-wine-muted">Converse com o Assistente MVF e receba orientações sobre as aulas, ferramentas e sua jornada.</p>
          </div>
        </div>
        <ButtonLink href="/suporte/chat" variant="inverse" size="lg" className="shrink-0 self-start sm:self-center">
          Iniciar conversa
        </ButtonLink>
      </div>
    </section>
  );
}
