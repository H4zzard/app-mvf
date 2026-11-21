"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Grupo de chips de escolha única. Rola na horizontal no celular (rolagem
 * interna intencional, com borda esmaecida), quebra linha a partir de 640 px.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  wrap = false,
  className,
}: {
  label: string;
  options: { value: T; label: React.ReactNode; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  /** Quebra linha também no celular (para poucas opções). */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-2",
        wrap
          ? "flex-wrap"
          : "-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((o) => (
        <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined ? (
            <span className={cn("text-xs", value === o.value ? "text-white/80" : "text-subtle")}>{o.count}</span>
          ) : null}
        </Chip>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
        active ? "border-brand bg-brand text-white" : "border-line bg-card text-fg/80 hover:border-brand/40 hover:bg-blush",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Campo de busca com rótulo acessível e botão de limpar. Fonte 16 px (sem zoom no iPhone). */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint="search"
        className="min-h-12 w-full rounded-full border border-line bg-card pl-11 pr-12 text-base text-fg placeholder:text-subtle focus:border-brand/50 focus:outline-none focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-blush"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
