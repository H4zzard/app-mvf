/**
 * Menu 1 — Criar Personagem: gerador de PROMPT DE IMAGEM (texto).
 *
 * Monta, de forma determinística, um prompt em inglês para a aluna colar no
 * Google Flow, mais um JSON com os mesmos atributos. Não gera imagem, não
 * recebe arquivo e não analisa imagem de referência: quando a aluna marca que
 * tem uma referência própria, o texto apenas instrui o Flow a preservá-la.
 * Módulo puro (sem React, sem rede, sem relógio).
 */
import { STUDIO_SCHEMA_VERSION, type CharacterBrief, type CharacterPromptOutput, type CharacterSheet, type Choice } from "./contracts.ts";
import { CHARACTER_PRESETS as P, FREE, choiceEn, choiceLabel, clean, isChoiceValid, pick, type CharacterPresetKey } from "./presets.ts";

export const CHARACTER_LIMITS = { ageMin: 18, ageMax: 80, name: 40, features: 160, productObject: 120, override: 400 } as const;

/** Campos que somem/travam quando há imagem de referência (identidade vem dela). */
export const IDENTITY_FIELDS = ["age", "presentation", "skinTone", "features", "hairLength", "hairTexture", "hairStyle", "hairColor"] as const;

/** Campos do modo Básico (o Avançado mostra todos). */
export const BASIC_FIELDS: CharacterPresetKey[] = ["presentation", "skinTone", "hairLength", "hairTexture", "hairColor", "outfit", "pose", "setting", "lighting", "finish"];

export function defaultCharacterBrief(): CharacterBrief {
  return {
    name: "",
    age: 28,
    presentation: pick("mulher"),
    skinTone: pick("morena"),
    features: "",
    expression: pick("sorriso-leve"),
    hairLength: pick("longo"),
    hairTexture: pick("ondulado"),
    hairStyle: pick("solto"),
    hairColor: pick("castanho-escuro"),
    outfit: pick("basico"),
    fabric: pick("algodao"),
    accessories: pick("brincos"),
    makeup: pick("leve"),
    pose: pick("segurando-rosto"),
    gesture: pick("relaxadas"),
    productInteraction: pick("segura"),
    productObject: "",
    setting: pick("banheiro"),
    lighting: pick("janela"),
    camera: pick("celular"),
    lens: pick("24"),
    framing: pick("peito"),
    aspect: pick("9x16"),
    depth: pick("natural"),
    finish: pick("ugc"),
    colorGrade: pick("neutra"),
    realism: "padrao",
    skinOverride: "",
    detailOverride: "",
    hasReferenceImage: false,
  };
}

const CHOICE_KEYS = Object.keys(P) as CharacterPresetKey[];

export type CharacterErrors = Partial<Record<CharacterPresetKey | "age" | "name" | "features" | "productObject" | "skinOverride" | "detailOverride", string>>;

export function validateCharacterBrief(b: CharacterBrief): CharacterErrors {
  const e: CharacterErrors = {};
  if (!b.hasReferenceImage) {
    if (!Number.isInteger(b.age) || b.age < CHARACTER_LIMITS.ageMin || b.age > CHARACTER_LIMITS.ageMax)
      e.age = `Use uma idade adulta, de ${CHARACTER_LIMITS.ageMin} a ${CHARACTER_LIMITS.ageMax} anos.`;
    if (b.features.length > CHARACTER_LIMITS.features) e.features = `Use até ${CHARACTER_LIMITS.features} caracteres.`;
  }
  if (b.name.length > CHARACTER_LIMITS.name) e.name = `Use até ${CHARACTER_LIMITS.name} caracteres.`;
  if (b.productObject.length > CHARACTER_LIMITS.productObject) e.productObject = `Use até ${CHARACTER_LIMITS.productObject} caracteres.`;
  if (b.skinOverride.length > CHARACTER_LIMITS.override) e.skinOverride = `Use até ${CHARACTER_LIMITS.override} caracteres.`;
  if (b.detailOverride.length > CHARACTER_LIMITS.override) e.detailOverride = `Use até ${CHARACTER_LIMITS.override} caracteres.`;
  for (const k of CHOICE_KEYS) {
    if (b.hasReferenceImage && (IDENTITY_FIELDS as readonly string[]).includes(k)) continue;
    const c = b[k] as Choice;
    if (!isChoiceValid(P[k], c)) e[k] = c.preset === FREE ? "Escreva o texto livre (até 200 caracteres) ou escolha uma opção." : "Escolha uma opção.";
  }
  return e;
}

