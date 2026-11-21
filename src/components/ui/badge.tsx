import { FlaskConical, Hammer } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "success" | "warning" | "demo" | "soon" | "inverse";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-muted ring-line",
  brand: "bg-blush text-brand ring-brand/15",
  success: "bg-success-soft text-success ring-success/15",
  warning: "bg-warning-soft text-warning ring-warning/15",
  demo: "bg-white text-muted ring-line-strong",
  soon: "bg-canvas text-muted ring-line",
  inverse: "bg-white/10 text-white/85 ring-white/15",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset max-w-full",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Rótulo padrão para qualquer dado de demonstração. */
export function DemoBadge({ label = "Demonstração", inverse }: { label?: string; inverse?: boolean }) {
  return (
    <Badge tone={inverse ? "inverse" : "demo"}>
      <FlaskConical aria-hidden className="size-3" />
      {label}
    </Badge>
  );
}

/** Rótulo padrão para recursos ainda não implementados. */
export function SoonBadge() {
  return (
    <Badge tone="soon">
      <Hammer aria-hidden className="size-3" />
      Em breve
    </Badge>
  );
}
