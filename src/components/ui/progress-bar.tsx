import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  label,
  size = "md",
  tone = "brand",
  className,
}: {
  /** 0–100 */
  value: number;
  /** Nome acessível da barra. */
  label: string;
  size?: "sm" | "md";
  tone?: "brand" | "inverse";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn(
        "w-full overflow-hidden rounded-full",
        size === "sm" ? "h-1.5" : "h-2.5",
        tone === "brand" ? "bg-blush-strong" : "bg-white/15",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "brand" ? "bg-linear-to-r from-brand to-coral" : "bg-white",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
