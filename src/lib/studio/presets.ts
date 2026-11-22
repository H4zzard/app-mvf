/**
 * Presets ORIGINAIS MVF para os geradores do Estúdio IA.
 *
 * Cada opção tem rótulo em português (interface) e o trecho em inglês que entra
 * no prompt. Toda lista aceita também “✎ LIVRE” (`preset: "livre"`).
 * Os valores iniciais miram o nicho feminino com produtos físicos, sem limitar
 * outros nichos. Módulo puro.
 */
import type { Choice } from "./contracts.ts";

export interface PresetOption {
  id: string;
  label: string;
  en: string;
}

export const FREE = "livre";

const o = (id: string, label: string, en: string): PresetOption => ({ id, label, en });

/* ------------------------------- Personagem ------------------------------- */

export const CHARACTER_PRESETS = {
  presentation: [o("mulher", "Mulher", "woman"), o("homem", "Homem", "man")],
  skinTone: [
    o("clara", "Clara", "fair skin"),
    o("media", "Média", "medium skin with warm undertone"),
    o("oliva", "Oliva", "olive skin"),
    o("morena", "Morena", "tan light-brown skin"),
    o("marrom", "Marrom", "brown skin"),
    o("retinta", "Retinta", "deep brown skin"),
  ],
  expression: [
    o("sorriso-leve", "Sorriso leve e natural", "a light, natural smile"),
    o("confiante", "Olhar confiante", "a confident, friendly look at the camera"),
    o("curiosa", "Expressão curiosa", "a curious, interested expression"),
    o("concentrada", "Concentrada no produto", "focused on the product in hand"),
    o("risada", "Risada espontânea", "a spontaneous laugh"),
    o("serena", "Serena", "a calm, serene expression"),
  ],
  hairLength: [o("curto", "Curto", "short"), o("medio", "Médio (ombros)", "shoulder-length"), o("longo", "Longo", "long")],
  hairTexture: [o("liso", "Liso", "straight"), o("ondulado", "Ondulado", "wavy"), o("cacheado", "Cacheado", "curly"), o("crespo", "Crespo", "coily")],
  hairStyle: [
    o("solto", "Solto", "worn loose"),
    o("rabo", "Rabo de cavalo", "in a ponytail"),
    o("coque-baixo", "Coque baixo", "in a low bun"),
    o("coque-despojado", "Coque despojado", "in a relaxed messy bun"),
    o("tranca", "Trança", "in a braid"),
    o("presilha", "Preso com presilha", "half up with a hair clip"),
  ],
  hairColor: [
    o("preto", "Preto", "black"),
    o("castanho-escuro", "Castanho escuro", "dark brown"),
    o("castanho-claro", "Castanho claro", "light brown"),
    o("mel", "Loiro mel", "honey blonde"),
    o("loiro-claro", "Loiro claro", "light blonde"),
    o("ruivo", "Ruivo", "auburn red"),
    o("grisalho", "Grisalho", "natural gray"),
  ],
  outfit: [
    o("basico", "Básico confortável", "a plain comfortable t-shirt"),
    o("camisa", "Casual arrumado", "a neat casual button-up shirt"),
    o("robe", "Roupão de banho", "a soft bathrobe"),
    o("trico", "Blusa de tricô", "a light knit sweater"),
    o("blazer", "Blazer leve", "a light blazer over a simple top"),
    o("esportiva", "Regata esportiva", "an athletic tank top"),
    o("vestido", "Vestido simples", "a simple everyday dress"),
  ],
  fabric: [
    o("algodao", "Algodão", "cotton"),
    o("linho", "Linho", "linen"),
    o("trico", "Tricô", "knit"),
    o("malha", "Malha", "jersey"),
    o("cetim", "Cetim", "satin"),
  ],
  accessories: [
    o("nenhum", "Nenhum", "no accessories"),
    o("brincos", "Brincos pequenos", "small stud earrings"),
    o("argolas", "Argolas douradas", "thin gold hoop earrings"),
    o("colar", "Colar fino", "a thin delicate necklace"),
    o("relogio", "Relógio", "a simple wristwatch"),
    o("oculos", "Óculos de grau", "thin-framed glasses"),
    o("presilha", "Presilha de cabelo", "a hair claw clip"),
  ],
  makeup: [
    o("sem", "Sem maquiagem aparente", "no visible makeup"),
    o("leve", "Leve e natural", "light natural makeup"),
    o("glow", "Pele iluminada", "dewy glowing makeup"),
    o("marcante", "Marcante", "bold makeup with defined eyes"),
  ],
  pose: [
    o("segurando-rosto", "Segurando o produto perto do rosto", "holding the product near the face"),
    o("penteadeira", "Sentada à penteadeira", "sitting at a vanity table"),
    o("espelho", "Em pé diante do espelho", "standing in front of a mirror"),
    o("bancada", "Apoiada na bancada", "leaning on a counter"),
    o("selfie", "Falando para a câmera (selfie)", "talking to the camera, selfie-style"),
    o("palma", "Mostrando o produto na palma da mão", "showing the product in an open palm"),
    o("aplicando", "Aplicando o produto", "applying the product"),
  ],
  gesture: [
    o("relaxadas", "Mãos relaxadas", "hands relaxed and natural"),
    o("aponta", "Aponta para o produto", "pointing at the product"),
    o("gesticula", "Gesticula enquanto fala", "gesturing naturally while talking"),
    o("toca-rosto", "Toca o rosto de leve", "lightly touching the face"),
  ],
  productInteraction: [
    o("sem", "Sem produto em cena", "no product in the scene"),
    o("segura", "Segura a embalagem", "holding the product packaging"),
    o("lateral", "Mostra a embalagem de lado", "showing the packaging at an angle"),
    o("aplica", "Aplica o produto", "applying the product"),
    o("abre", "Abre a embalagem", "opening the packaging"),
  ],
  setting: [
    o("banheiro", "Banheiro claro", "a bright bathroom with a white counter and mirror"),
    o("penteadeira", "Penteadeira", "a tidy vanity corner"),
    o("quarto", "Quarto aconchegante", "a cozy bedroom"),
    o("cozinha", "Cozinha", "a lived-in home kitchen"),
    o("sala", "Sala de estar", "a simple living room"),
    o("loja", "Loja", "a small retail store"),
    o("escritorio", "Home office", "a home office desk"),
    o("externo", "Área externa", "an outdoor balcony with plants"),
  ],
  lighting: [
    o("janela", "Luz natural de janela", "soft natural window light"),
    o("nublado", "Dia nublado, luz suave", "soft overcast daylight with gentle shadows"),
    o("interna", "Luz interna quente", "warm indoor lamp light"),
    o("ring", "Ring light suave", "soft ring light, creator-style"),
    o("golden", "Fim de tarde (golden hour)", "warm golden-hour sunlight"),
    o("editorial", "Editorial suave", "soft diffused editorial lighting"),
  ],
  camera: [
    o("celular", "Celular (UGC)", "a smartphone camera"),
    o("celular-frontal", "Câmera frontal do celular", "a smartphone front camera"),
    o("mirrorless", "Câmera fotográfica", "a mirrorless photo camera"),
  ],
  lens: [
    o("24", "Grande-angular de celular", "a wide smartphone lens (about 24mm equivalent)"),
    o("35", "35 mm", "a 35mm lens"),
    o("50", "50 mm", "a 50mm lens"),
    o("85", "85 mm (retrato)", "an 85mm portrait lens"),
  ],
  framing: [
    o("rosto", "Close no rosto", "a close-up on the face"),
    o("peito", "Meio corpo (peito para cima)", "a medium close-up, chest up"),
    o("cintura", "Plano médio (cintura)", "a medium shot, waist up"),
    o("inteiro", "Corpo inteiro", "a full-body shot"),
    o("maos", "Mãos e produto", "a close-up of the hands and product"),
  ],
  aspect: [o("9x16", "Vertical 9:16", "vertical 9:16"), o("4x5", "Vertical 4:5", "vertical 4:5"), o("1x1", "Quadrado 1:1", "square 1:1")],
  depth: [
    o("natural", "Natural, fundo legível", "natural depth of field with a readable background"),
    o("suave", "Fundo levemente desfocado", "a softly blurred background"),
  ],
  finish: [
    o("ugc", "Foto espontânea (UGC)", "candid UGC photo"),
    o("documental", "Documental", "documentary-style photo"),
    o("lifestyle", "Lifestyle", "lifestyle photo"),
    o("editorial", "Editorial limpo", "clean editorial photo"),
    o("cinema", "Cinematográfico suave", "soft cinematic still"),
  ],
  colorGrade: [
    o("neutra", "Neutra e natural", "neutral, true-to-life colors"),
    o("quente", "Quente suave", "soft warm tones"),
    o("fria", "Fria e limpa", "clean cool tones"),
    o("pastel", "Pastel", "soft pastel palette"),
  ],
} satisfies Record<string, PresetOption[]>;

