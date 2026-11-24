"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Info } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { DemoBadge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import type { Choice } from "@/lib/studio/contracts";
import type { StudioDrafts, StudioTool } from "@/lib/studio/drafts";
import { FREE, type PresetOption } from "@/lib/studio/presets";
import { localDemoTextGenerator } from "@/lib/studio/provider";
import type { StudioSeed } from "@/lib/demo/store";
import { cn } from "@/lib/cn";

/* --------------------------------- Rascunho --------------------------------- */

/**
 * Rascunho da ferramenta: estado local (rápido de digitar) sincronizado com o
 * store da demo (em memória) com atraso curto e ao sair da tela. Some no reset
 * da demo e ao recarregar a página.
 */
export function useStudioDraft<T extends NonNullable<StudioDrafts[StudioTool]>>(tool: StudioTool, initial: () => T) {
  const { state, dispatch } = useDemo();
  const stored = state.studioDrafts[tool] as T | undefined;
  const [draft, setDraft] = useState<T>(() => stored ?? initial());
  const [prevStored, setPrevStored] = useState(stored);
  if (stored !== prevStored) {
    setPrevStored(stored);
    if (stored === undefined) setDraft(initial()); // a demo foi reiniciada
  }
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
    const t = setTimeout(() => dispatch({ type: "studio/draft", draft: { [tool]: draft } }), 350);
    return () => clearTimeout(t);
  }, [draft, dispatch, tool]);
  useEffect(() => () => dispatch({ type: "studio/draft", draft: { [tool]: latest.current } }), [dispatch, tool]);
  return [draft, setDraft] as const;
}

/** Semente (Virais, Marketplace, ficha → Animador) destinada a esta ferramenta, consumida uma vez. */
export function useStudioSeed(tool: StudioTool, apply: (seed: StudioSeed) => void) {
  const { state, dispatch } = useDemo();
  const seed = state.studioSeed?.target === tool ? state.studioSeed : null;
  const [applied, setApplied] = useState<StudioSeed | null>(null);
  if (seed && seed !== applied) {
    setApplied(seed);
    apply(seed);
  }
  useEffect(() => {
    if (seed) dispatch({ type: "studio/seed", seed: null });
  }, [seed, dispatch]);
  return applied;
}

/* --------------------------------- Layout --------------------------------- */

export function ToolHeader({ title, description, step }: { title: string; description: string; step?: string }) {
  return (
    <header className="space-y-3">
      <Link href="/estudio-ia" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand hover:bg-blush">
        <ArrowLeft aria-hidden className="size-4" />
        Voltar ao Estúdio
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <DemoBadge label={localDemoTextGenerator.label} />
        {step ? <span className="text-xs font-medium text-muted">{step}</span> : null}
      </div>
      <h1 className="font-serif text-[1.75rem] font-semibold leading-tight tracking-tight text-fg sm:text-4xl">{title}</h1>
      <p className="max-w-2xl text-[0.95rem] text-muted sm:text-base">{description}</p>
    </header>
  );
}

