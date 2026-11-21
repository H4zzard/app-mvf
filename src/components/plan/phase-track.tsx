"use client";

import { Check } from "lucide-react";
import { useActivePlan } from "@/components/plan/plan-provider";
import { computeStageProgress, formatDayRange } from "@/lib/plan";
import { cn } from "@/lib/cn";

/** Trajetória visual das etapas do plano, com progresso por etapa. */
export function PhaseTrack({ currentStageId }: { currentStageId?: string }) {
  const { plan, statusMap } = useActivePlan();

  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {plan.stages.map((stage) => {
        const p = computeStageProgress(plan, statusMap, stage.id);
        const done = p.total > 0 && p.completed === p.total;
        const current = stage.id === currentStageId;
        return (
          <li key={stage.id}>
            <a
              href={`#stage-${stage.id}`}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex h-full flex-col rounded-xl border p-3 transition-colors",
                current
                  ? "border-brand/40 bg-blush"
                  : done
                    ? "border-line bg-card"
                    : "border-line bg-card/70 hover:border-line-strong",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-bold",
                    done
                      ? "bg-success text-white"
                      : current
                        ? "bg-brand text-white"
                        : "bg-canvas text-muted ring-1 ring-line",
                  )}
                >
                  {done ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : stage.order}
                </span>
                <span className="text-[0.7rem] font-medium text-muted">{formatDayRange(stage)}</span>
              </span>
              <span
                className={cn(
                  "mt-2 text-sm font-semibold leading-tight",
                  current ? "text-brand" : "text-fg",
                )}
              >
                {stage.shortTitle}
              </span>
              <span className="mt-auto pt-2 text-xs text-muted">
                {p.completed}/{p.total} concluídas
                {done ? <span className="sr-only"> — etapa concluída</span> : null}
                {current ? <span className="sr-only"> — etapa atual</span> : null}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
