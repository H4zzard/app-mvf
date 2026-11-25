"use client";

import Link from "next/link";
import { CircleAlert, CloudCheck, LoaderCircle, X } from "lucide-react";
import { usePlan } from "@/components/plan/plan-provider";

/** Indicador de salvamento no servidor (só no modo real). */
export function SyncStatus() {
  const { sync, dismissSyncError } = usePlan();

  if (sync.error) {
    return (
      <div
        role="alert"
        className="flex max-w-[min(22rem,60vw)] items-center gap-2 rounded-full border border-brand/30 bg-blush py-1 pl-3 pr-1 text-xs text-brand"
      >
        <CircleAlert aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{sync.error}</span>
        {sync.sessionExpired ? (
          <Link href="/login?erro=sessao" className="shrink-0 font-semibold underline">
            Entrar
          </Link>
        ) : null}
        <button
          type="button"
          onClick={dismissSyncError}
          aria-label="Fechar aviso"
          className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-paper"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <span aria-live="polite" className="hidden items-center gap-1.5 text-xs text-muted md:inline-flex">
      {sync.pending > 0 ? (
        <>
          <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
          Salvando…
        </>
      ) : (
        <>
          <CloudCheck aria-hidden className="size-3.5 text-brand" />
          Progresso salvo
        </>
      )}
    </span>
  );
}
