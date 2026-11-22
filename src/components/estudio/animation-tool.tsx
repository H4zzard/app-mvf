"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Clapperboard, Lock, RefreshCw, Scissors, Sparkles, Star, UserRound, Wand2, X } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipGroup, SearchField } from "@/components/ui/chips";
import { CopyButton } from "@/components/ui/copy-button";
import { DEMO_PRODUCTS } from "@/demo/products";
import { SCRIPT_CATEGORIES, fillProduct, searchLibrary } from "@/demo/studio-scripts";
import {
  ANIMATION_LIMITS,
  PACE_LABEL,
  PART_META,
  TAKE_LENGTHS,
  allTakesText,
  defaultAnimationBrief,
  exactDialogue,
  speechSeconds,
  splitPastedScript,
  validateAnimationBrief,
  wordCount,
  type AnimationErrors,
  type PartKey,
} from "@/lib/studio/animation";
import type { AnimationBrief, CharacterSheet, Choice, SpeechPace, TakeLength } from "@/lib/studio/contracts";
import type { AnimatorDraft } from "@/lib/studio/drafts";
import { ANIMATION_PRESETS, type AnimationPresetKey } from "@/lib/studio/presets";
import { localDemoTextGenerator } from "@/lib/studio/provider";
import type { StudioSeed } from "@/lib/demo/store";
import { cn } from "@/lib/cn";
import { ChoiceSelect, Note, OutputBlock, Section, StickyActions, TextArea, TextField, Toggle, ToolHeader, focusFirstError, scrollToResult, useStudioDraft, useStudioSeed } from "./studio-ui";

const LABEL: Record<AnimationPresetKey, string> = {
  bodyMovement: "Movimento da personagem",
  hands: "Mãos",
  expression: "Expressão",
  gaze: "Olhar",
  productAction: "Interação com o produto",
  camera: "Movimento de câmera",
  atmosphere: "Atmosfera",
  setting: "Cenário",
  style: "Estilo de gravação",
  light: "Luz",
  voiceTone: "Tom de voz",
  voiceAccent: "Idioma e sotaque",
  voiceTimbre: "Timbre",
};

const PARTS: PartKey[] = ["hook", "body", "cta"];
const initialDraft = (): AnimatorDraft => ({ brief: defaultAnimationBrief(), characterId: null, source: "biblioteca", libraryId: null, pasted: "", output: null, outputKey: null });
const productName = (name: string) => name.replace(" (demonstrativo)", "");

