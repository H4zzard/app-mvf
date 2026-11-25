import { Hammer } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "success" | "warning" | "demo" | "soon" | "inverse";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-muted ring-line",
  brand: "bg-blush text-brand ring-brand/15",
  success: "bg-success-soft text-success ring-success/15",
  warning: "bg-warning-soft text-warning ring-warning/15",
  demo: "bg-paper text-muted ring-line-strong",
  soon: "bg-canvas text-muted ring-line",
  inverse: "bg-paper/10 text-on-wine ring-paper/20",
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
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset max-w-full",
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
  // Identidade final: nada de selo/pílula de desenvolvimento. É uma nota discreta, só onde
  // a informação importa (honestidade), nunca como enfeite de cabeçalho.
  return <span className={cn("inline-flex items-center text-xs font-medium", inverse ? "text-on-wine-muted" : "text-muted")}>{label}</span>;
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
