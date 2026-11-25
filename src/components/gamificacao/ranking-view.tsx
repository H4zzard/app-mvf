"use client";

import { useState } from "react";
import { Crown, Info, Medal, Users } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { usePlan } from "@/components/plan/plan-provider";
import { GameTabs } from "@/components/gamificacao/game-shell";
import { DemoBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DEMO_RANKING } from "@/demo/rewards";
import { buildRanking, type RankingRow } from "@/lib/demo/economy";
import { greetingName } from "@/lib/greeting";
import { cn } from "@/lib/cn";

/**
 * Ranking (DEMONSTRAÇÃO) por XP de engajamento. Perfis de exemplo são
 * fictícios e marcados; nunca mostra faturamento, vendas ou comissões.
 * `buildRanking` já recebe perfis externos: dados reais entram no lugar de DEMO_RANKING.
 */
export function RankingView() {
  const { xp } = useDemo();
  const { profile } = usePlan();
  const [showExamples, setShowExamples] = useState(true);
  const name = greetingName(profile);
  const me = { name: name === "parceira" ? "Você" : `${name} (você)`, initials: name === "parceira" ? "EU" : name.slice(0, 2).toUpperCase(), xp: xp.xp };
  const rows = buildRanking(showExamples ? DEMO_RANKING : [], me);
  const mine = rows.find((r) => r.isMe)!;
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<DemoBadge label="Ranking de demonstração" />}
        title="Ranking"
        description="Classificação por XP de engajamento: aulas, prática, comunidade e desafios."
      />
      <GameTabs />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted">
          <Info aria-hidden className="size-3.5 shrink-0" />
          Nunca por vendas ou faturamento. Filtros por período chegam com registros reais.
        </p>
        <div className="inline-flex min-h-10 items-center gap-2.5 text-sm font-medium text-fg">
          <span aria-hidden>Perfis de exemplo</span>
          <button
            type="button"
            role="switch"
            aria-label="Mostrar perfis de exemplo"
            aria-checked={showExamples}
            onClick={() => setShowExamples((v) => !v)}
            className="grid min-h-11 min-w-12 place-items-center"
          >
            <span className={cn("relative h-7 w-12 rounded-full transition-colors", showExamples ? "bg-brand" : "bg-line-strong")}>
              <span className={cn("absolute left-0 top-1 size-5 rounded-full bg-paper shadow transition-transform", showExamples ? "translate-x-6" : "translate-x-1")} />
            </span>
          </button>
        </div>
      </div>

      {showExamples ? (
        <>
          <section aria-label="Pódio" className="relative overflow-hidden rounded-3xl bg-wine-deep px-3 pb-0 pt-6 text-paper shadow-raised sm:px-8">
            <ol className="relative mx-auto grid max-w-lg grid-cols-3 items-end gap-2 sm:gap-4">
              {[podium[1], podium[0], podium[2]].map((r, i) =>
                r ? <PodiumSpot key={r.id} row={r} place={i === 1 ? 1 : i === 0 ? 2 : 3} /> : <li key={`vazio-${i}`} />,
              )}
            </ol>
          </section>

          <MyPosition row={mine} total={rows.length} />

          <ol className="space-y-2" aria-label="Demais posições">
            {rest.map((r) => (
              <RankRow key={r.id} row={r} />
            ))}
          </ol>
          <p className="text-center text-xs text-muted">Perfis marcados “(exemplo)” são fictícios, criados para demonstração.</p>
        </>
      ) : (
        <>
          <MyPosition row={mine} total={1} />
          <EmptyState
            icon={Users}
            title="O ranking da comunidade aparece em breve"
            description="Quando houver alunas reais com registros de engajamento, a classificação aparece aqui. Por enquanto, acompanhe o seu XP."
          />
        </>
      )}
    </div>
  );
}

const PLACE_STYLE: Record<1 | 2 | 3, { h: string; ring: string; label: string }> = {
  1: { h: "h-28 sm:h-32", ring: "ring-accent", label: "1º" },
  2: { h: "h-20 sm:h-24", ring: "ring-paper/70", label: "2º" },
  3: { h: "h-16 sm:h-20", ring: "ring-paper/70", label: "3º" },
};

function PodiumSpot({ row, place }: { row: RankingRow; place: 1 | 2 | 3 }) {
  const st = PLACE_STYLE[place];
  return (
    <li className="flex min-w-0 flex-col items-center text-center">
      {place === 1 ? <Crown aria-hidden className="mb-1 size-6 text-accent" /> : null}
      <span
        className={cn(
          "grid place-items-center rounded-full font-semibold ring-4",
          place === 1 ? "size-16 text-lg sm:size-20" : "size-12 sm:size-14",
          row.isMe ? "bg-paper text-brand" : "bg-paper/15 text-paper",
          st.ring,
        )}
      >
        {row.initials}
      </span>
      <span className="mt-2 line-clamp-2 w-full text-xs font-semibold leading-tight sm:text-sm">{row.name}</span>
      <span className="text-[0.7rem] text-on-wine-muted">{row.xp} XP</span>
      <span className={cn("mt-2 grid w-full place-items-start justify-center rounded-t-2xl bg-paper/12 pt-2 font-serif text-xl font-semibold ring-1 ring-paper/10", st.h)}>
        <span className="sr-only">Posição </span>
        {st.label}
      </span>
    </li>
  );
}

function MyPosition({ row, total }: { row: RankingRow; total: number }) {
  return (
    <Card className="flex items-center gap-4 border-brand/30 bg-blush/60 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand font-serif text-lg font-semibold text-paper">{row.position}º</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Sua posição</p>
        <p className="truncate font-semibold text-fg">{row.name}</p>
        <p className="text-xs text-muted">
          Nível {row.level.number} · {row.level.name} · {total} {total === 1 ? "participante" : "participantes"}
        </p>
      </div>
      <p className="shrink-0 text-right font-serif text-xl font-semibold text-fg">
        {row.xp}
        <span className="block text-[0.65rem] font-sans font-medium text-muted">XP</span>
      </p>
    </Card>
  );
}

function RankRow({ row }: { row: RankingRow }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card p-3",
        row.isMe ? "border-brand/40 bg-blush/50" : "border-line",
      )}
    >
      <span className="w-7 shrink-0 text-center font-serif text-lg font-semibold text-muted">{row.position}</span>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold", row.isMe ? "bg-brand text-paper" : "bg-blush text-brand")}>
        {row.initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{row.name}</span>
        <span className="flex items-center gap-1 text-xs text-muted">
          <Medal aria-hidden className="size-3" />
          Nível {row.level.number} · {row.level.name}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-fg">
        {row.xp} <span className="text-xs font-normal text-muted">XP</span>
      </span>
    </li>
  );
}

