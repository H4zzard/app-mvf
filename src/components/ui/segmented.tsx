"use client";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Rótulo curto exibido abaixo de 380 px (o nome acessível continua completo). */
  short?: string;
  count?: number;
}

/**
 * Controle segmentado: 2–4 abas sempre em UMA linha, inclusive em 320 px.
 * Botões com `aria-pressed` (mesmo padrão dos chips do app).
 */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: SegmentOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="grid gap-1 rounded-lg border border-line bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            aria-label={o.count !== undefined ? `${o.label} (${o.count})` : o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold transition-colors",
              on ? "bg-wine text-on-wine shadow-sm" : "text-muted hover:bg-blush hover:text-fg",
            )}
          >
            {o.short ? (
              <>
                <span className="truncate min-[380px]:hidden">{o.short}</span>
                <span className="hidden truncate min-[380px]:inline">{o.label}</span>
              </>
            ) : (
              <span className="truncate">{o.label}</span>
            )}
            {o.count !== undefined ? (
              <span className={cn("grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[0.7rem]", on ? "bg-white/15 text-on-wine" : "bg-canvas text-subtle")}>{o.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
