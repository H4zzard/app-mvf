"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookmarkPlus, Check, Info, Library, RefreshCw, Sparkles, Star, Trash2, Wand2, X } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { Chip, ChipGroup } from "@/components/ui/chips";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { PageHeader } from "@/components/ui/page-header";
import { STUDIO_TEMPLATES } from "@/demo/studio-templates";
import { DEMO_PRODUCTS } from "@/demo/products";
import {
  LABELS,
  STUDIO_LIMITS,
  buildStudioPrompt,
  validateStudioInput,
  type StudioErrors,
  type StudioInput,
  type StudioOutput,
} from "@/lib/studio/prompt-builder";
import { cn } from "@/lib/cn";

const DEFAULT_INPUT: StudioInput = {
  language: "pt",
  format: "avatar",
  character: "natural",
  setting: "penteadeira",
  objective: "demonstrar",
  tone: "acolhedor",
  productName: "",
  templateId: STUDIO_TEMPLATES[0].id,
  durationSec: 30,
  hook: "",
};

const options = <K extends keyof typeof LABELS>(key: K) =>
  Object.entries(LABELS[key]).map(([value, label]) => ({ value: value as keyof (typeof LABELS)[K] & string, label: label as string }));

/**
 * Estúdio IA (DEMONSTRAÇÃO): monta prompts e roteiros com modelos
 * DETERMINÍSTICOS (sem IA paga, sem rede). Não gera vídeo nem chama o Google Flow.
 */
