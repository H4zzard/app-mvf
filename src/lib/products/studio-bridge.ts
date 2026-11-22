/**
 * Ponte Marketplace → Estúdio IA. Puro.
 *
 * Leva para o Estúdio SÓ o que está cadastrado, sem reescrever e sem cortar frases:
 * - Roteiros: nome, categoria, descrição (+ características), modo de uso,
 *   benefícios APROVADOS (só produto oficial aprovado) e restrições.
 * - Animador: nome e características (aparência física do produto no vídeo).
 * Nunca leva preço, comissão, link ou condição de afiliação.
 */
import type { Product } from "./types.ts";
import { categoryLabel, visibleBenefits } from "./display.ts";

/** Mesmos limites do Estúdio (RECORDING_LIMITS / ANIMATION_LIMITS). */
export const STUDIO_FIELD_LIMITS = { name: 60, text: 600, short: 400, animationDetails: 300 } as const;

export interface StudioProductSeed {
  id: string;
  origin: Product["origin"];
  name: string;
  category: string;
  description: string;
  howToUse: string;
  benefits: string;
  limitations: string;
  /** Para o Animador (texto curto, só características). */
  details: string;
  /** Itens que não couberam no limite do Estúdio (nada é cortado no meio). */
  omitted: number;
}

const dot = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

/** Junta itens inteiros enquanto couberem em `max`. */
export function fitItems(items: string[], sep: string, max: number, prefix = ""): { text: string; omitted: number } {
  let text = "";
  let used = 0;
  for (const item of items) {
    const next = text ? `${text}${sep}${item}` : `${prefix}${item}`;
    if (next.length > max) break;
    text = next;
    used++;
  }
  return { text, omitted: items.length - used };
}

export function studioProductSeed(p: Product): StudioProductSeed {
  const base = p.description || p.shortDescription;
  const room = STUDIO_FIELD_LIMITS.text - base.length - (base ? 1 : 0);
  const chars = room > 20 ? fitItems(p.characteristics.map((c) => c.replace(/[.;]+$/, "")), "; ", room - 1, "Características: ") : { text: "", omitted: p.characteristics.length };
  const description = [base, chars.text ? dot(chars.text) : ""].filter(Boolean).join("\n");
  const benefits = fitItems(visibleBenefits(p).map(dot), " ", STUDIO_FIELD_LIMITS.short);
  const limitations = fitItems(p.restrictions.map(dot), " ", STUDIO_FIELD_LIMITS.short);
  const details = fitItems(p.characteristics.map((c) => c.replace(/[.;]+$/, "")), "; ", STUDIO_FIELD_LIMITS.animationDetails);
  return {
    id: p.id,
    origin: p.origin,
    name: p.name.slice(0, STUDIO_FIELD_LIMITS.name),
    category: p.category ? categoryLabel(p.category) : "",
    description,
    howToUse: p.howToUse,
    benefits: benefits.text,
    limitations: limitations.text,
    details: details.text,
    omitted: chars.omitted + benefits.omitted + limitations.omitted,
  };
}

/** Campos do briefing de Roteiros que vêm do produto (substituem só estes). */
export function recordingFieldsFrom(seed: StudioProductSeed) {
  return {
    productName: seed.name,
    category: seed.category,
    description: seed.description,
    howToUse: seed.howToUse,
    benefits: seed.benefits,
    limitations: seed.limitations,
    // Diferencial é afirmação comparativa: só a aluna escreve.
    differential: "",
  };
}

/** Campos do Animador que vêm do produto. NÃO toca na ficha nem na fala. */
export function animationFieldsFrom(seed: StudioProductSeed) {
  return { productName: seed.name, productDetails: seed.details };
}

/**
 * A fala atual cita o produto? Se não citar, o Animador AVISA — mas nunca
 * reescreve a fala sozinho (só a aluna altera, com o texto à vista).
 */
export function dialogueMentions(dialogue: string, productName: string): boolean {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  const name = norm(productName).trim();
  return !name || norm(dialogue).includes(name);
}

/** Campos obrigatórios dos Roteiros que o cadastro não trouxe (a aluna completa). */
export function missingForRecording(seed: StudioProductSeed): string[] {
  const out: string[] = [];
  if (seed.description.trim().length < 15) out.push("descrição");
  if (seed.howToUse.trim().length < 10) out.push("modo de uso");
  return out;
}
