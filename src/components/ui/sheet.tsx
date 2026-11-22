"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Painel com <dialog> nativo: bottom sheet no celular e painel lateral a
 * partir de 640 px. Foco preso, Esc e clique fora fecham, foco volta ao gatilho.
 * Monte apenas enquanto estiver aberto (`{open ? <Sheet …/> : null}`) e feche
 * no `useLayoutEffect` de limpeza da página (telas escondidas por <Activity>).
 */
export function Sheet({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  size = "md",
  labelledBy,
  onRequestClose,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  labelledBy?: string;
  /**
   * Opcional: chamado antes de fechar (Esc, clique fora, botão X). Retorne `false`
   * para manter aberto (ex.: confirmar antes de descartar edições não salvas).
   */
  onRequestClose?: () => boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const autoId = useId();
  const titleId = labelledBy ?? `sheet-${autoId}`;
  const requestClose = () => {
    if (onRequestClose && onRequestClose() === false) return;
    ref.current?.close();
  };

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        // StrictMode/reaberturas: um "close" atrasado chega com o diálogo aberto de novo — ignorar.
        if (!ref.current?.open) onClose();
      }}
      onCancel={(e) => {
        // Esc: respeita o veto de onRequestClose.
        if (onRequestClose && onRequestClose() === false) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      className={cn(
        "mvf-sheet fixed m-0 max-w-none bg-card p-0 text-fg shadow-raised",
        "inset-x-0 bottom-0 top-auto max-h-[90dvh] w-full rounded-t-3xl",
        "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:rounded-l-3xl sm:rounded-tr-none",
        size === "lg" ? "sm:w-[560px]" : "sm:w-[460px]",
      )}
    >
      <div className="flex max-h-[inherit] flex-col sm:h-full">
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3.5 pt-3 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            {eyebrow ? <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-subtle">{eyebrow}</div> : null}
            <h2 id={titleId} className="font-serif text-xl font-semibold leading-snug text-fg">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fechar"
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap gap-2 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