/* ------------------------------ Realismo automático ------------------------------ */

const en = (k: CharacterPresetKey, b: CharacterBrief) => choiceEn(P[k], b[k] as Choice);
const pt = (k: CharacterPresetKey, b: CharacterBrief) => choiceLabel(P[k], b[k] as Choice);

const FABRIC_REALISM: Record<string, string> = {
  algodao: "cotton with soft natural wrinkles",
  linho: "linen with a visible weave and natural creases",
  trico: "knit with visible fibers",
  malha: "soft jersey that drapes naturally",
  cetim: "satin with soft folds and a restrained sheen",
};

const SETTING_WEAR: Record<string, string> = {
  banheiro: "light water spots on the counter",
  penteadeira: "a few makeup items casually arranged",
  quarto: "slightly creased bedding",
  cozinha: "a few everyday items on the counter",
  sala: "a cushion slightly out of place",
  loja: "shelves with plain, unbranded items",
  escritorio: "a notebook and a cable on the desk",
  externo: "a few fallen leaves on the floor",
};

const CAPTURE: Record<string, string> = {
  ugc: "handheld capture with slightly imperfect framing and mild sensor noise",
  documental: "unposed capture of a natural moment",
  lifestyle: "relaxed, natural moment",
  editorial: "clean capture with natural, unretouched skin",
  cinema: "subtle film grain and restrained contrast",
};

export const CHARACTER_NEGATIVES = [
  "no extra or fused fingers",
  "no distorted or duplicated objects",
  "no readable text, logos or watermarks",
  "no heavy beauty filter or airbrushed skin",
  "no cartoon, illustration or 3D-render look",
];

export interface Realism {
  skin: string[];
  details: string[];
  environment: string[];
  capture: string[];
}

export function realismFor(b: CharacterBrief): Realism {
  const detailed = b.realism === "detalhado";
  const skin = ["natural skin texture with visible pores and subtle variation in tone", "matte finish without oily shine", "no smoothing"];
  if (b.hasReferenceImage) skin.push("skin tone, age and facial features exactly as in the attached reference image");
  else if (detailed) {
    const a = b.age;
    skin.push(
      a < 30 ? "soft early expression lines" : a < 50 ? "fine expression lines around the eyes and mouth" : a < 65 ? "visible fine wrinkles and a few age spots" : "deeper wrinkles, age spots and thinner skin on the hands",
      "a few tiny natural imperfections",
    );
  }

  const details: string[] = [];
  if (b.hasReferenceImage) details.push("hair exactly as in the reference image, with a few natural loose strands");
  else {
    const tex = b.hairTexture.preset;
    details.push(tex === "cacheado" || tex === "crespo" ? "defined curls with natural volume and a few frizzy strands" : "a few loose flyaway strands");
    if (detailed) details.push("a natural, slightly uneven parting");
  }
  const fabric = FABRIC_REALISM[b.fabric.preset];
  if (fabric) details.push(fabric);
  details.push("anatomically correct hands with five fingers each");
  if (b.productInteraction.preset !== "sem") details.push("natural grip with visible contact where the hands touch the product");
  if (detailed) details.push("natural facial asymmetry and a relaxed, unposed expression");

  const environment: string[] = [];
  const capture: string[] = [];
  if (detailed) {
    const wear = SETTING_WEAR[b.setting.preset];
    environment.push(wear ?? "a few small, believable signs of everyday use");
    environment.push("any packaging plain and unbranded, with no readable text");
    const cap = CAPTURE[b.finish.preset];
    if (cap) capture.push(cap);
    capture.push("one consistent light direction across face, hands and background");
  }

  const so = clean(b.skinOverride);
  const dov = clean(b.detailOverride);
  return { skin: so ? [so] : skin, details: dov ? [dov] : details, environment, capture };
}

