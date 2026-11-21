"use client";

import { useLayoutEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Filter,
  Lightbulb,
  ListChecks,
  PartyPopper,
  Route,
  RotateCcw,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { useActivePlan, usePlan } from "@/components/plan/plan-provider";
import { AnswersDialog } from "@/components/plan/answers-dialog";
import { PersonalizeBanner } from "@/components/onboarding/personalize-callout";
import { PhaseTrack } from "@/components/plan/phase-track";
import { TaskCard } from "@/components/plan/task-card";
import { TaskDetailDialog } from "@/components/plan/task-detail-dialog";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  computeProgress,
  computeStageProgress,
  formatDayRange,
  getNextTask,
  getStatus,
  tasksOfStage,
} from "@/lib/plan";
import { cn } from "@/lib/cn";

type FilterId = "all" | "pending" | "completed";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendentes" },
  { id: "completed", label: "Concluídas" },
];

export function PlanView() {
  const { plan } = usePlan();
  if (!plan) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow={<span>Meu Plano</span>} title="Você ainda não tem um plano" />
        <EmptyState
          icon={Route}
          title="Monte seu plano personalizado"
          description="Responda algumas perguntas rápidas e o app monta as etapas e atividades na ordem certa para você. A biblioteca de aulas continua disponível independentemente do plano."
          action={<ButtonLink href="/onboarding">Montar meu plano</ButtonLink>}
        />
      </div>
    );
  }
  return <PlanContent />;
}

