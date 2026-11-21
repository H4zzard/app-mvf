/**
 * Gerador DETERMINÍSTICO de prompts e roteiros para o Google Flow.
 *
 * Sem IA, sem rede, sem relógio: a mesma entrada gera sempre o mesmo texto.
 * O app NÃO gera vídeo; prepara texto para a aluna copiar e usar fora.
 * Módulo puro (roda em `node --test`).
 */
import type { ScriptTemplate } from "../../demo/studio-templates.ts";

export type StudioLanguage = "pt" | "en";
export type StudioFormat = "avatar" | "maos_produto";
export type CharacterStyle = "natural" | "elegante" | "divertida" | "especialista";
export type StudioSetting = "banheiro" | "penteadeira" | "quarto" | "estudio";
export type StudioObjective = "apresentar" | "demonstrar" | "rotina" | "duvida";
export type StudioTone = "acolhedor" | "energetico" | "sofisticado" | "direto";
export type StudioDuration = 15 | 30 | 45;

export interface StudioInput {
  language: StudioLanguage;
  format: StudioFormat;
  character: CharacterStyle;
  setting: StudioSetting;
  objective: StudioObjective;
  tone: StudioTone;
  productName: string;
  templateId: string;
  durationSec: StudioDuration;
  /** Gancho opcional (ex.: vindo de uma referência de Virais). */
  hook?: string;
}

export interface StudioScene {
  n: number;
  label: string;
  durationSec: number;
  visual: string;
  narration: string;
  flowPrompt: string;
}

export interface StudioOutput {
  title: string;
  characterSheet: string;
  scenes: StudioScene[];
  checklist: string[];
  /** Texto completo pronto para copiar. */
  fullText: string;
}

export type StudioErrors = Partial<Record<"productName" | "templateId" | "hook", string>>;

export const STUDIO_LIMITS = { productMin: 2, productMax: 60, hookMax: 140 } as const;

/* ------------------------------ Rótulos (UI) ------------------------------ */

export const LABELS = {
  format: { avatar: "Avatar IA", maos_produto: "Mãos e produto" },
  character: { natural: "Natural", elegante: "Elegante", divertida: "Divertida", especialista: "Especialista" },
  setting: { banheiro: "Banheiro claro", penteadeira: "Penteadeira", quarto: "Quarto aconchegante", estudio: "Fundo neutro" },
  objective: { apresentar: "Apresentar produto", demonstrar: "Demonstrar uso", rotina: "Mostrar rotina", duvida: "Responder dúvida" },
  tone: { acolhedor: "Acolhedor", energetico: "Energético", sofisticado: "Sofisticado", direto: "Direto" },
} as const;

/* --------------------------- Vocabulário do prompt --------------------------- */

const T = {
  pt: {
    vertical: "Vídeo vertical 9:16, câmera de celular, aparência natural de vídeo de criadora",
    hands: "Apenas mãos femininas com unhas curtas e naturais, sem rosto visível",
    character: {
      natural: "mulher de cerca de 30 anos, cabelo castanho na altura dos ombros, maquiagem leve, camiseta lisa bege",
      elegante: "mulher de cerca de 35 anos, cabelo preso em coque baixo, brincos pequenos dourados, blusa de seda off-white",
      divertida: "mulher de cerca de 25 anos, cabelo cacheado volumoso, sorriso expressivo, moletom rosa claro",
      especialista: "mulher de cerca de 40 anos, cabelo liso escuro, óculos de armação fina, blazer claro",
    },
    setting: {
      banheiro: "banheiro claro com bancada branca e espelho",
      penteadeira: "penteadeira organizada com luz suave lateral",
      quarto: "quarto aconchegante com luz natural de janela",
      estudio: "fundo neutro rosado, iluminação difusa de estúdio",
    },
    tone: {
      acolhedor: "tom acolhedor e calmo",
      energetico: "tom animado, ritmo rápido",
      sofisticado: "tom sofisticado, movimentos lentos",
      direto: "tom direto e objetivo",
    },
    objective: {
      apresentar: "apresentar o produto",
      demonstrar: "demonstrar o uso do produto",
      rotina: "mostrar o produto dentro de uma rotina",
      duvida: "responder uma dúvida sobre o produto",
    },
    rules: "Sem texto na tela, sem logotipos, sem marcas d'água.",
    scene: "Cena",
    sheet: "Ficha da personagem (use igual em todas as cenas)",
    sheetHands: "Ficha das mãos (use igual em todas as cenas)",
    script: "Roteiro",
    prompts: "Prompts para o Google Flow",
    checklistTitle: "Antes de publicar",
    checklist: [
      "Não prometa resultados (ex.: “some em 7 dias”). Descreva o uso e a sua experiência.",
      "Confira as alegações permitidas do produto nos materiais oficiais.",
      "Revise o texto e as cenas geradas antes de publicar.",
      "O vídeo é gerado fora do app, no Google Flow.",
    ],
    titleFor: (p: string, o: string) => `Roteiro para ${o}: ${p}`,
    seconds: "s",
  },
  en: {
    vertical: "Vertical 9:16 video, smartphone camera, natural creator-style look",
    hands: "Only female hands with short natural nails, no face visible",
    character: {
      natural: "woman around 30, shoulder-length brown hair, light makeup, plain beige t-shirt",
      elegante: "woman around 35, hair in a low bun, small gold earrings, off-white silk blouse",
      divertida: "woman around 25, voluminous curly hair, expressive smile, light pink sweatshirt",
      especialista: "woman around 40, straight dark hair, thin-framed glasses, light blazer",
    },
    setting: {
      banheiro: "bright bathroom with a white counter and mirror",
      penteadeira: "tidy vanity with soft side lighting",
      quarto: "cozy bedroom with natural window light",
      estudio: "neutral pink backdrop, soft diffused studio lighting",
    },
    tone: {
      acolhedor: "warm and calm tone",
      energetico: "upbeat tone, fast pacing",
      sofisticado: "sophisticated tone, slow movements",
      direto: "direct, straightforward tone",
    },
    objective: {
      apresentar: "introduce the product",
      demonstrar: "demonstrate how to use the product",
      rotina: "show the product within a routine",
      duvida: "answer a question about the product",
    },
    rules: "No on-screen text, no logos, no watermarks.",
    scene: "Scene",
    sheet: "Character sheet (use the same in every scene)",
    sheetHands: "Hands sheet (use the same in every scene)",
    script: "Script",
    prompts: "Prompts for Google Flow",
    checklistTitle: "Before posting",
    checklist: [
      "Don't promise results (e.g. “gone in 7 days”). Describe the use and your experience.",
      "Check the product's approved claims in the official materials.",
      "Review the text and generated scenes before posting.",
      "The video is generated outside the app, in Google Flow.",
    ],
    titleFor: (p: string, o: string) => `Script to ${o}: ${p}`,
    seconds: "s",
  },
} as const;

