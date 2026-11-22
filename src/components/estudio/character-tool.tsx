"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Check, Clapperboard, Dices, PencilLine, RefreshCw, Wand2 } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chips";
import type { CharacterBrief, Choice } from "@/lib/studio/contracts";
import { BASIC_FIELDS, CHARACTER_LIMITS, IDENTITY_FIELDS, defaultCharacterBrief, makeCharacterSheet, surpriseBrief, validateCharacterBrief, type CharacterErrors } from "@/lib/studio/character";
import type { CharacterDraft } from "@/lib/studio/drafts";
import { CHARACTER_PRESETS, type CharacterPresetKey } from "@/lib/studio/presets";
import { localDemoTextGenerator } from "@/lib/studio/provider";
import { ChoiceSelect, Note, OutputBlock, Section, StickyActions, TextArea, TextField, Toggle, ToolHeader, focusFirstError, scrollToResult, useStudioDraft } from "./studio-ui";

const LABEL: Record<CharacterPresetKey, string> = {
  presentation: "Gênero / apresentação",
  skinTone: "Tom de pele",
  expression: "Expressão",
  hairLength: "Comprimento",
  hairTexture: "Textura",
  hairStyle: "Penteado",
  hairColor: "Cor",
  outfit: "Estilo de roupa",
  fabric: "Tecido",
  accessories: "Acessórios",
  makeup: "Maquiagem",
  pose: "Postura / ação",
  gesture: "Gesto",
  productInteraction: "Interação com o produto",
  setting: "Cenário",
  lighting: "Iluminação",
  camera: "Câmera",
  lens: "Lente",
  framing: "Enquadramento",
  aspect: "Formato",
  depth: "Profundidade de campo",
  finish: "Estilo da foto",
  colorGrade: "Correção de cor",
};

const SECTIONS: { title: string; keys: CharacterPresetKey[] }[] = [
  { title: "Personagem", keys: ["presentation", "skinTone", "expression"] },
  { title: "Cabelo", keys: ["hairLength", "hairTexture", "hairStyle", "hairColor"] },
  { title: "Roupa e acessórios", keys: ["outfit", "fabric", "accessories", "makeup"] },
  { title: "Ação e pose", keys: ["pose", "gesture", "productInteraction"] },
  { title: "Ambiente e iluminação", keys: ["setting", "lighting"] },
  { title: "Câmera e ótica", keys: ["camera", "lens", "framing", "aspect", "depth"] },
  { title: "Filme e acabamento", keys: ["finish", "colorGrade"] },
];

const initialDraft = (): CharacterDraft => ({ brief: defaultCharacterBrief(), advanced: false, output: null, outputKey: null });

