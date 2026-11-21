"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, CircleCheck, CirclePlay, Info, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useActivePlan } from "@/components/plan/plan-provider";
import { TaskDuration, TaskStatusBadge, TaskTypeLabel } from "@/components/plan/task-meta";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/badge";
import { getDemoLesson } from "@/demo/lessons";
import { formatTaskDays, getStage, getStatus } from "@/lib/plan";
import { cn } from "@/lib/cn";

/**
 * Painel de detalhes da tarefa com <dialog> nativo: foco preso, Esc fecha e
 * o foco volta ao gatilho. Bottom sheet no mobile, painel lateral a partir de 640 px.
 * Montado apenas enquanto há uma tarefa selecionada.
 */
export function TaskDetailDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { plan, statusMap, toggleComplete, setTaskStatus, persistence } = useActivePlan();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const task = plan.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const status = getStatus(statusMap, task.id);
  const stage = getStage(plan, task.stageId);
  const lesson = getDemoLesson(task.lessonId);
  const titleId = `task-dialog-title-${task.id}`;
  const prereqs = task.prerequisites
    .map((id) => plan.tasks.find((t) => t.id === id))
    .filter((t) => t !== undefined);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        // StrictMode/reaberturas: um "close" atrasado chega com o diálogo já aberto de novo — ignorar.
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className={cn(
        "mvf-sheet fixed m-0 max-w-none bg-card p-0 text-fg shadow-raised",
        // Mobile: bottom sheet
        "inset-x-0 bottom-0 top-auto max-h-[88dvh] w-full rounded-t-3xl",
        // ≥ 640 px: painel lateral direito
        "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[460px] sm:rounded-l-3xl sm:rounded-tr-none",
      )}
    >
      <div className="flex max-h-[inherit] flex-col sm:h-full">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
              Etapa {stage?.order} · {stage?.title}
            </p>
            <h2 id={titleId} className="mt-1 font-serif text-xl font-semibold leading-snug text-fg">
              {task.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
              <TaskStatusBadge status={status} />
              <TaskTypeLabel type={task.type} />
              <TaskDuration minutes={task.durationMinutes} />
              <span className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden className="size-3.5" />
                Sugestão: {formatTaskDays(task)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Fechar detalhes"
            className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="rounded-2xl bg-blush/70 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-brand">
              <Sparkles aria-hidden className="size-4" />
              Por que isto está no seu plano
            </h3>
            <p className="mt-1.5 text-sm text-fg">{task.whyInPlan}</p>
            <div className="mt-3">
              <DemoBadge label="Regras e conteúdo em validação" />
            </div>
          </section>

          {task.optional ? (
            <p className="rounded-xl border border-line bg-canvas/60 p-3 text-sm text-muted">
              <strong className="text-fg">Opcional para o seu perfil.</strong> Pode pular se o conteúdo já for familiar
              — o próximo passo prioriza as atividades obrigatórias.
            </p>
          ) : null}
          {task.dayEnd ? (
            <p className="text-xs text-muted">
              Esta atividade passa do seu tempo diário, então a sugestão ocupa mais de um dia. Não precisa fazer tudo de
              uma vez.
            </p>
          ) : null}

          <Detail title="O que fazer">{task.description}</Detail>
          <Detail title="Objetivo">{task.objective}</Detail>
          <Detail title="Como saber que concluiu">{task.completionCriteria}</Detail>

          {prereqs.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-fg">Idealmente depois de</h3>
              <ul className="mt-2 space-y-1.5">
                {prereqs.map((p) => {
                  const done = getStatus(statusMap, p.id) === "completed";
                  return (
                    <li key={p.id} className="flex items-start gap-2 text-sm">
                      <CircleCheck
                        aria-hidden
                        className={cn("mt-0.5 size-4 shrink-0", done ? "text-success" : "text-line-strong")}
                      />
                      <span className={done ? "text-muted" : "text-fg"}>
                        {p.title}
                        <span className="sr-only">{done ? " (concluída)" : " (pendente)"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Recomendação de ordem — você pode seguir no seu ritmo.
              </p>
            </section>
          ) : null}

          {lesson ? (
            <section className="rounded-2xl border border-line p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <CirclePlay aria-hidden className="size-4 text-brand" />
                Aula relacionada
              </h3>
              <p className="mt-1 text-sm text-fg">{lesson.title}</p>
              <p className="text-xs text-muted">Módulo: {lesson.module}</p>
              {persistence === "memory" ? (
                <Link
                  href={`/aulas/${lesson.id}`}
                  className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold text-fg transition-colors hover:border-brand/40 hover:bg-blush"
                >
                  <CirclePlay aria-hidden className="size-4 text-brand" />
                  Abrir aula
                </Link>
              ) : (
                <>
                  <p className="mt-3 flex gap-2 text-xs text-muted">
                    <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    Conteúdo será disponibilizado no app. Por enquanto, as aulas do método seguem na área de membros
                    atual.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3" disabled>
                    Aula disponível em breve
                  </Button>
                </>
              )}
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button
            className="flex-1"
            variant={status === "completed" ? "secondary" : "primary"}
            onClick={() => toggleComplete(task.id)}
          >
            {status === "completed" ? "Desmarcar conclusão" : "Marcar como concluída"}
          </Button>
          {status === "pending" ? (
            <Button variant="secondary" onClick={() => setTaskStatus(task.id, "in_progress")}>
              Começar agora
            </Button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </section>
  );
}