function PlanContent() {
  const { plan, mode, statusMap, resetDemo, persistence } = useActivePlan();
  const memory = persistence === "memory";
  const [filter, setFilter] = useState<FilterId>("all");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [answersOpen, setAnswersOpen] = useState(false);
  const isPersonalized = mode === "personalized";

  // Com Cache Components a tela fica "escondida" (Activity) ao navegar;
  // fechamos os painéis para não reabrirem em estado antigo (nem deixar um
  // <dialog> modal aberto numa tela escondida).
  useLayoutEffect(
    () => () => {
      setOpenTaskId(null);
      setAnswersOpen(false);
    },
    [],
  );

  // Concluídas que saíram do plano após um ajuste (status guardado na sessão).
  const planIds = new Set(plan.tasks.map((t) => t.id));
  const offPlanCompleted = Object.entries(statusMap).filter(
    ([id, s]) => s === "completed" && !planIds.has(id),
  ).length;

  const progress = computeProgress(plan, statusMap);
  const next = getNextTask(plan, statusMap);
  const counts: Record<FilterId, number> = {
    all: progress.total,
    pending: progress.remaining,
    completed: progress.completed,
  };

  const matches = (taskId: string) => {
    const done = getStatus(statusMap, taskId) === "completed";
    return filter === "all" || (filter === "completed" ? done : !done);
  };

  const visibleStages = plan.stages
    .map((stage) => ({ stage, tasks: tasksOfStage(plan, stage.id).filter((t) => matches(t.id)) }))
    .filter((s) => s.tasks.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <>
            <span>Meu Plano</span>
            <DemoBadge
              label={`${isPersonalized ? "Plano personalizado" : "Exemplo de trilha"} · ${plan.profileLabel}`}
            />
          </>
        }
        title={plan.title}
        description={plan.subtitle}
        actions={
          isPersonalized ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setAnswersOpen(true)} aria-haspopup="dialog">
                <ListChecks aria-hidden className="size-4" />
                Ver minhas respostas
              </Button>
              <ButtonLink href="/onboarding" variant="secondary" size="sm">
                <SlidersHorizontal aria-hidden className="size-4" />
                Ajustar meu plano
              </ButtonLink>
            </>
          ) : undefined
        }
      />

      {!isPersonalized ? <PersonalizeBanner /> : null}

      {/* Resumo do plano */}
      <Card className="p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Progresso geral</p>
                <p className="font-serif text-4xl font-semibold text-fg">
                  {progress.percent}
                  <span className="text-2xl">%</span>
                </p>
              </div>
              <div className="text-right text-sm text-muted">
                <p>
                  <strong className="text-fg">{progress.completed}</strong> de {progress.total} concluídas
                </p>
                <p className="inline-flex items-center gap-1">
                  <CalendarDays aria-hidden className="size-3.5" />
                  {plan.totalDaysSuggested} dias sugeridos · no seu ritmo
                </p>
              </div>
            </div>
            <ProgressBar value={progress.percent} label="Progresso geral do plano" className="mt-3" />
          </div>

          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            {next ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                    Próxima tarefa
                  </p>
                  <p className="mt-0.5 font-medium text-fg">{next.title}</p>
                </div>
                <Button size="sm" onClick={() => setOpenTaskId(next.id)}>
                  Abrir
                  <ArrowRight aria-hidden className="size-4" />
                </Button>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <PartyPopper aria-hidden className="size-4" />
                Você concluiu todas as atividades deste plano.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="sr-only">Etapas do plano</h2>
          <PhaseTrack currentStageId={next?.stageId} />
        </div>
      </Card>

      {isPersonalized && plan.tips.length > 0 ? (
        <section aria-labelledby="plan-tips-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="plan-tips-title" className="flex items-center gap-2 font-serif text-lg font-semibold text-fg">
            <Lightbulb aria-hidden className="size-5 text-coral" />
            Como seu plano foi montado
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {plan.tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {tip}
              </li>
            ))}
            {offPlanCompleted > 0 ? (
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {offPlanCompleted === 1
                  ? "1 atividade concluída saiu do plano após o ajuste. O status ficou guardado nesta sessão: se ela voltar, volta concluída."
                  : `${offPlanCompleted} atividades concluídas saíram do plano após o ajuste. O status ficou guardado nesta sessão: se voltarem, voltam concluídas.`}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar tarefas" className="flex max-w-full items-center gap-0.5 rounded-full border border-line bg-card p-1 min-[360px]:gap-1">
          <Filter aria-hidden className="ml-2 mr-1 hidden size-4 text-subtle sm:block" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "min-h-10 rounded-full px-2.5 text-[0.8125rem] font-medium transition-colors min-[360px]:px-3.5 min-[360px]:text-sm sm:px-4",
                filter === f.id ? "bg-brand text-white" : "text-muted hover:bg-blush hover:text-fg",
              )}
            >
              {f.label}
              <span className={cn("ml-1 text-xs min-[360px]:ml-1.5", filter === f.id ? "text-white/80" : "text-subtle")}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        {memory ? (
        <Button variant="ghost" size="sm" onClick={resetDemo}>
          <RotateCcw aria-hidden className="size-4" />
          {isPersonalized ? "Limpar progresso" : "Reiniciar demonstração"}
        </Button>
        ) : null}
      </div>

      <p className="-mt-5 text-xs text-muted">
        {memory
          ? "Modo demo local: respostas e progresso ficam só na memória desta aba e se perdem ao recarregar. Nada é salvo."
          : "Seu progresso é salvo automaticamente na sua conta e aparece em qualquer dispositivo."}
      </p>

      {/* Etapas e tarefas */}
      {visibleStages.length === 0 ? (
        <EmptyState
          icon={filter === "completed" ? SearchX : PartyPopper}
          title={filter === "completed" ? "Nenhuma tarefa concluída ainda" : "Nada pendente por aqui"}
          description={
            filter === "completed"
              ? "Quando você marcar uma tarefa como concluída, ela aparece neste filtro."
              : "Você concluiu todas as atividades deste plano. A trilha de consistência vem a seguir."
          }
          action={
            <Button variant="secondary" onClick={() => setFilter("all")}>
              Ver todas as tarefas
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {visibleStages.map(({ stage, tasks }) => {
            const sp = computeStageProgress(plan, statusMap, stage.id);
            return (
              <section key={stage.id} id={`stage-${stage.id}`} aria-labelledby={`stage-title-${stage.id}`}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
                      Etapa {stage.order} · {formatDayRange(stage)}
                    </p>
                    <h2 id={`stage-title-${stage.id}`} className="font-serif text-xl font-semibold text-fg">
                      {stage.title}
                    </h2>
                    <p className="text-sm text-muted">{stage.description}</p>
                  </div>
                  <p className="text-sm text-muted">
                    {sp.completed}/{sp.total} concluídas
                  </p>
                </div>
                <ul className="space-y-2">
                  {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} isNext={task.id === next?.id} onOpen={setOpenTaskId} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {openTaskId ? <TaskDetailDialog taskId={openTaskId} onClose={() => setOpenTaskId(null)} /> : null}
      {answersOpen ? <AnswersDialog onClose={() => setAnswersOpen(false)} /> : null}
    </div>
  );
}