/** Menu 2 — gera TEXTO (prompts por take) para produzir o vídeo no Google Flow. */
export function AnimationTool() {
  const { state, dispatch } = useDemo();
  const [draft, setDraft] = useStudioDraft("animar", initialDraft);
  const [errors, setErrors] = useState<AnimationErrors>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [inspiration, setInspiration] = useState<StudioSeed | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const { brief, output } = draft;
  const sheets = state.studioCharacters;
  const stale = output !== null && draft.outputKey !== JSON.stringify(brief);

  const set = <K extends keyof AnimationBrief>(key: K, value: AnimationBrief[K]) => {
    setDraft((d) => ({ ...d, brief: { ...d.brief, [key]: value } }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function chooseSheet(s: CharacterSheet) {
    setDraft((d) => ({ ...d, characterId: s.id, brief: { ...d.brief, readyImage: false, characterAppearance: s.appearance, characterName: s.name } }));
    setErrors((e) => ({ ...e, character: undefined }));
  }

  useStudioSeed("animar", (seed) => {
    const s = seed.characterId ? sheets.find((x) => x.id === seed.characterId) : undefined;
    if (s) {
      setDraft((d) => ({ ...d, characterId: s.id, brief: { ...d.brief, readyImage: false, characterAppearance: s.appearance, characterName: s.name } }));
    }
    if (seed.productName) setDraft((d) => ({ ...d, brief: { ...d.brief, productName: seed.productName ?? "" } }));
    if (seed.hook || (!seed.characterId && seed.from)) setInspiration(seed);
  });

  function setPart(k: PartKey, text: string) {
    setDraft((d) => ({ ...d, brief: { ...d.brief, parts: { ...d.brief.parts, [k]: text } } }));
    setErrors((e) => ({ ...e, [k]: undefined, dialogue: undefined }));
  }

  function pickLibrary(id: string) {
    const s = searchLibrary("", "").find((x) => x.id === id);
    if (!s) return;
    setDraft((d) => ({ ...d, libraryId: id, brief: { ...d.brief, parts: fillProduct(s.parts, d.brief.productName), enabled: { hook: true, body: true, cta: true } } }));
    setErrors((e) => ({ ...e, dialogue: undefined }));
  }

  function splitPasted() {
    const parts = splitPastedScript(draft.pasted);
    setDraft((d) => ({ ...d, brief: { ...d.brief, parts, enabled: { hook: true, body: true, cta: true } } }));
    setErrors((e) => ({ ...e, dialogue: undefined }));
  }

  function setLanguage(lang: AnimationBrief["speechLanguage"]) {
    setDraft((d) => {
      const accent = d.brief.voiceAccent.preset;
      const voiceAccent: Choice = lang === "en" && accent === "ptbr" ? { preset: "en-us" } : lang === "pt-BR" && accent === "en-us" ? { preset: "ptbr" } : d.brief.voiceAccent;
      return { ...d, brief: { ...d.brief, speechLanguage: lang, voiceAccent } };
    });
  }

  async function generate() {
    const errs = validateAnimationBrief(brief);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(formRef.current);
      if (errs.character || errs.dialogue) formRef.current?.querySelector(`[data-anchor="${errs.character ? "character" : "dialogue"}"]`)?.scrollIntoView({ block: "center" });
      return;
    }
    const out = await localDemoTextGenerator.generateAnimationPrompts(brief);
    setDraft((d) => ({ ...d, output: out, outputKey: JSON.stringify(d.brief) }));
    dispatch({ type: "prompt/generated" });
    scrollToResult(outRef.current);
  }

  const dialogue = exactDialogue(brief);
  const words = wordCount(dialogue);
  const library = searchLibrary(query, category);
  const favs = state.favorites.templates;
  const copied = () => dispatch({ type: "prompt/copied" });

  return (
    <div className="space-y-5">
      <ToolHeader
        title="Animar Personagem"
        step="Etapa 2 de 2 · o vídeo é criado no Google Flow"
        description="Use o personagem criado, escolha a fala e gere prompts de animação por cena para colar no Google Flow."
      />

      {inspiration ? (
        <div className="flex items-start gap-2 rounded-xl border border-brand/25 bg-blush/60 p-3 text-sm text-fg">
          <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p>
              Inspirado em: <strong className="font-semibold">{inspiration.from}</strong>
            </p>
            {inspiration.hook ? <p className="mt-1 text-xs text-muted">Referência de gancho (não copie literalmente; escreva a sua fala): “{inspiration.hook}”</p> : null}
          </div>
          <button type="button" onClick={() => setInspiration(null)} aria-label="Dispensar aviso" className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-white">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div ref={formRef} className="min-w-0 space-y-4">
          <Section title="1. Personagem">
            <div data-anchor="character" className="space-y-2 sm:col-span-2">
              {sheets.length > 0 ? (
                <ul className="grid gap-2" aria-label="Fichas salvas">
                  {sheets.map((s) => {
                    const active = draft.characterId === s.id && !brief.readyImage;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => chooseSheet(s)}
                          className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors", active ? "border-brand bg-blush/70" : "border-line bg-card hover:border-brand/30")}
                        >
                          <UserRound aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-fg">{s.name}</span>
                            <span className="block text-xs text-muted">{s.summaryPt}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Note>
                  Nenhuma ficha salva ainda.{" "}
                  <Link href="/estudio-ia/personagem" className="font-semibold text-brand underline underline-offset-2">
                    Criar Personagem
                  </Link>{" "}
                  primeiro, ou marque abaixo que já tem a personagem pronta.
                </Note>
              )}
              <Toggle
                label="Já tenho personagem/imagem pronta"
                description="O app só escreve as instruções de texto. Você anexa a imagem no Google Flow; aqui nada é enviado nem analisado."
                checked={brief.readyImage}
                onChange={(v) => {
                  setDraft((d) => ({ ...d, characterId: v ? null : d.characterId, brief: { ...d.brief, readyImage: v, characterAppearance: v ? "" : d.brief.characterAppearance } }));
                  setErrors((e) => ({ ...e, character: undefined }));
                }}
              />
              {errors.character ? (
                <p role="alert" className="text-sm text-brand">
                  {errors.character}
                </p>
              ) : null}
            </div>
            {draft.characterId || brief.readyImage ? (
              <TextArea
                label={brief.readyImage ? "Descreva a personagem (opcional, inglês)" : "Aparência da ficha (ajuste se quiser)"}
                value={brief.characterAppearance}
                onChange={(v) => set("characterAppearance", v)}
                rows={2}
                maxLength={ANIMATION_LIMITS.appearance}
                hint={brief.readyImage ? "Vazio = “a personagem da imagem de referência”." : undefined}
              />
            ) : null}
            <p className="text-xs text-muted sm:col-span-2">
              Destino: <strong className="font-semibold text-fg">Google Flow</strong>. Os recursos (duração, áudio) dependem do modelo e do plano que você usa lá.
            </p>
          </Section>

          <Section title="2. Produto (opcional)" defaultOpen={false} hint="Só informações reais e verificadas.">
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs text-muted">Toque em um produto demonstrativo ou escreva o nome:</p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_PRODUCTS.slice(0, 4).map((p) => (
                  <Chip key={p.id} active={brief.productName === productName(p.name)} onClick={() => set("productName", productName(p.name))} className="min-h-9 px-3 text-xs">
                    {productName(p.name)}
                  </Chip>
                ))}
              </div>
            </div>
            <TextField label="Nome do produto" value={brief.productName} onChange={(v) => set("productName", v)} maxLength={ANIMATION_LIMITS.product + 5} error={errors.productName} />
            <TextArea
              label="Informações verificadas (opcional)"
              value={brief.productDetails}
              onChange={(v) => set("productDetails", v)}
              rows={2}
              maxLength={ANIMATION_LIMITS.productDetails}
              error={errors.productDetails}
              hint="Nada é inventado: o prompt usa só o que você escrever aqui."
            />
          </Section>

          <Section title="3. Roteiro e fala">
            <div data-anchor="dialogue" className="space-y-3 sm:col-span-2">
              <ChipGroup
                label="Origem do roteiro"
                wrap
                value={draft.source}
                onChange={(v) => setDraft((d) => ({ ...d, source: v }))}
                options={[
                  { value: "biblioteca" as const, label: "Biblioteca" },
                  { value: "colar" as const, label: "Colar meu roteiro" },
                ]}
              />
              {draft.source === "biblioteca" ? (
                <div className="space-y-2">
                  <SearchField value={query} onChange={setQuery} placeholder="Buscar roteiro" label="Buscar roteiro na biblioteca" />
                  <ChipGroup label="Categoria" value={category} onChange={setCategory} options={[{ value: "", label: "Todas" }, ...SCRIPT_CATEGORIES.map((c) => ({ value: c, label: c }))]} />
                  <ul className="grid gap-2">
                    {library.map((s) => {
                      const active = draft.libraryId === s.id;
                      const fav = favs.includes(s.id);
                      return (
                        <li key={s.id} className="relative">
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => pickLibrary(s.id)}
                            className={cn("w-full rounded-xl border p-3 pr-12 text-left transition-colors", active ? "border-brand bg-blush/70" : "border-line bg-card hover:border-brand/30")}
                          >
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-fg">{s.title}</span>
                              <Badge tone="neutral">{s.source === "exemplo" ? "Exemplo MVF" : "Validado"}</Badge>
                              <span className="text-xs text-muted">{s.category}</span>
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">{s.summary}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "favorite/toggle", kind: "templates", id: s.id })}
                            aria-pressed={fav}
                            aria-label={fav ? `Remover “${s.title}” dos favoritos` : `Favoritar “${s.title}”`}
                            className="absolute right-1 top-1 grid size-11 place-items-center rounded-full text-muted hover:text-brand"
                          >
                            <Star aria-hidden className={cn("size-4", fav && "fill-brand text-brand")} />
                          </button>
                        </li>
                      );
                    })}
                    {library.length === 0 ? <li className="text-sm text-muted">Nenhum roteiro encontrado.</li> : null}
                  </ul>
                  <p className="text-xs text-muted">Roteiros de exemplo do MVF. Os roteiros próprios da equipe NUMI entrarão aqui quando forem enviados.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <TextArea label="Cole seu roteiro" value={draft.pasted} onChange={(v) => setDraft((d) => ({ ...d, pasted: v }))} rows={5} maxLength={ANIMATION_LIMITS.part * 3} />
                  <Button variant="secondary" onClick={splitPasted} disabled={!draft.pasted.trim()} className="whitespace-normal! py-2 text-center leading-snug">
                    <Scissors aria-hidden className="size-4" />
                    Separar em Gancho, Desenvolvimento e CTA
                  </Button>
                  <p className="text-xs text-muted">A separação não muda nenhuma palavra. Confira e ajuste as partes abaixo.</p>
                </div>
              )}
            </div>

            {PARTS.map((k) => (
              <div key={k} className="space-y-2 sm:col-span-2">
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-fg">
                  <input
                    type="checkbox"
                    checked={brief.enabled[k]}
                    onChange={(e) => set("enabled", { ...brief.enabled, [k]: e.target.checked })}
                    className="size-5 accent-[var(--mvf-brand)]"
                  />
                  {PART_META[k].label.toUpperCase()}
                  {!brief.enabled[k] ? <span className="text-xs font-normal text-muted">(fora da fala)</span> : null}
                </label>
                <TextArea label={`Texto do ${PART_META[k].label.toLowerCase()}`} value={brief.parts[k]} onChange={(v) => setPart(k, v)} rows={k === "body" ? 4 : 2} maxLength={ANIMATION_LIMITS.part} error={errors[k]} />
              </div>
            ))}

            <div className="space-y-2 sm:col-span-2">
              <ChipGroup
                label="Idioma da fala"
                wrap
                value={brief.speechLanguage}
                onChange={setLanguage}
                options={[
                  { value: "pt-BR" as const, label: "Português (Brasil)" },
                  { value: "en" as const, label: "English" },
                ]}
              />
              <p className="text-xs text-muted">O prompt é escrito em inglês; a fala vai exatamente como está, no idioma escolhido.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-fg">Fala final</p>
              {dialogue ? (
                <p className="whitespace-pre-wrap rounded-xl border border-line bg-canvas p-3 text-sm text-fg">{dialogue}</p>
              ) : (
                <p className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">Escolha um roteiro ou cole o seu.</p>
              )}
              {errors.dialogue ? (
                <p role="alert" className="text-sm text-brand">
                  {errors.dialogue}
                </p>
              ) : null}
              <p className="text-xs text-muted">
                {words} palavras · cerca de {Math.round(speechSeconds(words, brief.pace))} s no ritmo {PACE_LABEL[brief.pace].toLowerCase()} (estimativa).
              </p>
              <Note>A fala nunca é reescrita, traduzida ou resumida automaticamente. O que está aqui é o que vai para os takes, palavra por palavra.</Note>
              <Button variant="secondary" disabled className="w-full whitespace-normal! py-2 text-center leading-snug">
                <Lock aria-hidden className="size-4" />
                Pedir reescrita · disponível com a IA real
              </Button>
            </div>
          </Section>

          <Section title="4. Movimento" defaultOpen={false}>
            {(["bodyMovement", "hands", "expression", "gaze", "productAction"] as const).map((k) => (
              <ChoiceSelect key={k} label={LABEL[k]} options={ANIMATION_PRESETS[k]} value={brief[k]} onChange={(c) => set(k, c)} error={errors[k]} />
            ))}
          </Section>

          <Section title="5. Câmera e cena" defaultOpen={false}>
            {(["camera", "setting", "light", "style", "atmosphere"] as const).map((k) => (
              <ChoiceSelect key={k} label={LABEL[k]} options={ANIMATION_PRESETS[k]} value={brief[k]} onChange={(c) => set(k, c)} error={errors[k]} />
            ))}
          </Section>

          <Section title="6. Voz" defaultOpen={false} hint="Voz original: sem clonar pessoas nem imitar celebridades.">
            {(["voiceTone", "voiceAccent", "voiceTimbre"] as const).map((k) => (
              <ChoiceSelect key={k} label={LABEL[k]} options={ANIMATION_PRESETS[k]} value={brief[k]} onChange={(c) => set(k, c)} error={errors[k]} />
            ))}
            <TextArea
              label="Consistência entre takes (opcional, inglês)"
              value={brief.voiceConsistency}
              onChange={(v) => set("voiceConsistency", v)}
              rows={2}
              maxLength={ANIMATION_LIMITS.consistency}
              error={errors.voiceConsistency}
              placeholder="Ex.: keep the same warm, slightly husky voice in every clip"
            />
          </Section>

          <Section title="7. Ritmo e takes">
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-fg">Ritmo da fala</p>
              <ChipGroup label="Ritmo da fala" wrap value={brief.pace} onChange={(v: SpeechPace) => set("pace", v)} options={(Object.keys(PACE_LABEL) as SpeechPace[]).map((p) => ({ value: p, label: PACE_LABEL[p] }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-fg">Duração máxima de cada take</p>
              <ChipGroup
                label="Duração máxima de cada take"
                wrap
                value={String(brief.takeLength)}
                onChange={(v) => set("takeLength", Number(v) as TakeLength)}
                options={TAKE_LENGTHS.map((s) => ({ value: String(s), label: `${s} s` }))}
              />
              <p className="text-xs text-muted">A fala ocupa no máximo 80% do take e é dividida entre frases inteiras, na ordem. Confira no Google Flow as durações disponíveis no seu plano.</p>
            </div>
          </Section>

          <StickyActions>
            <Button size="lg" onClick={generate}>
              <Wand2 aria-hidden className="size-4" />
              {output ? "Regenerar prompts" : "Gerar prompts de animação"}
            </Button>
          </StickyActions>
        </div>

        <div ref={outRef} tabIndex={-1} className="min-w-0 scroll-mt-20 space-y-4 outline-none lg:sticky lg:top-24">
          {output ? (
            <>
              <Card className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">
                    {output.takes.length} take{output.takes.length > 1 ? "s" : ""} · fala ≈ {output.estimatedSeconds} s
                  </Badge>
                  {stale ? (
                    <Badge tone="warning">
                      <RefreshCw aria-hidden className="size-3" />
                      Opções alteradas: regenere
                    </Badge>
                  ) : null}
                </div>
                <Note>No Google Flow, use a imagem da personagem como referência e cole o prompt de cada take para produzir o vídeo por lá.</Note>
                {output.warnings.map((w) => (
                  <Note key={w} tone="warning">
                    {w}
                  </Note>
                ))}
                <CopyButton text={allTakesText(output)} label="Copiar tudo (todos os takes)" className="w-full whitespace-normal! py-2 text-center leading-snug" onCopied={copied} />
                <details className="rounded-xl border border-line p-3">
                  <summary className="min-h-10 cursor-pointer content-center text-sm font-semibold text-fg">Prompt geral de animação</summary>
                  <div className="mt-2">
                    <OutputBlock title="Prompt geral" text={output.fullPrompt} onCopied={copied} />
                  </div>
                </details>
              </Card>

              <ol className="space-y-3" aria-label="Takes">
                {output.takes.map((t) => (
                  <li key={t.n}>
                    <Card className="space-y-3 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">
                          <Clapperboard aria-hidden className="size-3" />
                          Take {t.n}/{t.total}
                        </span>
                        <span className="text-xs text-muted">
                          ≈ {t.intendedSeconds} s · fala ≈ {t.speechSeconds} s
                        </span>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-subtle">{t.objective}</p>
                      <p className="text-sm font-medium text-fg">“{t.dialogue}”</p>
                      <p className="text-xs text-muted">Enquadramento: {t.framing}</p>
                      <details className="rounded-xl bg-canvas p-3">
                        <summary className="min-h-10 cursor-pointer content-center text-xs font-semibold text-fg">Ver prompt do take (texto de cena, não é vídeo)</summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[0.78rem] leading-relaxed text-fg/90">{t.prompt}</pre>
                      </details>
                      <CopyButton text={t.prompt} label={`Copiar prompt do take ${t.n}`} variant="secondary" className="w-full whitespace-normal! py-2 text-center leading-snug" onCopied={copied} />
                    </Card>
                  </li>
                ))}
              </ol>

              <Card className="space-y-3 p-4 sm:p-5">
                <OutputBlock title="Teleprompter (fala em ordem)" text={output.teleprompter} copyLabel="Copiar fala" onCopied={copied} />
                <ul className="space-y-1 text-xs text-muted">
                  {output.continuityNotes.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  className="w-full whitespace-normal! py-2 text-center leading-snug"
                  onClick={() => {
                    const el = formRef.current?.querySelectorAll("details")[3];
                    el?.setAttribute("open", "");
                    el?.scrollIntoView({ block: "start" });
                  }}
                >
                  Editar direção (a fala não muda)
                </Button>
              </Card>
            </>
          ) : (
            <Card className="grid min-h-48 place-items-center border-dashed p-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-blush text-brand">
                  <Clapperboard aria-hidden className="size-5" />
                </span>
                <p className="mt-3 font-serif text-lg font-semibold text-fg">Seus prompts por take aparecem aqui</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">São textos de cena para colar no Google Flow. O app não cria vídeo nem voz.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