/* ---------------------------------- Prompt ---------------------------------- */

const sentence = (s: string) => {
  const t = clean(s);
  if (!t) return "";
  const c = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(c) ? c : `${c}.`;
};
const joinNonEmpty = (parts: string[], sep = ", ") => parts.map(clean).filter(Boolean).join(sep);

function subjectLine(b: CharacterBrief): string {
  if (b.hasReferenceImage) {
    return "Use the attached reference image as the identity reference: the exact same person, keeping the same face, age, skin tone, hair and body proportions as shown";
  }
  const hair = joinNonEmpty([en("hairColor", b), en("hairTexture", b), en("hairLength", b)], " ");
  const hairStyle = en("hairStyle", b);
  return joinNonEmpty([
    `A ${b.age}-year-old ${en("presentation", b) || "person"} with ${en("skinTone", b)}`,
    clean(b.features),
    hair ? `${hair} hair${hairStyle ? ` ${hairStyle}` : ""}` : "",
  ]);
}

export function appearanceLine(b: CharacterBrief): string {
  if (b.hasReferenceImage) return `the same person shown in the reference image, wearing ${en("outfit", b)}`;
  const hair = joinNonEmpty([en("hairColor", b), en("hairTexture", b), en("hairLength", b)], " ");
  return joinNonEmpty([`a ${b.age}-year-old ${en("presentation", b)} with ${en("skinTone", b)}`, hair ? `${hair} hair ${en("hairStyle", b)}` : "", `wearing ${en("outfit", b)}`]);
}

export function summaryPt(b: CharacterBrief): string {
  const who = b.hasReferenceImage
    ? "Personagem da sua imagem de referência"
    : joinNonEmpty([`${pt("presentation", b)}, ${b.age} anos`, `pele ${pt("skinTone", b).toLowerCase()}`, `cabelo ${joinNonEmpty([pt("hairColor", b), pt("hairTexture", b), pt("hairLength", b)], " ").toLowerCase()}`]);
  return joinNonEmpty([who, pt("outfit", b), pt("pose", b), pt("setting", b), pt("lighting", b), pt("finish", b)], " · ");
}

