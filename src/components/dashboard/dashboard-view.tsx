"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, Sparkles, Sun } from "lucide-react";
import { useActivePlan, usePlan } from "@/components/plan/plan-provider";
import { useOptionalDemo } from "@/components/demo/demo-provider";
import { PersonalizeBanner, PersonalizeHero } from "@/components/onboarding/personalize-callout";
import { useJourney } from "@/components/plan/use-journey";
import { ToolShortcuts } from "@/components/dashboard/quick-access";
import { HelpFooter } from "@/components/layout/help-footer";
import { MemberAreaBanner } from "@/components/dashboard/member-area-banner";
import { Card, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DEMO_ANNOUNCEMENTS } from "@/demo/session";
import { greetingName } from "@/lib/greeting";
import { formatMinutes, getDailySuggestion } from "@/lib/plan";

export function DashboardView() {
  const { plan, mode, profile, persistence } = usePlan();
  const name = greetingName(profile);
  const demo = persistence === "memory";
  if (!plan) return <FirstAccessDashboard name={name} demo={demo} />;
  return <PlanDashboard name={name} isPersonalized={mode === "personalized"} demo={demo} />;
}

/** Primeiro acesso: sem plano, o destaque é montar o plano. */
function FirstAccessDashboard({ name, demo }: { name: string; demo: boolean }) {
  return (
    <div className="space-y-5 sm:space-y-8">
      <PageHeader
        eyebrow={demo ? <DemoBadge label="Primeiro acesso simulado" /> : undefined}
        title={`Boas-vindas, ${name}`}
        description="Comece montando o seu plano: ele vai responder qual é o seu próximo passo."
      />
      <PersonalizeHero />
      <ToolShortcuts />
      <AnnouncementsCard />
      <HelpFooter />
    </div>
  );
}

