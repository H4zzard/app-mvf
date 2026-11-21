"use client";

import { useEffect, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { usePlan } from "@/components/plan/plan-provider";
import { AnswersSummary } from "@/components/onboarding/answers-summary";
import { ButtonLink } from "@/components/ui/button";

/** “Ver minhas respostas”: resumo somente leitura + atalho para ajustar. */
export function AnswersDialog({ onClose }: { onClose: () => void }) {
  const { profile } = usePlan();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  if (!profile) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="answers-dialog-title"
      onClose={() => {
        // StrictMode/reaberturas: um "close" atrasado chega com o diálogo já aberto de novo — ignorar.
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className="mvf-sheet m-auto w-[min(34rem,calc(100vw-2rem))] max-w-none rounded-3xl bg-canvas p-0 text-fg shadow-raised"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
          <div>
            <h2 id="answers-dialog-title" className="font-serif text-xl font-semibold">
              Minhas respostas
            </h2>
            <p className="mt-1 text-sm text-muted">Seu plano foi montado a partir destas respostas.</p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Fechar"
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-2 sm:px-6">
          <AnswersSummary answers={profile} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <p className="text-xs text-muted">Você verá uma prévia antes de qualquer mudança.</p>
          <ButtonLink href="/onboarding" onClick={() => ref.current?.close()}>
            <SlidersHorizontal aria-hidden className="size-4" />
            Ajustar minhas respostas
          </ButtonLink>
        </div>
      </div>
    </dialog>
  );
}
