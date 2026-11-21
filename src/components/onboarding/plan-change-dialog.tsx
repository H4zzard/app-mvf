"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Minus, Plus, ShieldCheck, X } from "lucide-react";
import type { PlanDiff } from "@/lib/personalization/diff";
import { Button } from "@/components/ui/button";

const MAX_LISTED = 6;

/**
 * Confirmação explícita antes de recalcular o plano, com prévia do que muda.
 * Montado só enquanto aberto; <dialog> nativo (Esc fecha, foco preso).
 */
export function PlanChangeDialog({
  diff,
  onConfirm,
  onClose,
}: {
  diff: PlanDiff;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="plan-change-title"
      onClose={() => {
        // StrictMode/reaberturas: um "close" atrasado chega com o diálogo já aberto de novo — ignorar.
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className="mvf-sheet m-auto w-[min(34rem,calc(100vw-2rem))] max-w-none rounded-3xl bg-card p-0 text-fg shadow-raised"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6">
          <div>
            <h2 id="plan-change-title" className="font-serif text-xl font-semibold">
              {diff.unchanged ? "Seu plano continua igual" : "Revise as mudanças no seu plano"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {diff.unchanged
                ? "Com estas respostas, as atividades e a ordem do plano não mudam."
                : "Nada é aplicado até você confirmar."}
            </p>
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Atividades", diff.before.tasks, diff.after.tasks],
                ["Etapas", diff.before.stages, diff.after.stages],
                ["Dias sugeridos", diff.before.days, diff.after.days],
              ] as const
            ).map(([label, before, after]) => (
              <div key={label} className="rounded-xl bg-canvas px-2 py-3">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 flex items-center justify-center gap-1 font-semibold text-fg">
                  <span className="text-muted">{before}</span>
                  <ArrowRight aria-label="para" className="size-3.5 text-subtle" />
                  <span>{after}</span>
                </dd>
              </div>
            ))}
          </dl>

          {diff.added.length > 0 ? (
            <ChangeList icon={Plus} title={`Entram no plano (${diff.added.length})`} items={diff.added.map((t) => t.title)} />
          ) : null}
          {diff.removed.length > 0 ? (
            <ChangeList icon={Minus} title={`Saem do plano (${diff.removed.length})`} items={diff.removed.map((t) => t.title)} />
          ) : null}

          {!diff.unchanged ? (
            <div className="flex gap-3 rounded-2xl bg-success-soft p-4 text-sm text-fg">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              <ul className="space-y-1">
                <li>
                  {diff.keptCompleted === 1
                    ? "1 atividade concluída continua no plano, concluída."
                    : `${diff.keptCompleted} atividades concluídas continuam no plano, concluídas.`}
                </li>
                {diff.removedCompleted > 0 ? (
                  <li>
                    {diff.removedCompleted === 1
                      ? "1 atividade concluída sai do plano agora, mas o status fica guardado nesta sessão: se voltar ao plano, volta concluída."
                      : `${diff.removedCompleted} atividades concluídas saem do plano agora, mas o status fica guardado nesta sessão: se voltarem ao plano, voltam concluídas.`}
                  </li>
                ) : null}
                {diff.restoredCompleted > 0 ? (
                  <li>
                    {diff.restoredCompleted === 1
                      ? "1 atividade que você já tinha concluído volta ao plano, concluída."
                      : `${diff.restoredCompleted} atividades que você já tinha concluído voltam ao plano, concluídas.`}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
          <Button variant="secondary" onClick={() => ref.current?.close()}>
            {diff.unchanged ? "Voltar" : "Cancelar"}
          </Button>
          {!diff.unchanged ? <Button onClick={onConfirm}>Atualizar meu plano</Button> : null}
        </div>
      </div>
    </dialog>
  );
}

function ChangeList({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Plus;
  title: string;
  items: string[];
}) {
  const shown = items.slice(0, MAX_LISTED);
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Icon aria-hidden className="size-4 text-brand" />
        {title}
      </h3>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {shown.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-subtle" />
            {t}
          </li>
        ))}
        {items.length > shown.length ? <li className="pl-3">e mais {items.length - shown.length}.</li> : null}
      </ul>
    </section>
  );
}
