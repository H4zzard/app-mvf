"use client";

import { useRef, useState } from "react";
import { BookmarkPlus, Check, Lightbulb, PencilLine, RefreshCw, Shuffle, Sparkles, Star, Video, Wand2, X } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipGroup } from "@/components/ui/chips";
import { CopyButton } from "@/components/ui/copy-button";
import { DEMO_PRODUCTS, PRODUCT_CATEGORY_LABEL } from "@/demo/products";
import type { RecordingScript, RecordingScriptBrief } from "@/lib/studio/contracts";
import type { RecordingDraft } from "@/lib/studio/drafts";
import { RECORDING_LOCATIONS } from "@/lib/studio/presets";
import { localDemoTextGenerator } from "@/lib/studio/provider";
import {
  CTA_LABEL,
  DELIVERY_LABEL,
  RECORDING_LIMITS as L,
  STYLE_LABEL,
  TONE_LABEL,
  defaultRecordingBrief,
  editRecordingScript,
  scriptToText,
  validateRecordingBrief,
  varyRecordingScript,
  type RecordingErrors,
} from "@/lib/studio/recording-scripts";
import type { StudioSeed } from "@/lib/demo/store";
import { cn } from "@/lib/cn";
import { ChoiceSelect, Note, Section, StickyActions, TextArea, TextField, Toggle, ToolHeader, focusFirstError, scrollToResult, useStudioDraft, useStudioSeed } from "./studio-ui";

const initialDraft = (): RecordingDraft => ({ brief: defaultRecordingBrief(), scripts: null, warnings: [], favorites: [], resultKey: null });
const opts = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
const productName = (name: string) => name.replace(" (demonstrativo)", "");

