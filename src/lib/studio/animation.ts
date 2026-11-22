/**
 * Menu 2 — Animar Personagem: gerador de PROMPTS DE VÍDEO (somente texto).
 *
 * Divide a fala aprovada em takes SEM alterar uma palavra: cada take recebe um
 * trecho literal (a concatenação dos takes reproduz exatamente o texto). Corta
 * entre frases; só divide uma frase (em vírgula, e por último em palavras)
 * quando ela não cabe em um take, e avisa. Os textos são colados no Google
 * Flow, que é quem gera vídeo e áudio. Módulo puro.
 */
import { STUDIO_SCHEMA_VERSION, type AnimationBrief, type AnimationPromptOutput, type AnimationTake, type Choice, type ScriptParts, type SpeechPace, type TakeLength } from "./contracts.ts";
import { ANIMATION_PRESETS as A, FREE, choiceEn, clean, isChoiceValid, pick, type AnimationPresetKey } from "./presets.ts";

/** Palavras por segundo (estimativa; a duração real depende do Flow e da voz). */
export const PACE_WPS: Record<SpeechPace, number> = { calma: 2.2, natural: 2.6, animada: 3.0 };
export const PACE_LABEL: Record<SpeechPace, string> = { calma: "Calma", natural: "Natural", animada: "Animada" };
export const TAKE_LENGTHS: TakeLength[] = [4, 6, 8];
/** A fala ocupa no máximo 80% do take (o resto é respiro, para não cortar nem repetir). */
export const HEADROOM = 0.8;
export const ANIMATION_LIMITS = { part: 1500, appearance: 400, product: 80, productDetails: 300, consistency: 400 } as const;

export const PART_META = {
  hook: { label: "Gancho", en: "HOOK", objective: "Gancho: prender a atenção nos primeiros segundos" },
  body: { label: "Desenvolvimento", en: "BODY", objective: "Desenvolvimento: mostrar o produto e o uso" },
  cta: { label: "CTA", en: "CALL TO ACTION", objective: "CTA: convite final" },
} as const;
export type PartKey = keyof typeof PART_META;
const PART_ORDER: PartKey[] = ["hook", "body", "cta"];

export function defaultAnimationBrief(): AnimationBrief {
  return {
    characterAppearance: "",
    characterName: "",
    readyImage: false,
    productName: "",
    productDetails: "",
    parts: { hook: "", body: "", cta: "" },
    enabled: { hook: true, body: true, cta: true },
    speechLanguage: "pt-BR",
    bodyMovement: pick("natural"),
    hands: pick("abertas"),
    expression: pick("simpatica"),
    gaze: pick("camera"),
    productAction: pick("mostra"),
    camera: pick("estatica"),
    atmosphere: pick("acolhedora"),
    setting: pick("da-imagem"),
    style: pick("ugc"),
    light: pick("da-imagem"),
    voiceTone: pick("acolhedor"),
    voiceAccent: pick("ptbr"),
    voiceTimbre: pick("medio"),
    voiceConsistency: "",
    pace: "natural",
    takeLength: 8,
  };
}

/* --------------------------- Texto: tokens e frases --------------------------- */

export const tokens = (s: string): string[] => s.split(/\s+/).filter(Boolean);
export const wordCount = (s: string): number => tokens(s).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;