export function buildCharacterPrompt(b: CharacterBrief): CharacterPromptOutput {
  const errors = validateCharacterBrief(b);
  if (Object.keys(errors).length > 0) throw new Error(`Ficha inválida: ${Object.keys(errors).join(", ")}`);
  const R = realismFor(b);
  const product = clean(b.productObject);
  const interaction = en("productInteraction", b);
  const productText = b.productInteraction.preset === "sem" ? interaction : joinNonEmpty([interaction, product ? `(${product}, plain packaging without readable brand text)` : ""], " ");
  const fabric = en("fabric", b);

  const lines = [
    sentence(`Photorealistic ${en("finish", b)}, ${en("aspect", b)} format`),
    sentence(joinNonEmpty([subjectLine(b), en("expression", b)])),
    sentence(joinNonEmpty([`wearing ${en("outfit", b)}${fabric ? ` in ${fabric}` : ""}`, en("accessories", b), en("makeup", b)])),
    sentence(joinNonEmpty([en("pose", b), en("gesture", b), productText])),
    sentence(`Setting: ${en("setting", b)}`),
    sentence(`Lighting: ${en("lighting", b)}`),
    sentence(`Shot on ${en("camera", b)} with ${en("lens", b)}, ${en("framing", b)}, ${en("depth", b)}`),
    sentence(`Color: ${en("colorGrade", b)}`),
    sentence(`Realism: ${joinNonEmpty([...R.skin, ...R.details])}`),
    R.environment.length ? sentence(`Environment details: ${joinNonEmpty(R.environment)}`) : "",
    R.capture.length ? sentence(`Capture: ${joinNonEmpty(R.capture)}`) : "",
    "Still image: no dialogue, no captions, no on-screen text.",
    sentence(`Avoid: ${CHARACTER_NEGATIVES.join(", ")}`),
    b.hasReferenceImage ? "Character consistency: identical face, skin tone, hair and body proportions as the reference image; only wardrobe, pose, setting and lighting may change." : "",
  ].filter(Boolean);

  const strip = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && v.length === 0)));
  const structuredAttributes: Record<string, unknown> = strip({
    schema: `mvf.character.v${STUDIO_SCHEMA_VERSION}`,
    medium: "still photo",
    aspect_ratio: en("aspect", b),
    use_reference_image: b.hasReferenceImage,
    subject: b.hasReferenceImage
      ? { preserve_from_reference: ["face", "age", "skin_tone", "hair", "body_proportions"], expression: en("expression", b) }
      : strip({ age: b.age, presentation: en("presentation", b), skin_tone: en("skinTone", b), features: clean(b.features), expression: en("expression", b) }),
    hair: b.hasReferenceImage ? undefined : strip({ length: en("hairLength", b), texture: en("hairTexture", b), style: en("hairStyle", b), color: en("hairColor", b) }),
    wardrobe: strip({ outfit: en("outfit", b), fabric, accessories: en("accessories", b), makeup: en("makeup", b) }),
    action: strip({ pose: en("pose", b), gesture: en("gesture", b), product_interaction: interaction, product_object: product }),
    scene: strip({ setting: en("setting", b), lighting: en("lighting", b), color: en("colorGrade", b) }),
    camera: strip({ device: en("camera", b), lens: en("lens", b), framing: en("framing", b), depth_of_field: en("depth", b) }),
    finish: en("finish", b),
    realism: strip({ level: b.realism, skin: R.skin, details: R.details, environment: R.environment, capture: R.capture }),
    negatives: CHARACTER_NEGATIVES,
  });

  const notes = [
    "Copie o prompt e gere a imagem no Google Flow. Depois, use essa imagem como referência ao animar.",
    "O JSON é só uma versão organizada dos mesmos atributos; o Flow pode não aceitar JSON diretamente.",
    "O resultado depende do Google Flow; revise a imagem antes de usar.",
  ];
  if (b.hasReferenceImage) notes.push("Anexe a sua imagem de referência no Google Flow. Use só imagens suas ou com autorização, nunca de outra pessoa sem consentimento.");

  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    visualPrompt: lines.join("\n"),
    structuredAttributes,
    language: "en",
    summaryPt: summaryPt(b),
    appearance: appearanceLine(b),
    notes,
  };
}

/* ------------------------------ Ficha e sorteio ------------------------------ */

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function makeCharacterSheet(b: CharacterBrief, out: CharacterPromptOutput): CharacterSheet {
  const name = clean(b.name) || "Personagem sem nome";
  return {
    id: `ficha-${hash(`${name}\n${out.visualPrompt}`)}`,
    schemaVersion: STUDIO_SCHEMA_VERSION,
    name,
    brief: b,
    visualPrompt: out.visualPrompt,
    summaryPt: out.summaryPt,
    appearance: out.appearance,
    hasReferenceImage: b.hasReferenceImage,
  };
}

/** “Surpreenda-me”: sugestões originais e editáveis a partir de uma semente. */
export function surpriseBrief(current: CharacterBrief, seed: number): CharacterBrief {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  const next = () => (s = (s * 48271) % 2147483647) / 2147483647;
  const out: CharacterBrief = { ...current };
  for (const k of CHOICE_KEYS) {
    if (k === "aspect" || k === "camera" || k === "lens") continue;
    if (current.hasReferenceImage && (IDENTITY_FIELDS as readonly string[]).includes(k)) continue;
    const list = P[k];
    (out[k] as Choice) = { preset: list[Math.floor(next() * list.length)].id };
  }
  if (!current.hasReferenceImage) out.age = 22 + Math.floor(next() * 24);
  return out;
}
