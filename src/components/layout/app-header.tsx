"use client";

import { useSession } from "@/components/layout/session-provider";
import { NotificationsButton } from "@/components/layout/notifications-button";
import { SyncStatus } from "@/components/layout/sync-status";

/**
 * Topo mínimo (correção visual 25/11/2026): sem faixa, sem logo e sem nome da
 * marca. Só o sino de notificações, discreto, à direita — e, para contas reais,
 * o estado de sincronização (aparece quando há algo a dizer). Não é fixo: rola
 * com a página e deixa o conteúdo subir.
 * Sair da conta, identificação e controles da demo ficam no Perfil (e na lateral do desktop).
 */
export function AppHeader() {
  const { mode } = useSession();
  return (
    <div className="mx-auto flex w-full max-w-[1320px] items-center justify-end gap-2 px-4 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pt-5">
      {mode === "demo" ? null : <SyncStatus />}
      <NotificationsButton />
    </div>
  );
}
