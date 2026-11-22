/**
 * Contratos de dados do Estúdio IA (três geradores de TEXTO).
 *
 * REGRA CENTRAL: o app só produz TEXTO. O provedor de linguagem (local agora,
 * DeepSeek no futuro, só no servidor) escreve prompts e roteiros; imagem e vídeo
 * são feitos FORA do app, no Google Flow. Nenhum tipo aqui carrega mídia, URL de
 * arquivo ou referência a imagem enviada.
 *
 * Módulo puro (roda em `node --test`).
 */

export const STUDIO_SCHEMA_VERSION = 1;

/* ------------------------------- Personagem ------------------------------- */

/** Valor de um seletor: id de um preset OU texto livre (opção “✎ LIVRE”). */
export interface Choice {
  preset: string;
  /** Usado quando `preset === "livre"`. */
  free?: string;
}

export type RealismLevel = "padrao" | "detalhado";

export interface CharacterBrief {
  /** Nome interno da ficha (só para a aluna se organizar). */
  name: string;
  /** Idade adulta (18 a 80). */
  age: number;
  presentation: Choice;
  skinTone: Choice;
  features: string;
  expression: Choice;
  hairLength: Choice;
  hairTexture: Choice;
  hairStyle: Choice;
  hairColor: Choice;
  outfit: Choice;
  fabric: Choice;
  accessories: Choice;
  makeup: Choice;
  pose: Choice;
  gesture: Choice;
  productInteraction: Choice;
  /** Descrição genérica do objeto em cena (sem marca). */
  productObject: string;
  setting: Choice;
  lighting: Choice;
  camera: Choice;
  lens: Choice;
  framing: Choice;
  aspect: Choice;
  depth: Choice;
  finish: Choice;
  colorGrade: Choice;
  realism: RealismLevel;
  /** Substitui o texto automático de pele (opcional). */
  skinOverride: string;
  /** Substitui o texto automático de detalhes (opcional). */
  detailOverride: string;
  /** A aluna já tem uma imagem própria/autorizada e vai anexá-la NO GOOGLE FLOW. */
  hasReferenceImage: boolean;
}

export interface CharacterPromptOutput {
  schemaVersion: number;
  /** Prompt em inglês para colar no Google Flow (imagem estática, sem fala). */
  visualPrompt: string;
  /** Atributos estruturados (mesma informação do prompt). Não é imagem. */
  structuredAttributes: Record<string, unknown>;
  language: "en";
  /** Resumo em português da ficha (o que a aluna escolheu). */
  summaryPt: string;
  /** Linha curta de aparência (inglês) usada para continuidade no Animador. */
  appearance: string;
  notes: string[];
}

/** Ficha salva (demo, em memória) para usar no Animador. */
export interface CharacterSheet {
  id: string;
  schemaVersion: number;
  name: string;
  brief: CharacterBrief;
  visualPrompt: string;
  summaryPt: string;
  appearance: string;
  hasReferenceImage: boolean;
}

/* -------------------------------- Animação -------------------------------- */

export type SpeechLanguage = "pt-BR" | "en";
export type SpeechPace = "calma" | "natural" | "animada";
export type TakeLength = 4 | 6 | 8;

export interface ScriptParts {
  hook: string;
  body: string;
  cta: string;
}

export interface AnimationBrief {
  /** Aparência vinda da ficha (inglês) ou descrita pela aluna. */
  characterAppearance: string;
  characterName: string;
  /** “Já tenho personagem/imagem pronta”: só escreve instruções, não recebe arquivo. */
  readyImage: boolean;
  productName: string;
  productDetails: string;
  parts: ScriptParts;
  enabled: { hook: boolean; body: boolean; cta: boolean };
  speechLanguage: SpeechLanguage;
  bodyMovement: Choice;
  hands: Choice;
  expression: Choice;
  gaze: Choice;
  productAction: Choice;
  camera: Choice;
  atmosphere: Choice;
  setting: Choice;
  style: Choice;
  light: Choice;
  voiceTone: Choice;
  voiceAccent: Choice;
  voiceTimbre: Choice;
  voiceConsistency: string;
  pace: SpeechPace;
  takeLength: TakeLength;
}

export interface AnimationTake {
  n: number;
  total: number;
  /** Objetivo visual do take (Gancho / Desenvolvimento / CTA). */
  objective: string;
  movement: string;
  framing: string;
  /** Duração pretendida do clipe (estimativa, não garantia). */
  intendedSeconds: number;
  /** Tempo estimado de fala dentro do clipe. */
  speechSeconds: number;
  /** Fala EXATA deste take (trecho literal do texto aprovado). */
  dialogue: string;
  prompt: string;
}

export interface AnimationPromptOutput {
  schemaVersion: number;
  fullPrompt: string;
  takes: AnimationTake[];
  teleprompter: string;
  /** Texto aprovado, exatamente como a aluna deixou (partes ligadas). */
  exactDialogue: string;
  continuityNotes: string[];
  estimatedSeconds: number;
  warnings: string[];
}

/* ---------------------------- Roteiros (aparecer) ---------------------------- */

export type RecordingStyle = "rotina" | "aplicacao" | "unboxing" | "review" | "demonstracao" | "dicas" | "livre";
export type RecordingDelivery = "camera" | "voiceover" | "cortes" | "take_unico";
export type RecordingTone = "espontaneo" | "divertido" | "didatico" | "direto" | "storytelling";
export type RecordingCta = "vitrine" | "salvar" | "comentar" | "sem_venda";

export interface RecordingScriptBrief {
  productName: string;
  category: string;
  description: string;
  howToUse: string;
  /** Benefícios COMPROVADOS (opcional). */
  benefits: string;
  /** Cuidados e limitações (opcional). */
  limitations: string;
  /** Diferencial verificável (opcional). */
  differential: string;
  style: RecordingStyle;
  styleFree: string;
  delivery: RecordingDelivery;
  location: Choice;
  objects: string;
  tone: RecordingTone;
  audience: string;
  cta: RecordingCta;
  /** Preço/condição: só entra se `offerConfirmed`. */
  offer: string;
  offerConfirmed: boolean;
}

export interface RecordingScript {
  id: string;
  angle: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  fullSpeech: string;
  filmingDirections: string[];
  estimatedSeconds: number;
  /** Fala em primeira pessoa: a aluna deve adaptar ao que viveu. */
  firstPerson: boolean;
  variant: number;
  warnings: string[];
}

export interface RecordingScriptsOutput {
  schemaVersion: number;
  /** Exatamente 10. */
  scripts: RecordingScript[];
  warnings: string[];
}

/* ------------------------------ Provedor (porta) ------------------------------ */

/**
 * Porta de geração de TEXTO. Hoje só existe o `LocalDemoTextGenerator`
 * (determinístico, sem rede). O provedor DeepSeek é apenas planejado: ficará
 * exclusivamente no servidor (ver docs/ESTUDIO_IA.md). Nenhuma operação recebe
 * ou devolve imagem, áudio ou vídeo.
 */
export interface TextGenerationProvider {
  readonly kind: "demo_local";
  /** Rótulo honesto para a interface. */
  readonly label: string;
  generateCharacterPrompt(brief: CharacterBrief): Promise<CharacterPromptOutput>;
  generateAnimationPrompts(brief: AnimationBrief): Promise<AnimationPromptOutput>;
  generateTenRecordingScripts(brief: RecordingScriptBrief): Promise<RecordingScriptsOutput>;
}