/** Menu 3 — dez roteiros ESCRITOS para a aluna gravar com o próprio celular. Sem Flow, sem avatar. */
export function RecordingTool() {
  const { dispatch } = useDemo();
  const [draft, setDraft] = useStudioDraft("roteiros", initialDraft);
  const [errors, setErrors] = useState<RecordingErrors>({});
  const [inspiration, setInspiration] = useState<StudioSeed | null>(null);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const { brief, scripts } = draft;
  const stale = scripts !== null && draft.resultKey !== JSON.stringify(brief);

  const set = <K extends keyof RecordingScriptBrief>(key: K, value: RecordingScriptBrief[K]) => {
    setDraft((d) => ({ ...d, brief: { ...d.brief, [key]: value } }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  useStudioSeed("roteiros", (seed) => {
    if (seed.productName) setDraft((d) => ({ ...d, brief: { ...d.brief, productName: seed.productName ?? "", category: seed.productCategory ?? d.brief.category } }));
    setInspiration(seed);
  });

  function selectProduct(id: string) {
    const p = DEMO_PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    setDraft((d) => ({ ...d, brief: { ...d.brief, productName: productName(p.name), category: PRODUCT_CATEGORY_LABEL[p.category] } }));
    setErrors((e) => ({ ...e, productName: undefined }));
  }

  async function generate() {
    const errs = validateRecordingBrief(brief);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(formRef.current);
      return;
    }
    const out = await localDemoTextGenerator.generateTenRecordingScripts(brief);
    setDraft((d) => ({ ...d, scripts: out.scripts, warnings: out.warnings, favorites: [], resultKey: JSON.stringify(d.brief) }));
    setOnlyFavs(false);
    dispatch({ type: "prompt/generated" });
    scrollToResult(outRef.current);
  }

  const replace = (s: RecordingScript) => setDraft((d) => ({ ...d, scripts: d.scripts?.map((x) => (x.id === s.id ? s : x)) ?? null }));
  const toggleFav = (id: string) => setDraft((d) => ({ ...d, favorites: d.favorites.includes(id) ? d.favorites.filter((x) => x !== id) : [...d.favorites, id] }));
  const shown = scripts?.filter((s) => !onlyFavs || draft.favorites.includes(s.id)) ?? [];

  return (
    <div className="space-y-5">
      <ToolHeader
        title="Roteiros para Gravar Aparecendo"
        step="Você grava com o seu celular · não precisa do Google Flow"
        description="Descreva seu produto e receba dez roteiros escritos para gravar com seu próprio rosto."
      />

      {inspiration ? (
        <div className="flex items-start gap-2 rounded-xl border border-brand/25 bg-blush/60 p-3 text-sm text-fg">
          <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p>
              Inspirado em: <strong className="font-semibold">{inspiration.from}</strong>
            </p>
            {inspiration.hook ? <p className="mt-1 text-xs text-muted">Referência de gancho (não copie literalmente): “{inspiration.hook}”</p> : null}
            {inspiration.productName ? <p className="mt-1 text-xs text-muted">Produto demonstrativo: descreva abaixo só características reais.</p> : null}
          </div>
          <button type="button" onClick={() => setInspiration(null)} aria-label="Dispensar aviso" className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-white">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div ref={formRef} className="min-w-0 space-y-4">
          <Section title="1. Qual produto você vai mostrar?" hint="Obrigatório: produto, descrição e modo de uso.">
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs text-muted">Escolha no Marketplace (demonstrativo) ou escreva:</p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_PRODUCTS.slice(0, 6).map((p) => (
                  <Chip key={p.id} active={brief.productName === productName(p.name)} onClick={() => selectProduct(p.id)} className="min-h-9 px-3 text-xs">
                    {productName(p.name)}
                  </Chip>
                ))}
              </div>
            </div>
            <TextField label="Nome do produto" value={brief.productName} onChange={(v) => set("productName", v)} maxLength={L.productMax + 5} error={errors.productName} placeholder="Ex.: Sérum facial" />
            <TextField label="Categoria (opcional)" value={brief.category} onChange={(v) => set("category", v)} maxLength={40} placeholder="Ex.: Skincare" />
            <TextArea
              label="Descreva o produto"
              value={brief.description}
              onChange={(v) => set("description", v)}
              maxLength={L.text}
              error={errors.description}
              placeholder="O que é, do que é feito (se fizer diferença), para quem serve e as características reais."
            />
            <TextArea label="O que ele faz e como é usado?" value={brief.howToUse} onChange={(v) => set("howToUse", v)} maxLength={L.text} error={errors.howToUse} placeholder="Modo de uso, passo a passo. Ex.: Aplique duas gotas no rosto limpo." />
            <TextArea label="Benefícios comprovados (opcional)" value={brief.benefits} onChange={(v) => set("benefits", v)} rows={2} maxLength={L.short} error={errors.benefits} hint="Só o que consta nas informações oficiais do produto." />
            <TextArea label="Cuidados e limitações (opcional)" value={brief.limitations} onChange={(v) => set("limitations", v)} rows={2} maxLength={L.short} error={errors.limitations} />
            <TextArea label="Diferencial verificável (opcional)" value={brief.differential} onChange={(v) => set("differential", v)} rows={2} maxLength={L.differential} error={errors.differential} hint="Algo que dá para mostrar ou conferir. Habilita os ângulos de comparação e diferencial." />
          </Section>

          <Section title="2. Como você quer gravar?">
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-fg">Estilo</p>
              <ChipGroup label="Estilo de gravação" value={brief.style} onChange={(v) => set("style", v)} options={opts(STYLE_LABEL)} />
              {brief.style === "livre" ? <TextField label="Como você quer gravar" value={brief.styleFree} onChange={(v) => set("styleFree", v)} maxLength={L.free + 5} error={errors.styleFree} /> : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-fg">Fala</p>
              <ChipGroup label="Forma de falar" value={brief.delivery} onChange={(v) => set("delivery", v)} options={opts(DELIVERY_LABEL)} />
            </div>
            <ChoiceSelect label="Onde vai gravar" options={RECORDING_LOCATIONS} value={brief.location} onChange={(c) => set("location", c)} error={errors.location} />
            <TextField label="Objetos que vai usar (opcional)" value={brief.objects} onChange={(v) => set("objects", v)} maxLength={L.free + 5} error={errors.objects} placeholder="Ex.: tripé, espelho, toalha" />
          </Section>

          <Section title="3. Tom, público e convite">
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-fg">Tom</p>
              <ChipGroup label="Tom" value={brief.tone} onChange={(v) => set("tone", v)} options={opts(TONE_LABEL)} />
            </div>
            <TextField label="Público (opcional)" value={brief.audience} onChange={(v) => set("audience", v)} maxLength={L.audience + 5} error={errors.audience} placeholder="Ex.: quem tem rotina corrida" />
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-fg">Convite final (CTA)</p>
              <ChipGroup label="Convite final" wrap value={brief.cta} onChange={(v) => set("cta", v)} options={opts(CTA_LABEL)} />
            </div>
            {brief.cta === "vitrine" ? (
              <>
                <TextField label="Preço ou condição (opcional)" value={brief.offer} onChange={(v) => set("offer", v)} maxLength={L.offer + 5} error={errors.offer} placeholder="Ex.: frete grátis nesta semana" full />
                {brief.offer.trim() ? (
                  <Toggle label="Confirmo que essa informação é verdadeira e atual" description="Sem confirmação, ela não entra nos roteiros." checked={brief.offerConfirmed} onChange={(v) => set("offerConfirmed", v)} />
                ) : null}
              </>
            ) : null}
            <Note>Os roteiros não inventam preço, desconto, escassez, depoimentos, números de venda nem alegações. Use só informações oficiais do produto.</Note>
          </Section>

          <StickyActions>
            <Button size="lg" onClick={generate}>
              <Wand2 aria-hidden className="size-4" />
              {scripts ? "Gerar de novo" : "Gerar 10 roteiros"}
            </Button>
          </StickyActions>
        </div>

        <div ref={outRef} tabIndex={-1} className="min-w-0 scroll-mt-20 space-y-3 outline-none">
          {scripts ? (
            <>
              <Card className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">10 roteiros · modelo local</Badge>
                  {stale ? (
                    <Badge tone="warning">
                      <RefreshCw aria-hidden className="size-3" />
                      Briefing alterado: gere de novo
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted">
                  Demonstração: estes textos foram montados por um modelo local a partir do que você escreveu. Nenhuma IA foi consultada. Revise e adapte antes de gravar.
                </p>
                {draft.warnings.map((w) => (
                  <Note key={w} tone="warning">
                    {w}
                  </Note>
                ))}
                {draft.favorites.length > 0 ? (
                  <ChipGroup
                    label="Mostrar"
                    wrap
                    value={onlyFavs ? "favs" : "todos"}
                    onChange={(v) => setOnlyFavs(v === "favs")}
                    options={[
                      { value: "todos", label: "Todos (10)" },
                      { value: "favs", label: `Favoritos (${draft.favorites.length})` },
                    ]}
                  />
                ) : null}
              </Card>
              <ol className="space-y-3" aria-label="Roteiros">
                {shown.map((s) => (
                  <li key={s.id}>
                    <ScriptCard
                      script={s}
                      index={(scripts?.indexOf(s) ?? 0) + 1}
                      productName={brief.productName}
                      favorite={draft.favorites.includes(s.id)}
                      onFavorite={() => toggleFav(s.id)}
                      onChange={replace}
                      onVary={() => replace(varyRecordingScript(brief, s))}
                    />
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <Card className="grid min-h-48 place-items-center border-dashed p-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-blush text-brand">
                  <Video aria-hidden className="size-5" />
                </span>
                <p className="mt-3 font-serif text-lg font-semibold text-fg">Seus 10 roteiros aparecem aqui</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Cada um com gancho, desenvolvimento, CTA, fala completa e como gravar.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ScriptCard({
  script: s,
  index,
  productName,
  favorite,
  onFavorite,
  onChange,
  onVary,
}: {
  script: RecordingScript;
  index: number;
  productName: string;
  favorite: boolean;
  onFavorite: () => void;
  onChange: (s: RecordingScript) => void;
  onVary: () => void;
}) {
  const { dispatch } = useDemo();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const copied = () => dispatch({ type: "prompt/copied" });
  const text = scriptToText(s, productName);

  function save() {
    dispatch({ type: "prompt/save", title: `${s.title} · ${productName.trim()}`, text });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="space-y-3 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{index}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold leading-snug text-fg">{s.title}</h3>
          <p className="text-xs text-muted">
            ≈ {s.estimatedSeconds} s de fala{s.variant > 0 ? ` · variação ${s.variant} (modelo local)` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `Remover “${s.title}” dos favoritos` : `Favoritar “${s.title}”`}
          className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-brand"
        >
          <Star aria-hidden className={cn("size-5", favorite && "fill-brand text-brand")} />
        </button>
      </div>

      {editing ? (
        <div className="grid gap-3">
          <TextArea label="Gancho (primeiros segundos)" value={s.hook} onChange={(v) => onChange(editRecordingScript(s, { hook: v }))} rows={2} />
          <TextArea label="Desenvolvimento" value={s.body} onChange={(v) => onChange(editRecordingScript(s, { body: v }))} rows={5} />
          <TextArea label="CTA" value={s.cta} onChange={(v) => onChange(editRecordingScript(s, { cta: v }))} rows={2} />
          <TextArea
            label="Como gravar (uma orientação por linha)"
            value={s.filmingDirections.join("\n")}
            onChange={(v) => onChange(editRecordingScript(s, { filmingDirections: v.split("\n") }))}
            rows={4}
          />
        </div>
      ) : (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Gancho</dt>
            <dd className="font-medium text-fg">{s.hook}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Desenvolvimento</dt>
            <dd className="text-fg/90">{s.body}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">CTA</dt>
            <dd className="text-fg/90">{s.cta}</dd>
          </div>
        </dl>
      )}

      <details className="rounded-xl bg-canvas p-3">
        <summary className="min-h-10 cursor-pointer content-center text-xs font-semibold text-fg">Fala completa (teleprompter) e como gravar</summary>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">{s.fullSpeech}</p>
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {s.filmingDirections.filter((d) => d.trim()).map((d, i) => (
            <li key={`${i}-${d}`}>• {d}</li>
          ))}
        </ul>
      </details>

      {s.warnings.map((w) => (
        <p key={w} className="flex gap-2 text-xs text-warning">
          <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {w}
        </p>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <CopyButton text={text} label="Copiar roteiro" className="col-span-2 sm:col-span-1" onCopied={copied} />
        <CopyButton text={s.fullSpeech} label="Copiar fala" variant="secondary" className="col-span-2 sm:col-span-1" onCopied={copied} />
        <Button variant="secondary" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          {editing ? <Check aria-hidden className="size-4" /> : <PencilLine aria-hidden className="size-4" />}
          {editing ? "Concluir" : "Editar"}
        </Button>
        <Button variant="secondary" onClick={save}>
          {saved ? <Check aria-hidden className="size-4 text-success" /> : <BookmarkPlus aria-hidden className="size-4" />}
          {saved ? "Salvo" : "Salvar"}
        </Button>
        <Button variant="ghost" className="col-span-2 whitespace-normal! py-2 text-center leading-snug" onClick={onVary}>
          <Shuffle aria-hidden className="size-4" />
          Criar variação (modelo local)
        </Button>
      </div>
    </Card>
  );
}