const ABBREV = /^(sr|sra|srta|dr|dra|prof|av|sto|sta|etc|vs|mr|mrs|ms|st|jr|nº|n)\.$/i;
const endsSentence = (t: string) => /[.!?…]["”'’)\]]*$/.test(t) && !ABBREV.test(t.replace(/["”'’)\]]+$/, ""));
const endsClause = (t: string) => /[,;:]["”'’)\]]*$/.test(t) || t === "—" || t === "–";

/** Frases como listas de tokens (sem alterar nenhum token). */
export function sentencesOf(text: string): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  for (const t of tokens(text)) {
    cur.push(t);
    if (endsSentence(t)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

function clausesOf(sentence: string[]): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  for (const t of sentence) {
    cur.push(t);
    if (endsClause(t)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

const wc = (toks: string[]) => toks.filter((t) => /[\p{L}\p{N}]/u.test(t)).length;

/** Divide uma lista de tokens em pedaços de no máximo `cap` palavras, de tamanho parecido. */
function chunkWords(toks: string[], cap: number): string[][] {
  const n = Math.max(1, Math.ceil(wc(toks) / cap));
  const size = Math.ceil(wc(toks) / n);
  const out: string[][] = [];
  let cur: string[] = [];
  for (const t of toks) {
    cur.push(t);
    if (wc(cur) >= size && out.length < n - 1) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

/* ------------------------------ Roteiro colado ------------------------------ */

const CTA_CUE = /(?<![\p{L}])(coment[ae]|comenta|salv[ae]|link|vitrine|carrinho|segue|siga|clica|clique|toca|toque|compartilh|manda|envia|me conta|corre|garant[ae])(?![\p{L}])/iu;

/**
 * Separa um roteiro colado em Gancho / Desenvolvimento / CTA sem alterar o
 * texto: 3+ parágrafos → primeiro, meio e último; senão, primeira frase como
 * gancho e a última como CTA se tiver chamada para ação.
 */
export function splitPastedScript(text: string): ScriptParts {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length >= 3) return { hook: paras[0], body: paras.slice(1, -1).join("\n\n"), cta: paras[paras.length - 1] };
  const sents = sentencesOf(text);
  if (sents.length === 0) return { hook: "", body: "", cta: "" };
  if (sents.length === 1) return { hook: "", body: sents[0].join(" "), cta: "" };
  const hook = sents[0].join(" ");
  const last = sents[sents.length - 1].join(" ");
  const hasCta = sents.length >= 3 && CTA_CUE.test(last);
  const middle = sents.slice(1, hasCta ? -1 : undefined).map((s) => s.join(" ")).join(" ");
  return { hook, body: middle, cta: hasCta ? last : "" };
}

/* --------------------------------- Validação --------------------------------- */

const CHOICE_KEYS: AnimationPresetKey[] = ["bodyMovement", "hands", "expression", "gaze", "productAction", "camera", "atmosphere", "setting", "style", "light", "voiceTone", "voiceAccent", "voiceTimbre"];
export type AnimationErrors = Partial<Record<AnimationPresetKey | "character" | "dialogue" | "hook" | "body" | "cta" | "productName" | "productDetails" | "voiceConsistency", string>>;

export function enabledParts(b: AnimationBrief): { key: PartKey; text: string }[] {
  return PART_ORDER.filter((k) => b.enabled[k] && b.parts[k].trim()).map((k) => ({ key: k, text: b.parts[k].trim() }));
}

export function exactDialogue(b: AnimationBrief): string {
  return enabledParts(b).map((p) => p.text).join("\n\n");
}

export function validateAnimationBrief(b: AnimationBrief): AnimationErrors {
  const e: AnimationErrors = {};
  if (!b.readyImage && !clean(b.characterAppearance)) e.character = "Escolha uma ficha salva ou marque “Já tenho personagem/imagem pronta”.";
  if (b.characterAppearance.length > ANIMATION_LIMITS.appearance) e.character = `Descrição da personagem com até ${ANIMATION_LIMITS.appearance} caracteres.`;
  for (const k of PART_ORDER) if (b.parts[k].length > ANIMATION_LIMITS.part) e[k] = `Use até ${ANIMATION_LIMITS.part} caracteres.`;
  if (enabledParts(b).length === 0) e.dialogue = "Escolha um roteiro da biblioteca ou cole o seu (pelo menos uma parte ligada e preenchida).";
  if (b.productName.length > ANIMATION_LIMITS.product) e.productName = `Use até ${ANIMATION_LIMITS.product} caracteres.`;
  if (b.productDetails.length > ANIMATION_LIMITS.productDetails) e.productDetails = `Use até ${ANIMATION_LIMITS.productDetails} caracteres.`;
  if (b.voiceConsistency.length > ANIMATION_LIMITS.consistency) e.voiceConsistency = `Use até ${ANIMATION_LIMITS.consistency} caracteres.`;
  for (const k of CHOICE_KEYS) {
    const c = b[k] as Choice;
    if (!isChoiceValid(A[k], c)) e[k] = c.preset === FREE ? "Escreva o texto livre ou escolha uma opção." : "Escolha uma opção.";
  }
  return e;
}

/* ----------------------------------- Takes ----------------------------------- */

interface Chunk {
  part: PartKey;
  toks: string[];
  forced: boolean;
}

export function speechSeconds(words: number, pace: SpeechPace): number {
  return words / PACE_WPS[pace];
}

/** Agrupa a fala em takes respeitando frases inteiras e a ordem. */
export function splitIntoTakes(b: AnimationBrief): { chunks: Chunk[]; capWords: number } {
  const capWords = Math.max(3, Math.floor(b.takeLength * HEADROOM * PACE_WPS[b.pace]));
  const chunks: Chunk[] = [];
  for (const { key, text } of enabledParts(b)) {
    let cur: string[] = [];
    let forced = false;
    const flush = () => {
      if (cur.length) chunks.push({ part: key, toks: cur, forced });
      cur = [];
      forced = false;
    };
    for (const s of sentencesOf(text)) {
      if (wc(cur) + wc(s) <= capWords) {
        cur.push(...s);
        continue;
      }
      flush();
      if (wc(s) <= capWords) {
        cur.push(...s);
        continue;
      }
      // Frase maior que um take: divide em vírgulas e, se preciso, em palavras.
      const pieces: string[][] = [];
      let acc: string[] = [];
      for (const c of clausesOf(s)) {
        if (wc(c) > capWords) {
          if (acc.length) pieces.push(acc);
          acc = [];
          pieces.push(...chunkWords(c, capWords));
        } else if (wc(acc) + wc(c) > capWords) {
          pieces.push(acc);
          acc = [...c];
        } else acc.push(...c);
      }
      if (acc.length) pieces.push(acc);
      pieces.forEach((p, i) => {
        if (i < pieces.length - 1) chunks.push({ part: key, toks: p, forced: true });
        else {
          cur = [...p];
          forced = true;
        }
      });
    }
    flush();
  }
  return { chunks, capWords };
}

const FRAMING: Record<PartKey, string> = {
  hook: "medium close-up, chest up",
  body: "medium shot, waist up, with the product visible",
  cta: "medium close-up, chest up",
};

function framingFor(b: AnimationBrief, part: PartKey): string {
  if (b.camera.preset === "estatica") return "the same framing as the reference image";
  if (part === "body" && (b.hands.preset === "aplica" || b.productAction.preset === "aplica")) return "close-up of the hands and product";
  return FRAMING[part];
}

const en = (k: AnimationPresetKey, b: AnimationBrief) => choiceEn(A[k], b[k] as Choice);
const LANGUAGE_NAME = { "pt-BR": "Brazilian Portuguese", en: "English" } as const;

export function buildAnimationPrompts(b: AnimationBrief): AnimationPromptOutput {
  const errors = validateAnimationBrief(b);
  if (Object.keys(errors).length > 0) throw new Error(`Entrada inválida: ${Object.keys(errors).join(", ")}`);

  const { chunks } = splitIntoTakes(b);
  const total = chunks.length;
  const lang = LANGUAGE_NAME[b.speechLanguage];
  const appearance = b.readyImage && !clean(b.characterAppearance) ? "the character shown in the supplied reference image" : clean(b.characterAppearance);
  const product = clean(b.productName);
  const productDetails = clean(b.productDetails);
  const productAction = b.productAction.preset === "nenhuma" ? "" : `${en("productAction", b)}${product ? ` (${product})` : ""}`;
  const consistency = clean(b.voiceConsistency);
  const warnings: string[] = [];

  const takes: AnimationTake[] = chunks.map((c, i) => {
    const dialogue = c.toks.join(" ");
    const spoken = speechSeconds(wc(c.toks), b.pace);
    const intended = TAKE_LENGTHS.find((s) => s <= b.takeLength && spoken <= s * HEADROOM + 1e-9) ?? b.takeLength;
    const movement = [en("bodyMovement", b), `hands: ${en("hands", b)}`, `expression: ${en("expression", b)}`, `gaze: ${en("gaze", b)}`, productAction ? `product: ${productAction}` : ""].filter(Boolean).join("; ");
    const framing = framingFor(b, c.part);
    if (c.forced) warnings.push(`Uma frase longa precisou ser dividida no take ${i + 1}. Confira se o corte ficou natural ou encurte a frase.`);
    const continuity =
      total === 1
        ? "Single clip: keep pose, expression and framing natural until the end."
        : i === 0
          ? "Start of one continuous sequence. End in a natural pose the next clip can continue from."
          : `Continue exactly from the final pose, expression and framing of clip ${i}. No reset, no re-greeting.${i < total - 1 ? " End in a pose the next clip can continue from." : ""}`;
    const prompt = [
      `Clip ${i + 1} of ${total} · about ${intended} seconds · ${b.readyImage ? "vertical video" : "vertical 9:16 video"}.`,
      "Use the supplied reference image as the exact visual reference: same person, same face, hair, clothing and environment.",
      `CHARACTER: ${appearance}.`,
      `ACTION: ${movement}.`,
      productDetails ? `PRODUCT (only what is described here, do not invent features): ${productDetails}.` : "",
      `CAMERA: ${en("camera", b)}; framing: ${framing}.`,
      `SETTING & LIGHT: ${en("setting", b)}; ${en("light", b)}.`,
      `STYLE: ${en("style", b)}; atmosphere: ${en("atmosphere", b)}.`,
      `SPOKEN DIALOGUE (in ${lang}, spoken exactly once, word for word, with natural lip sync; do not translate, rewrite, shorten or add words):`,
      `“${dialogue}”`,
      `VOICE: ${en("voiceTone", b)}; ${en("voiceAccent", b)}; ${en("voiceTimbre", b)}. Original voice, not imitating any real person. The exact same voice in every clip.${consistency ? ` ${consistency}` : ""}`,
      `PACING: about ${spoken.toFixed(1)} seconds of speech; after the last word the character stays silent and natural until the clip ends.`,
      "AUDIO: only the character's voice and natural room ambience. No music, no added sound effects, no other voices.",
      `CONTINUITY: ${continuity}`,
      "No subtitles, no on-screen text, no cuts.",
    ]
      .filter(Boolean)
      .join("\n");
    return { n: i + 1, total, objective: PART_META[c.part].objective, movement, framing, intendedSeconds: intended, speechSeconds: Math.round(spoken * 10) / 10, dialogue, prompt };
  });

  const exact = exactDialogue(b);
  const estimated = speechSeconds(wordCount(exact), b.pace);
  if (estimated > 60) warnings.push(`A fala tem cerca de ${Math.round(estimated)} s. Para vídeos curtos, considere desligar uma parte ou encurtar o texto.`);
  if (total > 8) warnings.push(`São ${total} takes. Mais takes significam mais gerações no Google Flow; confira se é isso que você quer.`);
  warnings.push("As durações são estimativas. Confira no Google Flow quais durações o seu plano e o modelo oferecem e ajuste aqui se precisar.");

  const continuityNotes = [
    "Use a MESMA imagem da personagem como referência em todos os takes.",
    "Uma dica: use o último quadro do take anterior como referência do próximo para manter a continuidade.",
    "Mantenha as mesmas opções de voz em todos os takes. A consistência perfeita não é garantida; revise cada clipe.",
  ];

  const fullPrompt = [
    `Vertical video of one continuous recording, split into ${total} clip${total > 1 ? "s" : ""} (prompts below).`,
    `CHARACTER: ${appearance}. Use the supplied reference image for every clip and keep the same identity, clothing and environment.`,
    `ACTION: ${takes[0]?.movement ?? ""}.`,
    productDetails ? `PRODUCT (only these facts): ${product ? `${product}: ` : ""}${productDetails}.` : product ? `PRODUCT: ${product}.` : "",
    `CAMERA: ${en("camera", b)}. SETTING & LIGHT: ${en("setting", b)}; ${en("light", b)}. STYLE: ${en("style", b)}; atmosphere: ${en("atmosphere", b)}.`,
    `VOICE: ${en("voiceTone", b)}; ${en("voiceAccent", b)}; ${en("voiceTimbre", b)}. Same original voice in every clip.${consistency ? ` ${consistency}` : ""}`,
    "AUDIO: only the character's voice and natural ambience; no music or sound effects.",
    `FULL SPOKEN DIALOGUE (in ${lang}, word for word, never translated or rewritten):`,
    `“${exact}”`,
    "No subtitles, no on-screen text.",
  ]
    .filter(Boolean)
    .join("\n");

  const teleprompter = takes.map((t) => `[Take ${t.n} · ${t.objective.split(":")[0]}]\n${t.dialogue}`).join("\n\n");

  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    fullPrompt,
    takes,
    teleprompter,
    exactDialogue: exact,
    continuityNotes,
    estimatedSeconds: Math.round(estimated),
    warnings,
  };
}

/** Todos os takes num texto só, separados por “Prompt 1”, “Prompt 2”… */
export function allTakesText(out: AnimationPromptOutput): string {
  const header =
    out.takes.length > 1
      ? `Generate the ${out.takes.length} clips below as SEPARATE videos, in order, with the same reference image and the exact same voice in all of them. Do not merge or skip clips and do not change the dialogue.\n\n`
      : "";
  return header + out.takes.map((t) => `Prompt ${t.n}\n${t.prompt}`).join("\n\n");
}

/** Confere que os takes reproduzem a fala aprovada, token a token. */
export function dialoguePreserved(out: Pick<AnimationPromptOutput, "takes" | "exactDialogue">): boolean {
  const a = tokens(out.takes.map((t) => t.dialogue).join(" "));
  const b = tokens(out.exactDialogue);
  return a.length === b.length && a.every((t, i) => t === b[i]);
}
