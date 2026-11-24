"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, CircleDashed, GitBranch, ListChecks, Lock, PartyPopper, RotateCcw, Route, SlidersHorizontal } from "lucide-react";
import { usePlan } from "@/components/plan/plan-provider";
import { AnswersDialog } from "@/components/plan/answers-dialog";
import { PersonalizeBanner } from "@/components/onboarding/personalize-callout";
import { rememberStep, takeRememberedStep, useJourney } from "@/components/plan/use-journey";
import { Button, ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { greetingName } from "@/lib/greeting";
import type { PhaseView, StepView } from "@/lib/journey/types";
import { cn } from "@/lib/cn";

/** Meu Plano 2.0: mapa de evolução (uma etapa pequena de cada vez). */
export function PlanView() {
  const { plan } = usePlan();
  if (!plan) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={Route}
          title="Monte seu plano personalizado"
          description="Responda algumas perguntas rápidas e o app monta o seu caminho, etapa por etapa. A biblioteca de aulas continua disponível."
          action={<ButtonLink href="/onboarding">Montar meu plano</ButtonLink>}
        />
      </div>
    );
  }
  return <JourneyMap />;
}

/** Deslocamento do percurso (só com espaço: a partir de 380 px). */
const OFFSETS = ["", "min-[380px]:ml-8", "min-[380px]:ml-14", "min-[380px]:ml-8", "", "min-[380px]:-ml-0"];

function JourneyMap() {
  const { journey } = useJourney();
  const { mode, profile, persistence, resetDemo } = usePlan();
  const [answersOpen, setAnswersOpen] = useState(false);
  const personalized = mode === "personalized";

  // Ao voltar de uma etapa, rola até ela (a tela fica escondida por <Activity>; o efeito roda de novo ao reaparecer).
  useLayoutEffect(() => {
    const id = takeRememberedStep();
    // Depois da rolagem automática da navegação (que leva ao topo), centraliza a etapa visitada.
    let raf = 0;
    if (id) raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => document.getElementById(`no-${id}`)?.scrollIntoView({ block: "center" }))));
    return () => {
      cancelAnimationFrame(raf);
      setAnswersOpen(false);
    };
  }, []);

  if (!journey) return null;
  const { current, currentPhase, progress } = journey;
  const allDone = !current && progress.done === progress.total;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>Meu Plano</span>
          {persistence === "memory" ? <DemoBadge label={personalized ? "Plano personalizado · demonstração" : "Exemplo de plano · demonstração"} /> : null}
        </div>
        <p className="mt-3 text-sm text-muted">Olá, {greetingName(profile)}</p>
        <h1 className="font-serif text-[1.7rem] font-semibold leading-tight text-fg sm:text-4xl">
          {allDone ? "Você concluiu seu caminho" : (currentPhase?.phase.headline ?? "Seu caminho")}
        </h1>
        {currentPhase ? (
          <p className="mt-1.5 text-[0.95rem] text-muted">
            Você concluiu {currentPhase.done} de {currentPhase.total} etapas desta fase.
          </p>
        ) : null}
      </header>

      {!personalized ? <PersonalizeBanner /> : null}

      {/* Próxima ação — o que fazer agora */}
      <section aria-labelledby="proxima-acao" className="rounded-3xl border border-brand/20 bg-card p-4 shadow-card sm:p-5">
        {current ? (
          <>
            <p id="proxima-acao" className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Próxima ação
            </p>
            <p className="mt-1.5 font-serif text-xl font-semibold leading-snug text-fg">{current.step.title}</p>
            <p className="mt-0.5 text-sm text-muted">
              {current.phase.title} · etapa {current.number} de {currentPhase?.total}
            </p>
            <ButtonLink href={`/meu-plano/etapa/${current.step.id}`} size="lg" className="mt-4 w-full sm:w-auto" onClick={() => rememberStep(current.step.id)}>
              Continuar
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </>
        ) : (
          <p id="proxima-acao" className="flex items-center gap-2 font-medium text-success">
            <PartyPopper aria-hidden className="size-5" />
            {allDone ? "Todas as etapas do seu caminho estão concluídas." : "Nenhuma etapa disponível agora."}
          </p>
        )}
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">Progresso total</span>
            <span className="font-semibold text-fg">
              {progress.done} de {progress.total} · {progress.percent}%
            </span>
          </div>
          <ProgressBar value={progress.percent} label="Progresso total do plano" />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              Execução: {progress.execution.done}/{progress.execution.total}
            </span>
            <span>
              Aulas: {progress.learning.done}/{progress.learning.total}
            </span>
          </p>
        </div>
      </section>

      {/* Mapa */}
      <nav aria-label="Mapa do plano">
        <ol className="space-y-8">
          {journey.phases.map((p, i) => (
            <PhaseBlock key={p.phase.id} view={p} number={i + 1} isCurrent={currentPhase?.phase.id === p.phase.id} />
          ))}
        </ol>
      </nav>

      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        {personalized ? (
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
        ) : null}
        {persistence === "memory" ? (
          <Button variant="ghost" size="sm" onClick={resetDemo}>
            <RotateCcw aria-hidden className="size-4" />
            Recomeçar demonstração
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted">Caminho em construção com a equipe: as etapas e os procedimentos ainda serão confirmados. Nenhum plano garante vendas ou comissões.</p>

      {answersOpen ? <AnswersDialog onClose={() => setAnswersOpen(false)} /> : null}
    </div>
  );
}

