import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border border-line bg-card shadow-card", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  titleId,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  titleId?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 id={titleId} className="font-serif text-lg font-semibold text-fg">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
