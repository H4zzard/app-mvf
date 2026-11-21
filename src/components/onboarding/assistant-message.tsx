import { BRAND } from "@/config/brand";
import { cn } from "@/lib/cn";

/**
 * “Fala” da assistente roteirizada. Não é IA generativa: os textos vêm de
 * src/config/onboarding-questions.ts.
 */
export function AssistantMessage({
  lead,
  title,
  helper,
  titleId,
  className,
  compact = false,
  ref,
}: {
  lead?: string;
  title: string;
  helper?: string;
  titleId?: string;
  className?: string;
  /** Texto longo (ex.: saudação): tipografia menor. */
  compact?: boolean;
  ref?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span
        aria-hidden
        className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-brand font-serif text-[0.7rem] font-bold text-white"
      >
        {BRAND.shortName}
      </span>
      <div className="min-w-0 max-w-xl rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3 shadow-card sm:px-5 sm:py-4">
        {lead ? <p className="mb-1 text-sm font-medium text-brand">{lead}</p> : null}
        <h1
          ref={ref}
          id={titleId}
          tabIndex={-1}
          className={cn(
            "font-serif font-semibold leading-snug text-fg outline-none",
            compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
          )}
        >
          {title}
        </h1>
        {helper ? <p className="mt-2 text-sm text-muted">{helper}</p> : null}
      </div>
    </div>
  );
}

/** Resposta anterior da aluna, à direita, para dar ritmo de conversa. */
export function UserReply({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-blush px-4 py-2 text-sm text-fg">
        <span className="sr-only">Sua resposta anterior: </span>
        {children}
      </p>
    </div>
  );
}
