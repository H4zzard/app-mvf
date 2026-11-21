"use client";

import { CalendarDays, ChevronRight, Link2 } from "lucide-react";
import { useActivePlan } from "@/components/plan/plan-provider";
import { TaskCheckButton } from "@/components/plan/task-check-button";
import { TaskDuration, TaskStatusBadge, TaskTypeLabel } from "@/components/plan/task-meta";
import { Badge } from "@/components/ui/badge";
import { formatTaskDays, getStatus, missingPrerequisites } from "@/lib/plan";
import { cn } from "@/lib/cn";
import type { PlanTask } from "@/types";

export function TaskCard({
  task,
  isNext,
  onOpen,
}: {
  task: PlanTask;
  isNext: boolean;
  onOpen: (taskId: string) => void;
}) {
  const { plan, statusMap } = useActivePlan();
  const status = getStatus(statusMap, task.id);
  const missing = status === "completed" ? [] : missingPrerequisites(plan, statusMap, task);

  return (
    <li
      id={`task-${task.id}`}
      className={cn(
        "task-anchor flex items-start gap-1 rounded-xl border bg-card py-2 pl-1 pr-3 transition-colors sm:pr-4",
        isNext ? "border-brand/35 bg-blush/40" : "border-line hover:border-line-strong",
      )}
    >
      <TaskCheckButton task={task} />

      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg py-1.5 text-left"
        aria-haspopup="dialog"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            {isNext ? <Badge tone="brand">Próximo passo</Badge> : null}
            {task.optional ? <Badge tone="neutral">Opcional</Badge> : null}
            <span className="sr-only">Status:</span>
            <TaskStatusBadge status={status} />
          </span>
          <span
            className={cn(
              "mt-1.5 block font-medium leading-snug",
              status === "completed" ? "text-muted line-through decoration-line-strong" : "text-fg",
            )}
          >
            {task.title}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <TaskTypeLabel type={task.type} />
            <TaskDuration minutes={task.durationMinutes} />
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden className="size-3.5" />
              {formatTaskDays(task)}
            </span>
            {status === "in_progress" && missing.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-warning">
                <Link2 aria-hidden className="size-3.5" />
                Ideal depois de: {missing.map((m) => m.title).join(", ")}
              </span>
            ) : null}
          </span>
        </span>
        <span className="mt-1 hidden shrink-0 items-center gap-1 text-sm font-medium text-brand sm:flex">
          Detalhes
          <ChevronRight aria-hidden className="size-4" />
        </span>
        <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 text-subtle sm:hidden" />
      </button>
    </li>
  );
}