function PhaseBlock({ view, number, isCurrent }: { view: PhaseView; number: number; isCurrent: boolean }) {
  const shown = view.steps.filter((s) => s.applicable);
  const skipped = view.steps.filter((s) => !s.applicable && s.step.kind !== "decisao");
  const pct = view.total ? Math.round((view.done / view.total) * 100) : 0;
  return (
    <li aria-labelledby={`fase-${view.phase.id}`}>
      <div className={cn("flex items-center gap-3 rounded-2xl p-3", isCurrent ? "bg-blush/60" : "bg-surface")}>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold", view.complete ? "bg-success text-white" : isCurrent ? "bg-brand text-white" : "bg-card text-muted ring-1 ring-line")}>
          {view.complete ? <Check aria-hidden className="size-5" /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`fase-${view.phase.id}`} className="font-semibold leading-tight text-fg">
            <span className="sr-only">Fase {number}: </span>
            {view.phase.title}
          </h2>
          <p className="text-xs text-muted">
            {view.done} de {view.total} etapas{view.complete ? " · concluída" : ""}
          </p>
        </div>
        <span className="w-14 shrink-0" aria-hidden>
          <span className="block h-1.5 overflow-hidden rounded-full bg-line">
            <span className={cn("block h-full rounded-full", view.complete ? "bg-success" : "bg-brand")} style={{ width: `${pct}%` }} />
          </span>
        </span>
      </div>

      <ol className="mt-3 pl-2" aria-label={`Etapas da fase ${view.phase.title}`}>
        {shown.map((s, i) => (
          <StepNode key={s.step.id} view={s} offset={OFFSETS[i % OFFSETS.length]} last={i === shown.length - 1} />
        ))}
      </ol>

      {skipped.length ? (
        <details className="mt-2 ml-2 rounded-xl text-sm">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-2 text-muted [&::-webkit-details-marker]:hidden">
            <CircleDashed aria-hidden className="size-4" />
            {skipped.length} {skipped.length === 1 ? "etapa pulada" : "etapas puladas"} para o seu perfil
            <ChevronDown aria-hidden className="size-4" />
          </summary>
          <ul className="mt-1 space-y-1 px-2 pb-1">
            {[...new Map(skipped.map((s) => [s.reason, s])).values()].map((s) => (
              <li key={s.step.id} className="text-xs text-muted">
                <span className="font-medium text-fg">{skipped.filter((x) => x.reason === s.reason).map((x) => x.step.title).join(", ")}</span> — {s.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

const STATE_LABEL: Record<StepView["state"], string> = {
  concluida: "concluída",
  atual: "você está aqui",
  disponivel: "disponível",
  bloqueada: "bloqueada",
  nao_aplicavel: "não se aplica",
};

function StepNode({ view: v, offset, last }: { view: StepView; offset: string; last: boolean }) {
  const current = v.state === "atual";
  const Icon = v.state === "concluida" ? Check : v.state === "bloqueada" ? Lock : v.step.kind === "aula" ? BookOpen : v.step.kind === "decisao" ? GitBranch : null;
  return (
    <li id={`no-${v.step.id}`} className={cn("relative flex scroll-mt-40 items-stretch gap-3 transition-[margin] motion-reduce:transition-none", offset)}>
      <div className="relative flex w-14 shrink-0 flex-col items-center">
        <Link
          href={`/meu-plano/etapa/${v.step.id}`}
          onClick={() => rememberStep(v.step.id)}
          aria-label={`Etapa ${v.number}: ${v.step.title} — ${STATE_LABEL[v.state]}`}
          aria-current={current ? "step" : undefined}
          className={cn(
            "relative z-10 grid shrink-0 place-items-center rounded-full font-semibold transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-safe:active:scale-95",
            current ? "size-14 bg-brand text-white shadow-raised ring-4 ring-brand/20" : "size-12",
            v.state === "concluida" && "bg-blush text-brand ring-1 ring-brand/20",
            v.state === "disponivel" && "bg-card text-brand ring-2 ring-brand/50",
            v.state === "bloqueada" && "bg-canvas text-subtle ring-1 ring-line",
          )}
        >
          {Icon ? <Icon aria-hidden className={current ? "size-6" : "size-5"} /> : <span aria-hidden>{v.number}</span>}
        </Link>
        {!last ? <span aria-hidden className={cn("w-0.5 flex-1 rounded-full", v.state === "concluida" ? "bg-brand/30" : "bg-line-strong/60")} style={{ minHeight: "1.25rem" }} /> : null}
      </div>
      <Link
        href={`/meu-plano/etapa/${v.step.id}`}
        onClick={() => rememberStep(v.step.id)}
        tabIndex={-1}
        className={cn("min-w-0 flex-1 pb-5", current ? "pt-2.5" : "pt-2")}
      >
        {current ? <span className="mb-1 inline-block rounded-full bg-brand px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-white">Você está aqui</span> : null}
        <span className={cn("block leading-snug", current ? "text-base font-semibold text-fg" : v.state === "bloqueada" ? "text-sm text-muted" : v.state === "concluida" ? "text-sm text-muted line-through decoration-brand/30" : "text-sm font-medium text-fg")}>
          {v.step.title}
        </span>
        {v.state === "bloqueada" && v.missing[0] ? <span className="mt-0.5 block text-xs text-subtle">Libera após: {v.missing[0].title}</span> : null}
        {v.step.kind === "aula" && v.state !== "bloqueada" ? <span className="mt-0.5 block text-xs text-subtle">Aula</span> : null}
      </Link>
    </li>
  );
}