export type CharacterPresetKey = keyof typeof CHARACTER_PRESETS;

/* -------------------------------- Animação -------------------------------- */

export const ANIMATION_PRESETS = {
  bodyMovement: [
    o("natural", "Fala com naturalidade", "speaks naturally with small, relaxed body movements"),
    o("inclina", "Inclina-se para a câmera", "leans slightly toward the camera"),
    o("mostra-produto", "Mostra o produto para a câmera", "brings the product closer to the camera"),
    o("caminha", "Dá um passo para a frente", "takes one small step toward the camera"),
  ],
  hands: [
    o("abertas", "Mãos abertas, gestos leves", "open hands with light gestures"),
    o("segura", "Segura o produto", "holds the product steadily"),
    o("aponta", "Aponta para o produto", "points at the product"),
    o("aplica", "Aplica o produto", "applies the product with natural hand movements"),
  ],
  expression: [
    o("simpatica", "Simpática", "friendly and warm"),
    o("animada", "Animada", "excited and lively"),
    o("calma", "Calma e confiante", "calm and confident"),
    o("surpresa", "Surpresa leve", "lightly surprised"),
  ],
  gaze: [
    o("camera", "Olha para a câmera", "looks directly into the camera"),
    o("produto", "Alterna entre câmera e produto", "alternates the gaze between the camera and the product"),
    o("espelho", "Olha para o espelho", "looks at the mirror"),
  ],
  productAction: [
    o("nenhuma", "Sem interação", "no product interaction"),
    o("mostra", "Mostra a embalagem", "shows the packaging to the camera"),
    o("abre", "Abre a embalagem", "opens the packaging"),
    o("aplica", "Aplica uma pequena quantidade", "applies a small amount"),
  ],
  camera: [
    o("estatica", "Estática", "static camera, fixed framing, no zoom, no pan, no cuts"),
    o("pushin", "Push-in lento", "very slow continuous push-in, no cuts"),
    o("zoom", "Zoom suave", "a single very slow, smooth zoom-in, no cuts"),
    o("handheld", "Handheld realista", "subtle realistic handheld movement, no zoom, no cuts"),
  ],
  atmosphere: [
    o("acolhedora", "Acolhedora", "warm and welcoming"),
    o("leve", "Leve e alegre", "light and cheerful"),
    o("intima", "Íntima, de conversa", "intimate, like a chat with a friend"),
    o("sofisticada", "Sofisticada", "calm and sophisticated"),
  ],
  setting: [
    o("da-imagem", "Mesmo cenário da imagem", "the same environment shown in the reference image"),
    ...CHARACTER_PRESETS.setting,
  ],
  style: [
    o("ugc", "UGC de celular", "realistic smartphone UGC look"),
    o("lifestyle", "Lifestyle", "natural lifestyle look"),
    o("cinema", "Cinematográfico", "soft cinematic look"),
  ],
  light: [
    o("da-imagem", "Mesma luz da imagem", "the same lighting as the reference image"),
    ...CHARACTER_PRESETS.lighting,
  ],
  voiceTone: [
    o("acolhedor", "Acolhedor", "warm and welcoming"),
    o("animado", "Animado", "upbeat and energetic"),
    o("calmo", "Calmo e confiante", "calm and confident"),
    o("didatico", "Didático", "clear and explanatory"),
    o("direto", "Direto", "direct and matter-of-fact"),
  ],
  voiceAccent: [
    o("ptbr", "Português do Brasil, neutro", "Brazilian Portuguese with a neutral accent"),
    o("en-us", "Inglês americano, neutro", "English with a neutral American accent"),
  ],
  voiceTimbre: [
    o("medio", "Médio e suave", "mid-range, soft timbre"),
    o("grave", "Mais grave e aveludado", "lower, velvety timbre"),
    o("leve", "Leve e brilhante", "light, bright timbre"),
  ],
} satisfies Record<string, PresetOption[]>;

