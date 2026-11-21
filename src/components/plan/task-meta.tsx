import { CircleCheck, CircleDashed, CirclePlay, Clock, ListChecks, LoaderCircle } from "lucide-react";
import type { PlanTask, TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatMinutes } from "@/lib/plan";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  if (status === "completed")
    return (
      <Badge tone="success">
        <CircleCheck aria-hidden className="size-3" />
        {STATUS_LABEL.completed}
      </Badge>
    );
  if (status === "in_progress")
    return (
      <Badge tone="brand">
        <LoaderCircle aria-hidden className="size-3" />
        {STATUS_LABEL.in_progress}
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <CircleDashed aria-hidden className="size-3" />
      {STATUS_LABEL.pending}
    </Badge>
  );
}

export function TaskTypeLabel({ type }: { type: PlanTask["type"] }) {
  const Icon = type === "lesson" ? CirclePlay : ListChecks;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon aria-hidden className="size-3.5" />
      {type === "lesson" ? "Aula" : "Ação"}
    </span>
  );
}

export function TaskDuration({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Clock aria-hidden className="size-3.5" />
      {formatMinutes(minutes)}
    </span>
  );
}