/** Seção recolhível (nativa, acessível por teclado). */
export function Section({ title, hint, defaultOpen = true, children }: { title: string; hint?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-line bg-card shadow-card [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-brand sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-base font-semibold text-fg sm:text-lg">{title}</span>
          {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
        </span>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="grid grid-cols-1 gap-4 border-t border-line p-4 sm:grid-cols-2 sm:p-5 [&>*]:min-w-0">{children}</div>
    </details>
  );
}

export function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" }) {
  return (
    <p className={cn("flex gap-2 rounded-xl p-3 text-xs leading-relaxed", tone === "warning" ? "bg-warning-soft text-warning" : "bg-surface text-fg/80 ring-1 ring-line")}>
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/* --------------------------------- Campos --------------------------------- */

const inputBase =
  "w-full rounded-lg border bg-paper px-4 text-base text-fg placeholder:text-subtle focus:border-brand/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-canvas disabled:text-subtle";

function FieldShell({ id, label, hint, error, full, children }: { id: string; label: string; hint?: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0", full && "sm:col-span-2")}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-brand">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Seletor com a opção “✎ LIVRE — escrever...”, que abre o próprio campo de texto. */
export function ChoiceSelect({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  disabled,
  full,
}: {
  label: string;
  options: readonly PresetOption[];
  value: Choice;
  onChange: (c: Choice) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  full?: boolean;
}) {
  const id = useId();
  const freeRef = useRef<HTMLInputElement>(null);
  const isFree = value.preset === FREE;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} full={full}>
      <div className="relative">
        <select
          id={id}
          value={value.preset}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            const preset = e.target.value;
            onChange({ ...value, preset });
            if (preset === FREE) requestAnimationFrame(() => freeRef.current?.focus());
          }}
          className={cn(inputBase, "min-h-12 appearance-none pr-10", error ? "border-brand" : "border-line-strong/80")}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
          <option value={FREE}>✎ LIVRE — escrever...</option>
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </div>
      {isFree ? (
        <input
          ref={freeRef}
          value={value.free ?? ""}
          disabled={disabled}
          maxLength={220}
          onChange={(e) => onChange({ ...value, free: e.target.value })}
          aria-label={`${label}: texto livre`}
          placeholder="Escreva do seu jeito (inglês funciona melhor no Flow)"
          className={cn(inputBase, "mt-2 min-h-12", error ? "border-brand" : "border-line-strong/80")}
        />
      ) : null}
    </FieldShell>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  maxLength,
  type = "text",
  disabled,
  full,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
  type?: "text" | "number";
  disabled?: boolean;
  full?: boolean;
  inputMode?: "numeric" | "text";
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} full={full}>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, "min-h-12", error ? "border-brand" : "border-line-strong/80")}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  maxLength,
  rows = 3,
  full = true,
  counter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
  rows?: number;
  full?: boolean;
  counter?: boolean;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={counter && maxLength ? `${label} (${value.length}/${maxLength})` : label} hint={hint} error={error} full={full}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength ? maxLength + 50 : undefined}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, "resize-y py-3 leading-relaxed", error ? "border-brand" : "border-line-strong/80")}
      />
    </FieldShell>
  );
}

export function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-line bg-card p-3 sm:col-span-2">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--mvf-brand)]" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

/* --------------------------------- Saída --------------------------------- */

/** Bloco de texto gerado, com rolagem interna e botão de copiar. */
export function OutputBlock({ title, text, copyLabel = "Copiar", onCopied, mono }: { title: string; text: string; copyLabel?: string; onCopied?: () => void; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <CopyButton text={text} label={copyLabel} variant="secondary" className="min-h-10 px-4 text-sm" onCopied={onCopied} />
      </div>
      <pre
        tabIndex={0}
        aria-label={title}
        className={cn(
          "max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-ink p-3.5 text-[0.8rem] leading-relaxed text-on-wine focus-visible:outline-2 focus-visible:outline-accent [scrollbar-color:var(--mvf-wine-soft)_transparent]",
          mono ? "font-mono" : "font-sans",
        )}
      >
        {text}
      </pre>
    </div>
  );
}

/** Rola até o resultado, respeitando movimento reduzido. */
export function scrollToResult(el: HTMLElement | null) {
  requestAnimationFrame(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el?.focus({ preventScroll: true });
  });
}

/** Barra de ação fixa acima da navegação inferior (celular) e no rodapé do formulário (desktop). */
export function StickyActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 -mx-1 rounded-xl border border-line-strong/60 bg-card/95 p-2 shadow-raised backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:bottom-4">
      <div className="flex flex-wrap gap-2 [&>*]:flex-1">{children}</div>
    </div>
  );
}

/** Foca o primeiro campo com erro dentro do formulário. */
export function focusFirstError(form: HTMLElement | null) {
  requestAnimationFrame(() => {
    const el = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!el) return;
    el.closest("details")?.setAttribute("open", "");
    el.focus();
  });
}
