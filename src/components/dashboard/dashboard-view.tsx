"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, PartyPopper, Sparkles, Sun, Target } from "lucide-react";
import { useActivePlan, usePlan } from "@/components/plan/plan-provider";
import { useOptionalDemo } from "@/components/demo/demo-provider";
import { PersonalizeBanner, PersonalizeHero } from "@/components/onboarding/personalize-callout";
import { useJourney } from "@/components/plan/use-journey";
import { QuickAccess } from "@/components/dashboard/quick-access";
import { PointsCard } from "@/components/dashboard/points-card";
import { MemberAreaBanner } from "@/components/dashboard/member-area-banner";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DEMO_ANNOUNCEMENTS } from "@/demo/session";
import { CHALLENGES, MISSIONS, challengeProgress, missionProgress } from "@/lib/demo/xp";
import { greetingName } from "@/lib/greeting";
import { formatMinutes, getDailySuggestion } from "@/lib/plan";
import { cn } from "@/lib/cn";

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
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <PersonalizeHero />
        </div>
        <div className="lg:col-span-3">
          <QuickAccess />
        </div>
        <AnnouncementsCard />
        <PointsCard />
      </div>
    </div>
  );
}

function PlanDashboard({ name, isPersonalized, demo }: { name: string; isPersonalized: boolean; demo: boolean }) {
  const { plan, statusMap } = useActivePlan();
  // Meu Plano 2.0: o próximo passo é a próxima MICROETAPA da jornada (mesmo statusMap).
  const { journey } = useJourney();
  // Módulos de demonstração disponíveis (modo demo local OU prévia autorizada no servidor).
  const modules = useOptionalDemo() !== null;

  const daily = getDailySuggestion(plan, statusMap, plan.dailyMinutes);
  const next = journey?.current ?? null;
  const phase = journey?.currentPhase ?? null;
  const phaseNumber = phase && journey ? journey.phases.indexOf(phase) + 1 : 0;
  const jp = journey?.progress;
  const progress = { percent: jp?.percent ?? 0, completed: jp?.done ?? 0, total: jp?.total ?? 0, remaining: (jp?.total ?? 0) - (jp?.done ?? 0) };
  const upcoming = journey ? journey.steps.filter((v) => v.applicable && !v.done && v.state !== "bloqueada").slice(0, 3) : [];
  const KIND_LABEL = { acao: "Ação prática", aula: "Aula", decisao: "Escolha rápida", confirmacao: "Confirmação" } as const;

  return (
    <div className="space-y-4 sm:space-y-8">
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
        {/* Próximo passo — elemento dominante */}
        <Card className="relative overflow-hidden lg:col-span-2" aria-labelledby="next-step-title">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-blush" />
          <div className="relative p-4 sm:p-8">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <Sparkles aria-hidden className="size-4" />
              Seu próximo passo
            </p>
            {next && phase ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
                  <Badge tone="brand">
                    Fase {phaseNumber} · {phase.phase.title}
                  </Badge>
                  <Badge tone="neutral">
                    Etapa {next.number} de {phase.total}
                  </Badge>
                </div>
                <h2
                  id="next-step-title"
                  className="mt-2.5 max-w-2xl font-serif text-[1.45rem] font-semibold leading-tight text-fg sm:mt-3 sm:text-3xl"
                >
                  {next.step.title}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {KIND_LABEL[next.step.kind]}
                  {next.step.minutes ? ` · cerca de ${next.step.minutes} min` : ""}
                </p>
                <p className="mt-3.5 max-w-2xl rounded-xl bg-canvas/80 p-3.5 text-sm text-fg sm:mt-4 sm:p-4">
                  <span className="font-semibold text-brand">O que fazer: </span>
                  <span className="line-clamp-2 sm:line-clamp-none">{next.instruction}</span>
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
                  <ButtonLink href={`/meu-plano/etapa/${next.step.id}`} size="lg" className="px-4 sm:px-6">
                    <span className="sm:hidden">Continuar</span>
                    <span className="hidden sm:inline">Continuar meu plano</span>
                    <ArrowRight aria-hidden className="size-4" />
                  </ButtonLink>
                  <ButtonLink href="/meu-plano" variant="secondary" size="lg" className="px-4 sm:px-6">
                    Ver mapa
                  </ButtonLink>
                </div>
              </>
            ) : (
              <div className="mt-4">
                <h2 id="next-step-title" className="font-serif text-2xl font-semibold text-fg">
                  Trilha concluída!
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted">
                  Você marcou todas as tarefas desta trilha. A trilha de consistência e evolução será liberada em breve.
                </p>
                <ButtonLink href="/meu-plano" variant="secondary" className="mt-5">
                  Revisar meu plano
                </ButtonLink>
              </div>
            )}
          </div>
        </Card>

        {/* Visão resumida do plano */}
        <Card className="flex flex-col p-4 sm:p-6" aria-labelledby="plan-summary-title">
          <CardHeader titleId="plan-summary-title" title="Meu plano" description={plan.title} className="hidden sm:flex" />
          <h2 className="sr-only sm:hidden">Meu plano</h2>
          <div className="flex items-end justify-between sm:mt-5">
            <p className="font-serif text-4xl font-semibold text-fg sm:text-5xl">
              {progress.percent}
              <span className="text-xl sm:text-2xl">%</span>
            </p>
            <p className="pb-1 text-right text-sm text-muted">
              {progress.completed} de {progress.total}
              <br />
              etapas
            </p>
          </div>
          <ProgressBar value={progress.percent} label="Progresso geral do plano" className="mt-3" />
          <dl className="mt-5 hidden grid-cols-3 gap-2 text-center sm:grid">
            <Stat label="Fases" value={journey?.phases.length ?? 0} />
            <Stat label="Concluídas" value={progress.completed} />
            <Stat label="Pendentes" value={progress.remaining} />
          </dl>
          {phase ? (
            <p className="mt-4 hidden text-sm text-muted sm:block">
              Fase atual: <strong className="font-semibold text-fg">{phase.phase.title}</strong> · {phase.done}/{phase.total}
            </p>
          ) : null}
          <ButtonLink href="/meu-plano" variant="ghost" size="sm" className="-ml-3 mt-auto self-start sm:pt-2">
            Ver plano completo
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </Card>

        {modules ? <MemberAreaBanner /> : null}

        {/* Acesso rápido */}
        <div className="lg:col-span-3 lg:order-last">
          <QuickAccess />
        </div>

        {modules ? <ChallengesCard /> : null}

        {/* Sugestão de rotina do dia */}
        <Card className="p-5 sm:p-6" aria-labelledby="today-title">
          <CardHeader
            titleId="today-title"
            title="Para hoje"
            description={`Sugestão para ${plan.dailyMinutes} min por dia`}
            action={<Sun aria-hidden className="size-5 text-coral" />}
          />
          {daily.tasks.length > 0 ? (
            <>
              <ul className="mt-4 space-y-2 sm:mt-5">
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
              <p className="mt-4 text-sm text-muted">
                Total estimado: <strong className="text-fg">{formatMinutes(daily.totalMinutes)}</strong>
                {daily.totalMinutes > plan.dailyMinutes ? " — pode dividir em mais de um dia." : "."}
              </p>
              <p className="mt-1 text-xs text-subtle">Perdeu um dia? Sem problema: o plano espera por você.</p>
            </>
          ) : (
            <p className="mt-5 text-sm text-muted">Nada pendente hoje. Aproveite para revisar suas anotações.</p>
          )}
        </Card>

        {/* Sua jornada (no celular, o Meu Plano cumpre este papel) */}
        <Card className={cn("hidden p-6 lg:block", modules ? "lg:col-span-1" : "lg:col-span-2")} aria-labelledby="journey-title">
          <CardHeader
            titleId="journey-title"
            title="Sua jornada"
            description="Os próximos passos do seu plano, em ordem."
            action={
              <Link href="/meu-plano" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand hover:underline">
                Meu Plano
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            }
          />
          {upcoming.length > 0 ? (
            <ol className="mt-5 space-y-3">
              {upcoming.map((v, i) => (
                <li key={v.step.id}>
                  <Link
                    href={`/meu-plano/etapa/${v.step.id}`}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-3 transition-colors",
                      i === 0 ? "border-brand/30 bg-blush/50" : "border-line hover:border-line-strong hover:bg-canvas/60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                        i === 0 ? "bg-brand text-white" : "bg-canvas text-muted ring-1 ring-line",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-medium text-fg">{v.step.title}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                        <span>{v.phase.title}</span>
                        <span>{KIND_LABEL[v.step.kind]}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={PartyPopper} title="Nenhum passo pendente" description="Você concluiu todas as tarefas desta trilha." className="mt-5" />
          )}
        </Card>

        <AnnouncementsCard />
        <PointsCard />
      </div>
    </div>
  );
}

/** Desafios em andamento (somente demo): derivados das ações da sessão. */
function ChallengesCard() {
  const demo = useOptionalDemo();
  if (!demo) return null;
  const missions = MISSIONS.map((m) => ({ m, p: missionProgress(m, demo.stats, demo.state.missionsJoined) }))
    .filter(({ p }) => p.state === "em_andamento" || p.state === "pronta")
    .map(({ m, p }) => ({ c: { id: m.id, title: m.title, target: m.target }, p: { value: p.value, done: p.state === "pronta", claimed: false } }));
  const items = [
    ...missions,
    ...CHALLENGES.map((c) => ({ c, p: challengeProgress(c, demo.stats) })).filter(({ p }) => !p.claimed),
  ].slice(0, 2);
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="challenges-home-title">
      <CardHeader
        titleId="challenges-home-title"
        title="Desafios em andamento"
        action={
          <Link href="/desafios" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand hover:underline">
            Ver todos
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        }
      />
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Você resgatou todos os desafios desta demonstração.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map(({ c, p }) => (
            <li key={c.id} className="rounded-xl bg-canvas/70 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-fg">
                <Target aria-hidden className="size-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">{c.title}</span>
                <span className="text-xs text-muted">
                  {p.value}/{c.target}
                </span>
              </p>
              <ProgressBar value={(p.value / c.target) * 100} label={`Progresso do desafio ${c.title}`} size="sm" className="mt-2" />
              {p.done ? <p className="mt-1.5 text-xs font-semibold text-success">Pronto para resgatar em Desafios</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-subtle">Desafios da demonstração · pontos não são dinheiro.</p>
    </Card>
  );
}

function AnnouncementsCard() {
  return (
    <Card className="p-5 sm:p-6 lg:col-span-2" aria-labelledby="announcements-title">
      <CardHeader
        titleId="announcements-title"
        title="Avisos NUMI"
        description="Comunicados importantes da equipe."
        action={<Megaphone aria-hidden className="size-5 text-brand" />}
      />
      <ul className="mt-4 space-y-3 sm:mt-5">
        {DEMO_ANNOUNCEMENTS.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-canvas/50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-fg">{a.title}</p>
              {a.isDemo ? <DemoBadge label="Aviso do protótipo" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted">{a.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-canvas/70 px-2 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-serif text-xl font-semibold text-fg">{value}</dd>
    </div>
  );
}
