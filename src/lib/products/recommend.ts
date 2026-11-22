/**
 * Recomendações a partir das respostas do onboarding. Puro e determinístico.
 *
 * Nunca usa preço, comissão ou promessa de venda: só formato de conteúdo,
 * nível de experiência, acesso ao produto NUMI e completude das informações.
 */
import type { OnboardingProfile } from "@/types";
import type { Product, ProductFormat } from "./types.ts";
import { isPromotable } from "./display.ts";

export interface Recommendation {
  product: Product;
  reasons: string[];
  /** Ideia de conteúdo coerente com o perfil (sem promessa). */
  idea: string;
}

type Profile = Pick<OnboardingProfile, "wantsToAppear" | "formats" | "experience" | "numiAccess">;

/** Quanto do cadastro está preenchido (0–5): ajuda a iniciante a começar pelo mais completo. */
export function infoScore(p: Product): number {
  return Number(Boolean(p.description)) + Number(Boolean(p.howToUse)) + Number(p.characteristics.length > 0) + Number(p.materialIds.length > 0) + Number(p.restrictions.length > 0);
}

const NO_FACE: ProductFormat[] = ["maos_produto", "avatar_ia", "narracao_imagens"];

export function recommendProducts(products: Product[], profile: Profile | null, limit = 4): Recommendation[] {
  if (!profile) return [];
  const chosen = profile.formats.flatMap((f) => (NO_FACE as string[]).includes(f) ? [f as ProductFormat] : []);
  const preferred: ProductFormat[] = profile.wantsToAppear === "sim" ? ["aparecendo"] : chosen.length ? chosen : NO_FACE;
  const beginner = profile.experience === "nunca_vendi" || profile.experience === "tentando_comecar";

  const scored = products
    .filter(isPromotable)
    .map((p, i) => {
      const reasons: string[] = [];
      let score = 0;
      const formatHit = p.formats.filter((f) => preferred.includes(f));
      if (formatHit.length) {
        score += 3;
        if (profile.wantsToAppear === "sim") reasons.push("Combina com vídeos aparecendo, na rotina");
        else reasons.push(`Dá para mostrar sem aparecer (${formatHit.includes("maos_produto") ? "mãos e produto" : formatHit.includes("avatar_ia") ? "avatar" : "narração"})`);
      }
      if (profile.wantsToAppear === "sim" && p.contentTags.some((t) => t === "rotina" || t === "apresentacao")) score += 1;
      if (profile.wantsToAppear !== "sim" && p.contentTags.some((t) => t === "textura" || t === "sem-fala")) score += 1;
      if (beginner) {
        const info = infoScore(p);
        score += info;
        if (info >= 3) reasons.push("Tem mais informações para você começar");
      }
      const numiHit = profile.numiAccess === "sim" && p.origin === "oficial" && /^numi$/i.test(p.brand);
      if (numiHit) {
        // Quem já tem o produto NUMI começa por ele.
        score += 20;
        reasons.unshift("Você indicou que tem acesso ao produto NUMI");
      }
      // Só entra o que combina com o jeito de gravar da aluna (ou o NUMI que ela já tem).
      return { p, i, score, reasons, eligible: formatHit.length > 0 || numiHit };
    })
    .filter((x) => x.eligible && x.reasons.length > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit);

  return scored.map(({ p, reasons }) => ({ product: p, reasons, idea: ideaFor(p, profile) }));
}

function ideaFor(p: Product, profile: Profile): string {
  if (profile.wantsToAppear === "sim") return p.contentTags.includes("passo-a-passo") ? "Mostre o passo a passo aparecendo" : "Apresente o produto dentro da sua rotina";
  if (p.formats.includes("maos_produto")) return p.contentTags.includes("textura") ? "Close de textura só com as mãos" : "Demonstração com as mãos, sem rosto";
  if (p.formats.includes("avatar_ia")) return "Avatar apresenta o produto";
  return "Narração sobre imagens do produto";
}