export function StudioView() {
  const { state, dispatch } = useDemo();
  const seed = state.studioSeed;
  const [input, setInput] = useState<StudioInput>(() => ({
    ...DEFAULT_INPUT,
    ...(seed?.format ? { format: seed.format } : {}),
    ...(seed?.hook ? { hook: seed.hook } : {}),
    ...(seed?.productName ? { productName: seed.productName } : {}),
    ...(seed?.templateId ? { templateId: seed.templateId } : {}),
  }));
  const [seedFrom, setSeedFrom] = useState<string | null>(seed?.from ?? null);
  const [errors, setErrors] = useState<StudioErrors>({});
  const [result, setResult] = useState<{ output: StudioOutput; key: string } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLInputElement>(null);

  // A semente (de Virais/Marketplace) é consumida uma vez.
  useEffect(() => {
    if (seed) dispatch({ type: "studio/seed", seed: null });
  }, [seed, dispatch]);
  useLayoutEffect(() => () => setSavedFlash(false), []);

  const set = <K extends keyof StudioInput>(key: K, value: StudioInput[K]) => {
    setInput((i) => ({ ...i, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const inputKey = JSON.stringify(input);
  const stale = result !== null && result.key !== inputKey;

  function generate() {
    const errs = validateStudioInput(input, STUDIO_TEMPLATES);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (errs.productName) productRef.current?.focus();
      return;
    }
    const output = buildStudioPrompt({ ...input, hook: input.hook?.trim() || undefined }, STUDIO_TEMPLATES);
    setResult({ output, key: inputKey });
    dispatch({ type: "prompt/generated" });
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      outputRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      outputRef.current?.focus({ preventScroll: true });
    });
  }

  function save() {
    if (!result) return;
    dispatch({ type: "prompt/save", title: result.output.title, text: result.output.fullText });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  const favTemplates = state.favorites.templates;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Modelos determinísticos · sem IA paga" />}
        title="Estúdio IA"
        description="Monte prompts e roteiros para usar no Google Flow, em português ou inglês."
      />

      {seedFrom ? (
        <p className="flex items-center gap-2 rounded-xl border border-brand/25 bg-blush/60 p-3 text-sm text-fg">
          <Sparkles aria-hidden className="size-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            Inspirado em: <strong className="font-semibold">{seedFrom}</strong>
          </span>
          <button type="button" onClick={() => setSeedFrom(null)} aria-label="Dispensar aviso" className="grid size-9 place-items-center rounded-full text-muted hover:bg-white">
            <X aria-hidden className="size-4" />
          </button>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        <Card className="space-y-5 p-4 sm:p-6">
          <Field title="Idioma">
            <ChipGroup label="Idioma" wrap value={input.language} onChange={(v) => set("language", v)} options={[{ value: "pt" as const, label: "Português" }, { value: "en" as const, label: "English" }]} />
          </Field>
          <Field title="Formato">
            <ChipGroup label="Formato" wrap value={input.format} onChange={(v) => set("format", v)} options={options("format")} />
          </Field>
          {input.format === "avatar" ? (
            <Field title="Estilo da personagem">
              <ChipGroup label="Estilo da personagem" value={input.character} onChange={(v) => set("character", v)} options={options("character")} />
            </Field>
          ) : null}
          <Field title="Cenário">
            <ChipGroup label="Cenário" value={input.setting} onChange={(v) => set("setting", v)} options={options("setting")} />
          </Field>
          <Field title="Objetivo">
            <ChipGroup label="Objetivo" value={input.objective} onChange={(v) => set("objective", v)} options={options("objective")} />
          </Field>
          <Field title="Tom">
            <ChipGroup label="Tom" value={input.tone} onChange={(v) => set("tone", v)} options={options("tone")} />
          </Field>

          <div>
            <label htmlFor="studio-product" className="mb-2 block text-sm font-semibold text-fg">
              Produto
            </label>
            <input
              ref={productRef}
              id="studio-product"
              value={input.productName}
              onChange={(e) => set("productName", e.target.value)}
              maxLength={STUDIO_LIMITS.productMax + 10}
              placeholder="Ex.: Hidratante facial"
              aria-invalid={errors.productName ? true : undefined}
              aria-describedby={errors.productName ? "studio-product-error" : "studio-product-hint"}
              className={cn(
                "min-h-12 w-full rounded-xl border bg-card px-4 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand",
                errors.productName ? "border-brand" : "border-line",
              )}
            />
            {errors.productName ? (
              <p id="studio-product-error" role="alert" className="mt-1.5 text-sm text-brand">
                {errors.productName}
              </p>
            ) : (
              <p id="studio-product-hint" className="mt-1.5 text-xs text-muted">
                Digite ou toque em um produto demonstrativo:
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_PRODUCTS.slice(0, 4).map((p) => {
                const name = p.name.replace(" (demonstrativo)", "");
                return (
                  <Chip key={p.id} active={input.productName === name} onClick={() => set("productName", name)} className="min-h-9 px-3 text-xs">
                    {name}
                  </Chip>
                );
              })}
            </div>
          </div>

          <Field title="Estrutura do roteiro">
            <ul className="grid gap-2">
              {STUDIO_TEMPLATES.map((t) => {
                const active = input.templateId === t.id;
                const fav = favTemplates.includes(t.id);
                return (
                  <li key={t.id} className="relative">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => set("templateId", t.id)}
                      className={cn(
                        "w-full rounded-xl border p-3 pr-12 text-left transition-colors",
                        active ? "border-brand bg-blush/70" : "border-line bg-card hover:border-brand/30",
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-fg">{t.title.pt}</span>
                        <Badge tone="neutral">{t.source === "exemplo" ? "Exemplo" : "Validado"}</Badge>
                        <span className="text-xs text-muted">{t.beats.length} cenas</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{t.summary}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "favorite/toggle", kind: "templates", id: t.id })}
                      aria-pressed={fav}
                      aria-label={fav ? `Remover “${t.title.pt}” dos favoritos` : `Favoritar “${t.title.pt}”`}
                      className="absolute right-1 top-1 grid size-11 place-items-center rounded-full text-muted hover:text-brand"
                    >
                      <Star aria-hidden className={cn("size-4", fav && "fill-brand text-brand")} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Field>

          <Field title="Duração">
            <ChipGroup label="Duração" wrap value={String(input.durationSec)} onChange={(v) => set("durationSec", Number(v) as StudioInput["durationSec"])} options={[{ value: "15", label: "15 s" }, { value: "30", label: "30 s" }, { value: "45", label: "45 s" }]} />
          </Field>

          <div>
            <label htmlFor="studio-hook" className="mb-2 flex items-baseline justify-between text-sm font-semibold text-fg">
              Gancho (opcional)
              <span className="text-xs font-normal text-muted">
                {(input.hook ?? "").length}/{STUDIO_LIMITS.hookMax}
              </span>
            </label>
            <textarea
              id="studio-hook"
              rows={2}
              value={input.hook}
              onChange={(e) => set("hook", e.target.value)}
              placeholder="Primeira frase do vídeo. Vazio = usa a do modelo."
              aria-invalid={errors.hook ? true : undefined}
              className={cn(
                "w-full resize-none rounded-xl border bg-card px-4 py-3 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand",
                errors.hook ? "border-brand" : "border-line",
              )}
            />
            {errors.hook ? (
              <p role="alert" className="mt-1.5 text-sm text-brand">
                {errors.hook}
              </p>
            ) : null}
          </div>

          <Button size="lg" className="w-full" onClick={generate}>
            <Wand2 aria-hidden className="size-4" />
            {result ? "Gerar de novo" : "Gerar roteiro e prompts"}
          </Button>
          <p className="flex gap-2 text-xs text-muted">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            O Estúdio monta textos a partir de modelos. O vídeo é gerado fora do app, no Google Flow.
          </p>
        </Card>

        <div ref={outputRef} tabIndex={-1} className="scroll-mt-20 space-y-4 outline-none lg:sticky lg:top-24">
          {result ? (
            <Card className="overflow-hidden">
              <div className="border-b border-line bg-blush/50 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">Pré-visualização</Badge>
                  {stale ? (
                    <Badge tone="warning">
                      <RefreshCw aria-hidden className="size-3" />
                      Opções alteradas: gere de novo
                    </Badge>
                  ) : null}
                </div>
                <h2 className="mt-2 font-serif text-xl font-semibold leading-snug text-fg">{result.output.title}</h2>
                <p className="mt-1 text-sm text-muted">{result.output.characterSheet}</p>
              </div>
              <div className="flex flex-wrap gap-2 border-b border-line p-4 sm:p-5">
                <CopyButton text={result.output.fullText} label="Copiar tudo" className="flex-1" onCopied={() => dispatch({ type: "prompt/copied" })} />
                <Button variant="secondary" onClick={save}>
                  {savedFlash ? <Check aria-hidden className="size-4 text-success" /> : <BookmarkPlus aria-hidden className="size-4" />}
                  {savedFlash ? "Salvo" : "Salvar"}
                </Button>
              </div>
              <ol className="divide-y divide-line">
                {result.output.scenes.map((s) => (
                  <li key={s.n} className="space-y-2 p-4 sm:p-5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle">
                      <span className="grid size-6 place-items-center rounded-full bg-brand text-[0.7rem] text-white">{s.n}</span>
                      {s.label}
                      <span className="font-medium normal-case tracking-normal">· {s.durationSec} s</span>
                    </p>
                    <p className="text-sm font-medium text-fg">“{s.narration}”</p>
                    <p className="rounded-xl bg-canvas p-3 text-xs leading-relaxed text-muted">{s.flowPrompt}</p>
                  </li>
                ))}
              </ol>
              <div className="space-y-1.5 border-t border-line p-4 text-xs text-muted sm:p-5">
                {result.output.checklist.map((c) => (
                  <p key={c} className="flex gap-2">
                    <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {c}
                  </p>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="grid min-h-48 place-items-center border-dashed p-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-blush text-brand">
                  <Sparkles aria-hidden className="size-5" />
                </span>
                <p className="mt-3 font-serif text-lg font-semibold text-fg">Seu roteiro aparece aqui</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Escolha as opções, informe o produto e toque em “Gerar”.</p>
              </div>
            </Card>
          )}

          {state.prompts.saved.length > 0 ? (
            <Card className="p-4 sm:p-5">
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-fg">
                <Library aria-hidden className="size-5 text-brand" />
                Salvos nesta sessão
              </h2>
              <ul className="mt-3 space-y-2">
                {state.prompts.saved.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
                    <span className="min-w-0 flex-1 text-sm font-medium text-fg">{p.title}</span>
                    <CopyButton text={p.text} variant="secondary" className="min-h-10 px-3 text-xs" onCopied={() => dispatch({ type: "prompt/copied" })} />
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "prompt/remove", id: p.id })}
                      aria-label={`Remover “${p.title}”`}
                      className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-brand"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Somem ao recarregar a página (demonstração em memória).</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-fg">{title}</p>
      {children}
    </div>
  );
}
