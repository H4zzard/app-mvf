"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, CalendarCheck, Check, Lock, Medal, Sparkles, Trophy } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BADGES, CHALLENGES, challengeProgress } from "@/lib/demo/xp";
import { cn } from "@/lib/cn";
import { GameTabs } from "@/components/gamificacao/game-shell";

/**
 * Conquistas (DEMONSTRAÇÃO): XP, nível, marcos e selos DERIVADOS das ações
 * feitas na demo (mesmo estado de Desafios, Ranking e Recompensas). Não são
 * ganhos financeiros. Sem sequência de dias (não há registro diário real).
 */
export function AchievementsView() {
  const { stats, xp, dispatch } = useDemo();
  const [celebrate, setCelebrate] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Pontos de demonstração" />}
        title="Conquistas"
        description="Seu progresso vira XP, níveis e selos. Pontos não são dinheiro nem resultado de vendas."
      />
      <GameTabs />

      <section aria-labelledby="level-title" className="relative overflow-hidden rounded-2xl bg-ink p-5 text-white shadow-raised sm:p-6">
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Nível {xp.level.number}</p>
            <h2 id="level-title" className="mt-1 font-serif text-2xl font-semibold">
              {xp.level.name}
            </h2>
          </div>
          <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
            <Trophy aria-hidden className="size-6" />
          </span>
        </div>
        <p className="relative mt-4 flex items-end gap-2">
          <span className="font-serif text-5xl font-semibold">{xp.xp}</span>
          <span className="pb-2 text-sm text-white/70">XP</span>
        </p>
        <ProgressBar value={xp.levelPercent} label="Progresso até o próximo nível" tone="inverse" size="sm" className="relative mt-3" />
        <p className="relative mt-2 text-xs text-white/70">
          {xp.nextLevel ? `${xp.xpToNext} XP para ${xp.nextLevel.name}` : "Nível máximo desta demonstração"}
        </p>
      </section>

      <p role="status" aria-live="polite" className={cn("rounded-xl bg-success-soft p-3 text-sm font-medium text-success", !celebrate && "sr-only")}>
        {celebrate ? (
          <>
            <Sparkles aria-hidden className="mr-1.5 inline size-4" />
            {celebrate}
          </>
        ) : null}
      </p>

      <Card className="p-5 sm:p-6" aria-labelledby="challenges-title">
        <CardHeader
          titleId="challenges-title"
          title="Marcos"
          description="Conclua e resgate o bônus de XP."
          action={
            <Link href="/desafios" className="inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">
              Missões
            </Link>
          }
        />
        <ul className="mt-4 space-y-3">
          {CHALLENGES.map((c) => {
            const p = challengeProgress(c, stats);
            return (
              <li key={c.id} className="rounded-xl border border-line p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-fg">{c.title}</p>
                    <p className="text-sm text-muted">{c.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blush px-2 py-0.5 text-xs font-semibold text-brand">+{c.xp} XP</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={(p.value / c.target) * 100} label={`Progresso do desafio ${c.title}`} size="sm" className="flex-1" />
                  <span className="text-xs font-medium text-muted">
                    {p.value}/{c.target}
                  </span>
                </div>
                {p.claimed ? (
                  <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-success">
                    <Check aria-hidden className="size-4" />
                    Bônus resgatado
                  </p>
                ) : p.done ? (
                  <Button
                    size="sm"
                    className="mt-2.5"
                    onClick={() => {
                      dispatch({ type: "challenge/claim", challengeId: c.id, eligible: true, label: c.title, xp: c.xp });
                      setCelebrate(`Desafio “${c.title}” concluído: +${c.xp} XP.`);
                    }}
                  >
                    <Award aria-hidden className="size-4" />
                    Resgatar +{c.xp} XP
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-5 sm:p-6" aria-labelledby="badges-title">
        <CardHeader titleId="badges-title" title="Selos" description={`${xp.badgesUnlocked} de ${BADGES.length} desbloqueados`} />
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {BADGES.map((b) => {
            const on = b.unlocked(stats);
            return (
              <li
                key={b.id}
                className={cn("flex flex-col items-center rounded-2xl border p-3.5 text-center", on ? "border-brand/30 bg-blush/60" : "border-line bg-canvas/60")}
              >
                <span className={cn("grid size-11 place-items-center rounded-full", on ? "bg-brand text-white" : "bg-paper text-subtle ring-1 ring-line")}>
                  {on ? <Medal aria-hidden className="size-5" /> : <Lock aria-hidden className="size-4" />}
                </span>
                <span className={cn("mt-2 text-sm font-semibold", on ? "text-fg" : "text-muted")}>{b.title}</span>
                <span className="mt-0.5 text-xs text-muted">{b.description}</span>
                <span className="sr-only">{on ? "Desbloqueado" : "Bloqueado"}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-5 sm:p-6" aria-labelledby="xp-breakdown-title">
        <CardHeader titleId="xp-breakdown-title" title="De onde vem o seu XP" />
        <ul className="mt-3 divide-y divide-line">
          {xp.breakdown.map((b) => (
            <li key={b.label} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-muted">{b.label}</span>
              <span className="font-semibold text-fg">{b.xp} XP</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Regras provisórias para a demonstração. As regras oficiais ainda serão definidas pela equipe.</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex items-start gap-3 p-4">
          <CalendarCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-semibold text-fg">Sequência de dias</p>
            <p className="text-xs text-muted">Aparece quando houver registro diário real das suas atividades.</p>
          </div>
        </Card>
        <Link href="/ranking" className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand/30">
          <Trophy aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-semibold text-fg">Ranking</p>
            <p className="text-xs text-muted">Por XP de engajamento, com perfis de exemplo identificados. Nunca por vendas.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
