"use client";

import { useId, useState } from "react";
import { AlertTriangle, CircleAlert, CircleCheck, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { STATUS_LABEL, STATUS_MEANING, checkTransition, transitionsFrom, type EditorialStatus } from "@/lib/content/editorial";
import { profileCan } from "@/lib/admin/roles";
import type { DraftKind } from "@/lib/admin/store";
import { cn } from "@/lib/cn";
import { useAdmin } from "./admin-provider";

export function AdminPageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-3xl">
        <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-fg sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

const STATUS_TONE: Record<EditorialStatus, "neutral" | "warning" | "brand" | "success" | "soon"> = {
  rascunho: "neutral",
  em_revisao: "warning",
  aprovado: "brand",
  publicado_local: "success",
  arquivado: "soon",
};

export function StatusBadge({ status }: { status: EditorialStatus | null }) {
  if (!status) return <Badge tone="neutral">Arquivo oficial</Badge>;
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** Ações do fluxo editorial: cada transição aparece com o motivo quando não é possível. */
export function StatusActions({ kind, id }: { kind: DraftKind; id: string }) {
  const { state, dispatch, validate } = useAdmin();
  const [done, setDone] = useState<string | null>(null);
  const draft = (kind === "aula" ? state.lessons : kind === "produto" ? state.products : state.scripts)[id];
  if (!draft) return <p className="text-xs text-muted">Salve o rascunho para usar o fluxo editorial.</p>;
  const v = validate(kind, draft.data);
  const rules = transitionsFrom(draft.status);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-fg">Status:</span>
        <StatusBadge status={draft.status} />
      </div>
      <p className="text-xs text-muted">{STATUS_MEANING[draft.status]}</p>
      <ul className="space-y-2">
        {rules.map((r) => {
          const res = checkTransition(draft.status, r.to, { can: (p) => profileCan(state.profile, p), errors: v.errors, missing: v.missing });
          return (
            <li key={r.to}>
              <Button
                size="sm"
                variant={r.to === "arquivado" || r.to === "rascunho" ? "secondary" : "primary"}
                disabled={!res.ok}
                aria-describedby={!res.ok ? `${id}-${r.to}-why` : undefined}
                onClick={() => {
                  dispatch({ type: "status/set", kind, id, to: r.to });
                  setDone(`Status alterado para “${STATUS_LABEL[r.to]}”.`);
                }}
                className="whitespace-normal! text-left leading-tight"
              >
                {r.label}
              </Button>
              {!res.ok ? (
                <p id={`${id}-${r.to}-why`} className="mt-1 text-xs text-muted">
                  {res.reason}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {done ? (
        <p role="status" className="text-xs font-medium text-success">
          {done}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------- Campos --------------------------------- */

type FieldBase = { label: string; hint?: string; error?: string; required?: boolean; className?: string };

function FieldShell({ id, label, hint, error, required, className, children, counter }: FieldBase & { id: string; children: React.ReactNode; counter?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-fg">
        <span>
          {label}
          {required ? <span className="text-brand"> *</span> : null}
        </span>
        {counter ? <span className="text-xs font-normal text-muted">{counter}</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-brand">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-card px-3.5 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand aria-[invalid=true]:border-brand";

export function TextInput({ value, onChange, max, placeholder, type = "text", ...f }: FieldBase & { value: string; onChange: (v: string) => void; max?: number; placeholder?: string; type?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} {...f} counter={max ? `${value.length}/${max}` : undefined}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${id}-err` : f.hint ? `${id}-hint` : undefined}
        className={cn(inputCls, "min-h-11")}
      />
    </FieldShell>
  );
}

export function TextArea({ value, onChange, max, rows = 3, placeholder, ...f }: FieldBase & { value: string; onChange: (v: string) => void; max?: number; rows?: number; placeholder?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} {...f} counter={max ? `${value.length}/${max}` : undefined}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${id}-err` : f.hint ? `${id}-hint` : undefined}
        className={cn(inputCls, "resize-y py-2.5")}
      />
    </FieldShell>
  );
}

export function SelectInput<T extends string>({ value, onChange, options, ...f }: FieldBase & { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const id = useId();
  return (
    <FieldShell id={id} {...f}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${id}-err` : f.hint ? `${id}-hint` : undefined}
        className={cn(inputCls, "min-h-11")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Lista simples: um item por linha (a equipe não precisa saber JSON). */
export function LinesInput({ value, onChange, ...f }: FieldBase & { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <TextArea
      {...f}
      value={text}
      rows={Math.min(6, Math.max(2, value.length + 1))}
      onChange={(t) => {
        setText(t);
        onChange(
          t
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        );
      }}
      hint={f.hint ?? "Um item por linha."}
    />
  );
}

export function CheckboxInput({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-5 shrink-0 accent-brand" aria-describedby={hint ? `${id}-hint` : undefined} />
      <label htmlFor={id} className="text-sm text-fg">
        <span className="font-semibold">{label}</span>
        {hint ? (
          <span id={`${id}-hint`} className="block text-xs text-muted">
            {hint}
          </span>
        ) : null}
      </label>
    </div>
  );
}

export function FormSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-line bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-4 border-t border-line p-4 sm:grid-cols-2 [&>*]:min-w-0">{children}</div>
    </details>
  );
}

/** Problemas de validação: erros (bloqueiam), faltantes (impedem aprovar) e avisos. */
export function Issues({ errors, missing, warnings = [] }: { errors: string[]; missing: string[]; warnings?: string[] }) {
  if (!errors.length && !missing.length && !warnings.length) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm text-success">
        <CircleCheck aria-hidden className="size-4" /> Tudo certo: pronto para revisão.
      </p>
    );
  }
  return (
    <div className="space-y-2 text-sm" aria-live="polite">
      {errors.length ? (
        <div className="rounded-xl border border-brand/30 bg-blush/50 p-3">
          <p className="flex items-center gap-2 font-semibold text-brand">
            <CircleAlert aria-hidden className="size-4" /> Corrija para salvar
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-fg">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {missing.length ? (
        <div className="rounded-xl bg-canvas p-3">
          <p className="flex items-center gap-2 font-semibold text-fg">
            <Info aria-hidden className="size-4 text-brand" /> Falta para aprovar
          </p>
          <p className="mt-1 text-muted">{missing.join(" · ")}</p>
        </div>
      ) : null}
      {warnings.length ? (
        <div className="rounded-xl bg-warning-soft p-3 text-warning">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden className="size-4" /> Avisos
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Editor em painel lateral. Com alterações não salvas, fechar (Esc, clique fora, X)
 * pede confirmação antes de descartar.
 */
export function EditorSheet({ title, eyebrow, dirty, onClose, footer, children }: { title: string; eyebrow?: string; dirty: boolean; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet
      title={title}
      eyebrow={eyebrow}
      size="lg"
      onClose={onClose}
      onRequestClose={() => {
        if (!dirty) return true;
        setConfirm(true);
        return false;
      }}
      footer={
        confirm ? (
          <div role="alertdialog" aria-labelledby="discard-title" className="w-full space-y-2">
            <p id="discard-title" className="text-sm font-semibold text-fg">
              Descartar as alterações não salvas?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirm(false)}>
                Continuar editando
              </Button>
              <Button size="sm" onClick={onClose}>
                Descartar e fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-2">
            {dirty ? (
              <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-warning">
                <span aria-hidden className="size-2 rounded-full bg-warning" /> Alterações não salvas
              </span>
            ) : null}
            {footer}
          </div>
        )
      }
    >
      {children}
    </Sheet>
  );
}

/** Baixa um arquivo gerado no navegador (nada é enviado a servidor). */
export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Moldura de prévia: inerte (não clicável) e rotulada como não publicada. */
export function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="rounded-2xl border border-dashed border-line-strong bg-surface p-3">
      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">{label} · prévia, não publicada</figcaption>
      <div inert className="pointer-events-none select-none">
        {children}
      </div>
    </figure>
  );
}