/* -------------------------------- Validação -------------------------------- */

export function normalizeProductName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function validateStudioInput(input: StudioInput, templates: ScriptTemplate[]): StudioErrors {
  const errors: StudioErrors = {};
  const product = normalizeProductName(input.productName);
  if (product.length < STUDIO_LIMITS.productMin) errors.productName = "Informe o nome do produto (mínimo de 2 letras).";
  else if (product.length > STUDIO_LIMITS.productMax) errors.productName = `Use até ${STUDIO_LIMITS.productMax} caracteres.`;
  if (!templates.some((t) => t.id === input.templateId)) errors.templateId = "Escolha uma estrutura de roteiro.";
  if (input.hook && input.hook.trim().length > STUDIO_LIMITS.hookMax) errors.hook = `Use até ${STUDIO_LIMITS.hookMax} caracteres.`;
  return errors;
}

/** Divide a duração total entre as cenas (a última recebe o resto). */
export function splitDuration(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  return Array.from({ length: parts }, (_, i) => (i === parts - 1 ? total - base * (parts - 1) : base));
}

const fill = (text: string, product: string) => text.replaceAll("{produto}", product);

/* --------------------------------- Geração --------------------------------- */

export function buildStudioPrompt(input: StudioInput, templates: ScriptTemplate[]): StudioOutput {
  const errors = validateStudioInput(input, templates);
  if (Object.keys(errors).length > 0) throw new Error(`Entrada inválida: ${Object.keys(errors).join(", ")}`);

  const lang = T[input.language];
  const template = templates.find((t) => t.id === input.templateId) as ScriptTemplate;
  const product = normalizeProductName(input.productName);
  const hook = input.hook?.trim();
  const subject = input.format === "avatar" ? lang.character[input.character] : lang.hands;
  const durations = splitDuration(input.durationSec, template.beats.length);

  const scenes: StudioScene[] = template.beats.map((beat, i) => {
    const visual = fill(beat.visual[input.language], product);
    const narration = i === 0 && hook ? hook : fill(beat.line[input.language], product);
    const flowPrompt = [
      `${lang.vertical}.`,
      `${capitalize(subject)}.`,
      `${capitalize(lang.setting[input.setting])}.`,
      `${capitalize(visual)}.`,
      `${capitalize(lang.tone[input.tone])}.`,
      `${durations[i]}${lang.seconds}.`,
      lang.rules,
    ].join(" ");
    return { n: i + 1, label: beat.label[input.language], durationSec: durations[i], visual, narration, flowPrompt };
  });

  const characterSheet = `${input.format === "avatar" ? lang.sheet : lang.sheetHands}: ${subject}; ${lang.setting[input.setting]}.`;
  const title = lang.titleFor(product, lang.objective[input.objective]);
  const checklist = [...lang.checklist];

  const fullText = [
    title,
    "",
    characterSheet,
    "",
    `${lang.script} (${input.durationSec}${lang.seconds})`,
    ...scenes.map((s) => `${s.n}. ${s.label} (${s.durationSec}${lang.seconds}): ${s.narration}`),
    "",
    lang.prompts,
    ...scenes.map((s) => `${lang.scene} ${s.n}: ${s.flowPrompt}`),
    "",
    lang.checklistTitle,
    ...checklist.map((c) => `- ${c}`),
  ].join("\n");

  return { title, characterSheet, scenes, checklist, fullText };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
