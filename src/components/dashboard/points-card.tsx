"use client";

import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";
import { usePlan } from "@/components/plan/plan-provider";
import { useOptionalDemo } from "@/components/demo/demo-provider";
import { computeDemoGamification } from "@/demo/gamification";
import { DemoBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

/**
 * Card escuro de pontos.
 * - Modo demo: o MESMO XP da tela Conquistas (derivado das ações da sessão).
 * - Modo real: prévia pelas tarefas concluídas. Nunca representa ganhos.
 */
export function PointsCard() {
  const { plan, statusMap, persistence } = usePlan();
  const demo = useOptionalDemo();
  const g = computeDemoGamification(plan?.tasks ?? [], statusMap);
  const points = demo ? demo.xp.xp : g.points;
  const levelNumber = demo ? demo.xp.level.number : g.levelNumber;
  const levelName = demo ? demo.xp.level.name : g.levelName;
  const toNextPts = demo ? demo.xp.xpToNext : g.pointsToNextLevel;
  const percent = demo ? demo.xp.levelPercent : g.pointsToNextLevel > 0 ? Math.round((g.points / (g.points + g.pointsToNextLevel)) * 100) : 100;

  return (
    <section
      aria-labelledby="points-title"
      className="relative flex flex-col overflow-hidden rounded-2xl bg-ink p-5 text-white shadow-raised sm:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-20 size-44 rounded-full bg-brand/20" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h2 id="points-title" className="font-serif text-lg font-semibold">
            Pontos e conquistas
          </h2>
          <p className="mt-0.5 text-sm text-white/65">{persistence === "server" ? "Prévia pelo seu progresso" : "Simulação desta sessão"}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-white/10">
          <Award aria-hidden className="size-5" />
        </span>
      </div>

      <div className="relative mt-4 flex items-end gap-2 sm:mt-5">
        <span className="font-serif text-5xl font-semibold">{points}</span>
        <span className="pb-2 text-sm text-white/70">{demo ? "XP" : "pts"}</span>
      </div>
      <p className="relative text-sm text-white/80">
        Nível {levelNumber} · {levelName}
      </p>
      <ProgressBar value={percent} label="Progresso até o próximo nível (simulação)" tone="inverse" size="sm" className="relative mt-3" />
      <p className="relative mt-2 text-xs text-white/65">
        {toNextPts > 0 ? `${toNextPts} ${demo ? "XP" : "pts"} para o próximo nível` : "Nível máximo desta prévia"}
      </p>

      <div className="relative mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
        <DemoBadge inverse label="Regras de pontos em definição" />
        {demo ? (
          <Link href="/conquistas" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-white hover:underline">
            Conquistas
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