/** Menu 1 — gera TEXTO (prompt + JSON) para criar a imagem no Google Flow. */
export function CharacterTool() {
  const { state, dispatch } = useDemo();
  const router = useRouter();
  const [draft, setDraft] = useStudioDraft("personagem", initialDraft);
  const [errors, setErrors] = useState<CharacterErrors>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const { brief, advanced, output } = draft;
  const locked = brief.hasReferenceImage;
  const stale = output !== null && draft.outputKey !== JSON.stringify(brief);

  const set = <K extends keyof CharacterBrief>(key: K, value: CharacterBrief[K]) => {
    setDraft((d) => ({ ...d, brief: { ...d.brief, [key]: value } }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const visible = (k: CharacterPresetKey) => advanced || BASIC_FIELDS.includes(k);
  const isLocked = (k: string) => locked && (IDENTITY_FIELDS as readonly string[]).includes(k);

  async function generate() {
    const errs = validateCharacterBrief(brief);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (Object.keys(errs).some((k) => !BASIC_FIELDS.includes(k as CharacterPresetKey) && k !== "age" && k !== "name")) setDraft((d) => ({ ...d, advanced: true }));
      focusFirstError(formRef.current);
      return;
    }
    const out = await localDemoTextGenerator.generateCharacterPrompt(brief);
    setDraft((d) => ({ ...d, output: out, outputKey: JSON.stringify(d.brief) }));
    dispatch({ type: "prompt/generated" });
    scrollToResult(outRef.current);
  }

  function sheet() {
    if (!output) return null;
    const s = makeCharacterSheet(brief, output);
    dispatch({ type: "studio/character-save", sheet: s });
    return s;
  }

  function saveSheet() {
    if (!sheet()) return;
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function useInAnimator() {
    const s = sheet();
    if (!s) return;
    dispatch({ type: "studio/seed", seed: { from: s.name, target: "animar", characterId: s.id } });
    router.push("/estudio-ia/animar");
  }

  const saved = output ? state.studioCharacters.some((c) => c.id === makeCharacterSheet(brief, output).id) : false;
  const copied = () => dispatch({ type: "prompt/copied" });

  return (
    <div className="space-y-5">
      <ToolHeader
        title="Criar Personagem"
        step="Etapa 1 de 2 · a imagem é criada no Google Flow"
        description="Monte as características e receba um prompt para criar uma imagem no Google Flow."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div ref={formRef} className="min-w-0 space-y-4">
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ChipGroup
                label="Modo do formulário"
                wrap
                value={advanced ? "avancado" : "basico"}
                onChange={(v) => setDraft((d) => ({ ...d, advanced: v === "avancado" }))}
                options={[
                  { value: "basico", label: "Básico" },
                  { value: "avancado", label: "Avançado" },
                ]}
              />
              <Button variant="secondary" onClick={() => setDraft((d) => ({ ...d, brief: surpriseBrief(d.brief, Math.floor(Math.random() * 1e9)) }))}>
                <Dices aria-hidden className="size-4" />
                Surpreenda-me
              </Button>
            </div>
            <p className="text-xs text-muted">
              {advanced ? "Avançado: controle fino de cada detalhe." : "Básico: só o essencial. As escolhas ficam guardadas ao trocar de modo."} “Surpreenda-me” sugere uma combinação
              original que você pode editar.
            </p>
            <Toggle
              label="Tenho imagem de referência"
              description="Você já tem uma imagem própria (ou autorizada) e vai anexá-la no Google Flow. O prompt pede para preservar a pessoa da imagem. O app não recebe nem analisa a imagem."
              checked={brief.hasReferenceImage}
              onChange={(v) => set("hasReferenceImage", v)}
            />
            {locked ? <Note>Idade, pele e cabelo vêm da sua imagem de referência. Não use imagens de outra pessoa sem consentimento.</Note> : null}
            <TextField label="Nome interno (opcional)" value={brief.name} onChange={(v) => set("name", v)} placeholder="Ex.: Bia do skincare" maxLength={CHARACTER_LIMITS.name + 5} error={errors.name} hint="Só para você encontrar a ficha depois." />
          </Card>

          {SECTIONS.map((sec, i) => {
            const keys = sec.keys.filter(visible);
            const showAge = sec.title === "Personagem";
            const showFeatures = sec.title === "Personagem" && advanced;
            const showObject = sec.title === "Ação e pose" && advanced;
            if (keys.length === 0 && !showAge) return null;
            return (
              <Section key={sec.title} title={`${i + 1}. ${sec.title}`} defaultOpen={i < 2 || advanced}>
                {showAge ? (
                  <TextField
                    label="Idade (adulta)"
                    type="number"
                    inputMode="numeric"
                    value={String(brief.age)}
                    disabled={locked}
                    onChange={(v) => set("age", Number.parseInt(v, 10) || 0)}
                    error={locked ? undefined : errors.age}
                    hint={locked ? "Vem da imagem de referência." : `De ${CHARACTER_LIMITS.ageMin} a ${CHARACTER_LIMITS.ageMax} anos.`}
                  />
                ) : null}
                {keys.map((k) => (
                  <ChoiceSelect
                    key={k}
                    label={LABEL[k]}
                    options={CHARACTER_PRESETS[k]}
                    value={brief[k] as Choice}
                    onChange={(c) => set(k, c as never)}
                    disabled={isLocked(k)}
                    hint={isLocked(k) ? "Vem da imagem de referência." : undefined}
                    error={isLocked(k) ? undefined : errors[k]}
                  />
                ))}
                {showFeatures ? (
                  <TextField
                    label="Características visuais (opcional)"
                    value={brief.features}
                    onChange={(v) => set("features", v)}
                    disabled={locked}
                    placeholder="Ex.: freckles, dimples"
                    maxLength={CHARACTER_LIMITS.features + 10}
                    error={errors.features}
                    full
                  />
                ) : null}
                {showObject ? (
                  <TextField
                    label="Objeto em cena (opcional, sem marca)"
                    value={brief.productObject}
                    onChange={(v) => set("productObject", v)}
                    placeholder="Ex.: amber serum dropper bottle"
                    maxLength={CHARACTER_LIMITS.productObject + 10}
                    error={errors.productObject}
                    hint="Descreva o objeto de forma genérica. O prompt pede embalagem sem marca legível."
                    full
                  />
                ) : null}
              </Section>
            );
          })}

          <Section title={`${SECTIONS.length + 1}. Realismo automático`} hint="Já vem ligado: pele, cabelo, tecido, mãos e cenário ajustados às suas escolhas." defaultOpen={advanced}>
            <div className="sm:col-span-2">
              <ChipGroup
                label="Nível de realismo"
                wrap
                value={brief.realism}
                onChange={(v) => set("realism", v)}
                options={[
                  { value: "padrao", label: "Padrão" },
                  { value: "detalhado", label: "Detalhado" },
                ]}
              />
              <p className="mt-2 text-xs text-muted">Orienta o Flow sobre textura de pele, mãos e imperfeições plausíveis. Realismo perfeito não é garantido.</p>
            </div>
            {advanced ? (
              <>
                <TextArea label="Pele (vazio = automático)" value={brief.skinOverride} onChange={(v) => set("skinOverride", v)} rows={2} maxLength={CHARACTER_LIMITS.override} error={errors.skinOverride} />
                <TextArea label="Detalhes (vazio = automático)" value={brief.detailOverride} onChange={(v) => set("detailOverride", v)} rows={2} maxLength={CHARACTER_LIMITS.override} error={errors.detailOverride} />
              </>
            ) : null}
          </Section>

          <StickyActions>
            <Button size="lg" onClick={generate}>
              <Wand2 aria-hidden className="size-4" />
              {output ? "Gerar de novo" : "Gerar prompt"}
            </Button>
          </StickyActions>
        </div>

        <div ref={outRef} tabIndex={-1} className="min-w-0 scroll-mt-20 outline-none lg:sticky lg:top-24">
          {output ? (
            <Card className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">Prompt de texto</Badge>
                {stale ? (
                  <Badge tone="warning">
                    <RefreshCw aria-hidden className="size-3" />
                    Opções alteradas: gere de novo
                  </Badge>
                ) : null}
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-fg">Resumo da ficha</h2>
                <p className="mt-1 text-sm text-muted">{output.summaryPt}</p>
              </div>
              <Note>Copie o prompt e gere a imagem no Google Flow. Depois, use essa imagem como referência ao animar.</Note>
              <OutputBlock title="Prompt para imagem (inglês)" text={output.visualPrompt} onCopied={copied} />
              <details className="rounded-xl border border-line p-3 text-sm">
                <summary className="min-h-10 cursor-pointer content-center font-semibold text-fg">Orientação em português</summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                  <li>Copie o prompt em inglês (o Flow costuma responder melhor em inglês).</li>
                  <li>No Google Flow, crie uma imagem e cole o prompt.{brief.hasReferenceImage ? " Anexe a sua imagem de referência." : ""}</li>
                  <li>Revise o resultado e gere de novo lá, se precisar.</li>
                  <li>Volte aqui e toque em “Usar no Animador” para escrever os prompts de vídeo.</li>
                </ol>
              </details>
              <details className="rounded-xl border border-line p-3">
                <summary className="min-h-10 cursor-pointer content-center text-sm font-semibold text-fg">JSON estruturado</summary>
                <div className="mt-2">
                  <OutputBlock title="Atributos (JSON)" text={JSON.stringify(output.structuredAttributes, null, 2)} copyLabel="Copiar JSON" onCopied={copied} mono />
                </div>
              </details>
              <ul className="space-y-1 text-xs text-muted">
                {output.notes.slice(1).map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button variant="secondary" onClick={() => formRef.current?.querySelector<HTMLElement>("input, select")?.focus()}>
                  <PencilLine aria-hidden className="size-4" />
                  Editar
                </Button>
                <Button variant="secondary" onClick={saveSheet} disabled={stale}>
                  {savedFlash || saved ? <Check aria-hidden className="size-4 text-success" /> : <BookmarkPlus aria-hidden className="size-4" />}
                  {savedFlash ? "Ficha salva" : saved ? "Salva" : "Salvar ficha"}
                </Button>
                <Button onClick={useInAnimator} disabled={stale}>
                  <Clapperboard aria-hidden className="size-4" />
                  Usar no Animador
                </Button>
              </div>
              {stale ? <p className="text-xs text-muted">Gere de novo para salvar a ficha com as opções atuais.</p> : null}
            </Card>
          ) : (
            <Card className="grid min-h-48 place-items-center border-dashed p-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-blush text-brand">
                  <Wand2 aria-hidden className="size-5" />
                </span>
                <p className="mt-3 font-serif text-lg font-semibold text-fg">Seu prompt aparece aqui</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">É texto para colar no Google Flow. O app não cria a imagem.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
