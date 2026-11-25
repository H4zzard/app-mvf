"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, CalendarRange, Check, Flag, History, Sparkles, Star, Target } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { GameTabs, PointsStrip } from "@/components/gamificacao/game-shell";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CADENCE_LABEL, CHALLENGES, MISSIONS, challengeProgress, missionProgress, type Mission, type MissionCadence } from "@/lib/demo/xp";
import { cn } from "@/lib/cn";

const CADENCE_ICON: Record<MissionCadence, typeof Target> = { diaria: CalendarDays, semanal: CalendarRange, especial: Star };
const CADENCES: MissionCadence[] = ["diaria", "semanal", "especial"];

/**
 * Desafios (DEMONSTRAÇÃO): missões com adesão, progresso e resgate simulados.
 * Mesmo estado de Conquistas, Ranking e Recompensas. Cada missão rende XP uma vez;
 * só conta o que foi feito depois de participar (linha de base).
 */
export function ChallengesView() {
  const { stats, state, dispatch } = useDemo();
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const joined = state.missionsJoined;
  const active = MISSIONS.filter((m) => ["em_andamento", "pronta"].includes(missionProgress(m, stats, joined).state)).length;
  const history = state.history.filter((h) => h.kind === "desafio");

  function claim(id: string, title: string, xp: number) {
    dispatch({ type: "challenge/claim", challengeId: id, eligible: true, label: title, xp });
    setCelebrate(`“${title}” concluído: +${xp} XP.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Desafios"
        description="Missões curtas para manter o ritmo. Participe, faça a ação e resgate o XP."
      />
      <GameTabs />
      <PointsStrip />

      <p role="status" aria-live="polite" className={cn("flex items-center gap-2 rounded-2xl bg-success-soft p-3.5 text-sm font-medium text-success", !celebrate && "sr-only")}>
        {celebrate ? (
          <>
            <Sparkles aria-hidden className="size-4 shrink-0" />
            {celebrate}
          </>
        ) : null}
      </p>

      <p className="text-sm text-muted">
        {active > 0 ? `Você participa de ${active} ${active === 1 ? "missão" : "missões"} agora.` : "Escolha uma missão para começar."} Na
        demonstração, diárias e semanais não reiniciam por data: o ciclo recomeça no reset.
      </p>

      {CADENCES.map((cadence) => {
        const Icon = CADENCE_ICON[cadence];
        return (
          <section key={cadence} aria-labelledby={`cad-${cadence}`} className="space-y-3">
            <h2 id={`cad-${cadence}`} className="flex items-center gap-2 font-serif text-[1.35rem] font-semibold text-fg">
              <Icon aria-hidden className="size-5 text-brand" />
              {CADENCE_LABEL[cadence]}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {MISSIONS.filter((m) => m.cadence === cadence).map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  progress={missionProgress(m, stats, joined)}
                  onJoin={() => dispatch({ type: "mission/join", missionId: m.id, baseline: m.metric(stats) })}
                  onClaim={() => claim(m.id, m.title, m.xp)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <section aria-labelledby="marcos-title" className="space-y-3">
        <h2 id="marcos-title" className="flex items-center gap-2 font-serif text-[1.35rem] font-semibold text-fg">
          <Flag aria-hidden className="size-5 text-brand" />
          Marcos da jornada
        </h2>
        <p className="-mt-1 text-sm text-muted">Contam tudo o que você já fez. Os mesmos marcos aparecem em Conquistas.</p>
        <ul className="grid gap-3 md:grid-cols-2">
          {CHALLENGES.map((c) => {
            const p = challengeProgress(c, stats);
            return (
              <li key={c.id}>
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg">{c.title}</p>
                      <p className="text-sm text-muted">{c.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blush px-2 py-0.5 text-xs font-semibold text-brand">+{c.xp} XP</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={(p.value / c.target) * 100} label={`Progresso de ${c.title}`} size="sm" className="flex-1" />
                    <span className="text-xs font-medium text-muted">
                      {p.value}/{c.target}
                    </span>
                  </div>
                  {p.claimed ? (
                    <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-success">
                      <Check aria-hidden className="size-4" /> Bônus resgatado
                    </p>
                  ) : p.done ? (
                    <Button size="sm" className="mt-2.5 self-start" onClick={() => claim(c.id, c.title, c.xp)}>
                      Resgatar +{c.xp} XP
                    </Button>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="hist-title" className="space-y-3">
        <h2 id="hist-title" className="flex items-center gap-2 font-serif text-[1.35rem] font-semibold text-fg">
          <History aria-hidden className="size-5 text-brand" />
          Histórico
        </h2>
        {history.length === 0 ? (
          <EmptyState icon={History} title="Nenhum desafio resgatado ainda" description="Quando você resgatar uma missão ou marco, ela aparece aqui." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <Check aria-hidden className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-fg">{h.label}</span>
                <span className="text-sm font-semibold text-brand">+{h.points} XP</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MissionCard({
  mission,
  progress,
  onJoin,
  onClaim,
}: {
  mission: Mission;
  progress: ReturnType<typeof missionProgress>;
  onJoin: () => void;
  onClaim: () => void;
}) {
  const { state } = progress;
  return (
    <li>
      <Card className={cn("flex h-full flex-col p-4", state === "pronta" && "border-brand/40 bg-blush/50", state === "resgatada" && "bg-canvas/70")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-fg">{mission.title}</p>
            <p className="text-sm text-muted">{mission.description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-blush px-2 py-0.5 text-xs font-semibold text-brand">+{mission.xp} XP</span>
        </div>
        {state === "em_andamento" || state === "pronta" ? (
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={(progress.value / mission.target) * 100} label={`Progresso da missão ${mission.title}`} size="sm" className="flex-1" />
            <span className="text-xs font-medium text-muted">
              {progress.value}/{mission.target}
            </span>
          </div>
        ) : null}
        <div className="mt-auto pt-3">
          {state === "disponivel" ? (
            <Button size="sm" variant="secondary" onClick={onJoin} className="w-full sm:w-auto">
              <Target aria-hidden className="size-4" />
              Participar
            </Button>
          ) : state === "em_andamento" ? (
            <Link href={mission.href} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Fazer agora
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          ) : state === "pronta" ? (
            <Button size="sm" onClick={onClaim} className="w-full sm:w-auto">
              <Sparkles aria-hidden className="size-4" />
              Resgatar +{mission.xp} XP
            </Button>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <Check aria-hidden className="size-4" /> Concluída · +{mission.xp} XP
            </p>
          )}
        </div>
      </Card>
    </li>
  );
}
