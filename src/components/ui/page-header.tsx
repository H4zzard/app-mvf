import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-3 sm:gap-4", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted">{eyebrow}</div>
        ) : null}
        <h1 className="font-serif text-[1.75rem] font-semibold leading-tight tracking-tight text-fg sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="mt-1.5 text-[0.95rem] text-muted sm:mt-2 sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