export type AnimationPresetKey = keyof typeof ANIMATION_PRESETS;

/* ---------------------------- Roteiros (aparecer) ---------------------------- */

/** Aqui `en` guarda a locução em português com a preposição certa (“no banheiro”). */
export const RECORDING_LOCATIONS: PresetOption[] = [
  o("banheiro", "Banheiro", "no banheiro"),
  o("quarto", "Quarto", "no quarto"),
  o("cozinha", "Cozinha", "na cozinha"),
  o("mesa", "Mesa", "na mesa"),
  o("espelho", "Frente ao espelho", "em frente ao espelho"),
];

/* --------------------------------- Helpers --------------------------------- */

export function findPreset(list: readonly PresetOption[], id: string): PresetOption | undefined {
  return list.find((x) => x.id === id);
}

/** Texto em inglês para o prompt (ou o texto livre). Vazio se não houver. */
export function choiceEn(list: readonly PresetOption[], c: Choice): string {
  if (c.preset === FREE) return clean(c.free ?? "");
  return findPreset(list, c.preset)?.en ?? "";
}

/** Rótulo em português (ou o texto livre). */
export function choiceLabel(list: readonly PresetOption[], c: Choice): string {
  if (c.preset === FREE) return clean(c.free ?? "");
  return findPreset(list, c.preset)?.label ?? "";
}

/** A escolha é válida: preset existente, ou livre com texto. */
export function isChoiceValid(list: readonly PresetOption[], c: Choice): boolean {
  if (c.preset === FREE) return clean(c.free ?? "").length > 0 && clean(c.free ?? "").length <= 200;
  return !!findPreset(list, c.preset);
}

export function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export const pick = (id: string): Choice => ({ preset: id });