function PlanDashboard({ name, isPersonalized, demo }: { name: string; isPersonalized: boolean; demo: boolean }) {
  const { plan, statusMap } = useActivePlan();
  // Meu Plano 2.0: o próximo passo é a próxima MICROETAPA da jornada (mesmo statusMap, mesmo progresso).
  const { journey } = useJourney();
  // Módulos de demonstração disponíveis (modo demo local OU prévia autorizada no servidor).
  const modules = useOptionalDemo() !== null;

  const daily = getDailySuggestion(plan, statusMap, plan.dailyMinutes);
  const next = journey?.current ?? null;
  const phase = journey?.currentPhase ?? null;
  const phaseNumber = phase && journey ? journey.phases.indexOf(phase) + 1 : 0;
  const jp = journey?.progress;
  const KIND_LABEL = { acao: "Ação prática", aula: "Aula", decisao: "Escolha rápida", confirmacao: "Confirmação" } as const;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={
          <DemoBadge
            label={
              !demo
                ? "Conteúdo das aulas em preparação"
                : isPersonalized
                  ? "Plano personalizado · demonstração"
                  : "Trilha de exemplo · demonstração"
            }
          />
        }
        title={`Olá, ${name}`}
        description={
          phase && next && journey
            ? `Fase ${phaseNumber} de ${journey.phases.length} — ${phase.phase.title}.`
            : "Você concluiu todas as etapas deste plano. Hora de pensar em consistência."
        }
      />

      {!isPersonalized ? <PersonalizeBanner /> : null}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* 1. Próxima ação da Jornada — elemento dominante */}
        <section className="mvf-on-wine rounded-2xl bg-wine-deep text-on-wine shadow-raised lg:col-span-2" aria-labelledby="next-step-title">
          <div className="p-5 sm:p-8">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              <Sparkles aria-hidden className="size-4" />
              Sua próxima ação
            </p>
            {next && phase ? (
              <>
                <p className="mt-3 text-sm text-on-wine-muted">
                  Fase {phaseNumber} · {phase.phase.title} <span aria-hidden>·</span> Etapa {next.number} de {phase.total}
                </p>
                <h2 id="next-step-title" className="mt-1.5 max-w-2xl font-serif text-[1.5rem] font-semibold leading-tight text-on-wine sm:text-[1.9rem]">
                  {next.step.title}
                </h2>
                <p className="mt-1.5 text-sm text-on-wine-muted">
                  {KIND_LABEL[next.step.kind]}
                  {next.step.minutes ? ` · cerca de ${next.step.minutes} min` : ""}
                </p>
                <p className="mt-4 max-w-2xl rounded-lg bg-wine-soft/60 p-3 text-sm text-on-wine ring-1 ring-white/8 sm:p-3.5">
                  <span className="font-semibold text-accent">O que fazer: </span>
                  <span className="line-clamp-2 sm:line-clamp-none">{next.instruction}</span>
                </p>
                {jp ? (
                  <div className="mt-4 max-w-2xl">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-on-wine">Progresso da jornada</span>
                      <span className="text-on-wine-muted">
                        {jp.done} de {jp.total} etapas · <strong className="font-semibold text-on-wine">{jp.percent}%</strong>
                      </span>
                    </div>
                    <ProgressBar value={jp.percent} label="Progresso geral da jornada" size="sm" tone="inverse" className="mt-2" />
                  </div>
                ) : null}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <ButtonLink href={`/meu-plano/etapa/${next.step.id}`} variant="inverse" size="lg" className="px-5 sm:px-6">
                    Continuar minha jornada
                    <ArrowRight aria-hidden className="size-4" />
                  </ButtonLink>
                  <ButtonLink href="/meu-plano" variant="onWine" size="lg" className="px-4">
                    Ver mapa
                  </ButtonLink>
                </div>
              </>
            ) : (
              <div className="mt-4">
                <h2 id="next-step-title" className="font-serif text-2xl font-semibold text-on-wine">
                  Trilha concluída!
                </h2>
                <p className="mt-2 max-w-xl text-sm text-on-wine-muted">
                  Você marcou todas as tarefas desta trilha. A trilha de consistência e evolução será liberada em breve.
                </p>
                <ButtonLink href="/meu-plano" variant="inverse" className="mt-5">
                  Revisar meu plano
                </ButtonLink>
              </div>
            )}
          </div>
        </section>

        {/* 2. Continuidade: rotina sugerida para hoje */}
        <Card className="p-4 sm:p-6" aria-labelledby="today-title">
          <CardHeader
            titleId="today-title"
            title="Para hoje"
            description={`Sugestão para ${plan.dailyMinutes} min por dia`}
            action={<Sun aria-hidden className="size-5 text-coral" />}
          />
          {daily.tasks.length > 0 ? (
            <>
              <ul className="mt-4 space-y-2">
                {daily.tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3 rounded-lg bg-canvas/70 p-3">
                    <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-coral" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-fg">{task.title}</span>
                      <span className="text-xs text-muted">{formatMinutes(task.durationMinutes)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">
                Total estimado: <strong className="text-fg">{formatMinutes(daily.totalMinutes)}</strong>
                {daily.totalMinutes > plan.dailyMinutes ? " — pode dividir em mais de um dia." : "."}
              </p>
              <p className="mt-1 text-xs text-subtle">Perdeu um dia? Sem problema: o plano espera por você.</p>
            </>
          ) : (
            <p className="mt-5 text-sm text-muted">Nada pendente hoje. Aproveite para revisar suas anotações.</p>
          )}
        </Card>

        {/* 2. Continuidade do aprendizado: área de membros */}
        {modules ? <MemberAreaBanner /> : null}
      </div>

      {/* 3. Ferramentas (Vídeos Virais sempre visível aqui) */}
      <ToolShortcuts />

      {/* 4. Avisos oficiais e eventos */}
      <AnnouncementsCard />

      <HelpFooter />
    </div>
  );
}

function AnnouncementsCard() {
  return (
    <Card className="p-4 sm:p-6" aria-labelledby="announcements-title">
      <CardHeader
        titleId="announcements-title"
        title="Avisos NUMI"
        description="Comunicados importantes da equipe."
        action={<Megaphone aria-hidden className="size-5 text-subtle" />}
      />
      <ul className="mt-4 space-y-3 sm:mt-5">
        {DEMO_ANNOUNCEMENTS.map((a) => (
          <li key={a.id} className="border-l-2 border-brand/40 py-0.5 pl-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-fg">{a.title}</p>
              {a.isDemo ? <DemoBadge label="Aviso do protótipo" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted">{a.body}</p>
          </li>
        ))}
      </ul>
      {/* Acesso contextual: o feed fica na Tribo; a agenda, em Lives. */}
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/lives" className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand hover:underline">
          Agenda de lives
          <ArrowRight aria-hidden className="size-4" />
        </Link>
        <Link href="/comunidade" className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand hover:underline">
          Conversas na Tribo
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </p>
    </Card>
  );
}
