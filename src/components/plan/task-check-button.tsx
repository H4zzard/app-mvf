"use client";

import { Check } from "lucide-react";
import { useActivePlan } from "@/components/plan/plan-provider";
import { getStatus } from "@/lib/plan";
import { cn } from "@/lib/cn";
import type { PlanTask } from "@/types";

/** Caixa de conclusão com alvo de toque de 44 px. */
export function TaskCheckButton({ task }: { task: PlanTask }) {
  const { statusMap, toggleComplete } = useActivePlan();
  const done = getStatus(statusMap, task.id) === "completed";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${done ? "Desmarcar" : "Marcar"} “${task.title}” como concluída`}
      onClick={() => toggleComplete(task.id)}
      className="group grid size-11 shrink-0 place-items-center rounded-full"
    >
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full border-2 transition-colors",
          done
            ? "border-success bg-success text-white"
            : "border-line-strong bg-white text-transparent group-hover:border-brand group-hover:text-brand/40",
        )}
      >
        <Check aria-hidden className="size-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}
