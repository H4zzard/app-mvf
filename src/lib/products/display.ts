/**
 * O que a interface PODE mostrar de cada produto. Puro e determinístico.
 *
 * Dado comercial (preço, comissão, afiliação, links) só é “confirmado” quando:
 * produto oficial + approval "aprovado" + o próprio dado validado (fonte/data).
 * Qualquer outra situação vira “A confirmar” — nunca um número fictício.
 */
import type { Availability, Product, ProductCategory, ProductFormat } from "./types.ts";

export const TO_CONFIRM = "A confirmar";

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  skincare: "Skincare",
  maquiagem: "Maquiagem",
  cabelos: "Cabelos",
  corpo: "Corpo e banho",
};
export const categoryLabel = (c: ProductCategory | null) => (c ? CATEGORY_LABEL[c] : "Categoria a confirmar");

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  disponivel: "Disponível",
  em_breve: "Em breve",
  indisponivel: "Indisponível",
  a_confirmar: "Disponibilidade a confirmar",
};

export const FORMAT_LABEL: Record<ProductFormat, string> = {
  aparecendo: "Aparecendo",
  avatar_ia: "Avatar IA",
  maos_produto: "Mãos e produto",
  narracao_imagens: "Narração e imagens",
};

/** Produto publicado oficialmente (os dados comerciais podem ser exibidos). */
export const isApprovedOfficial = (p: Product) => p.origin === "oficial" && p.approval === "aprovado";

/** Pode virar conteúdo agora? (indisponível não aparece em recomendações nem como “pronto”). */
export const isPromotable = (p: Product) => p.availability === "disponivel" || p.availability === "a_confirmar";

const brl = (n: number) =>
  `R$ ${n
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const date = (iso: string) => iso.split("-").reverse().join("/");

export interface CommercialField {
  label: string;
  confirmed: boolean;
  /** Ex.: “Conferido em 05/11/2026 · Fonte: …”. */
  detail?: string;
}

export interface CommercialInfo {
  price: CommercialField;
  commission: CommercialField;
  affiliation: CommercialField;
  /** Condições oficiais (só produto aprovado). */
  conditions: string;
  productUrl: string | null;
  affiliateUrl: string | null;
}

export function commercialInfo(p: Product): CommercialInfo {
  if (!isApprovedOfficial(p)) {
    return {
      price: { label: TO_CONFIRM, confirmed: false },
      commission: { label: TO_CONFIRM, confirmed: false },
      affiliation: { label: TO_CONFIRM, confirmed: false },
      conditions: "",
      productUrl: null,
      affiliateUrl: null,
    };
  }
  const c = p.commission;
  return {
    price: p.price ? { label: brl(p.price.amount), confirmed: true, detail: `Conferido em ${date(p.price.verifiedAt)}` } : { label: TO_CONFIRM, confirmed: false },
    commission: c
      ? { label: c.type === "percentual" ? `${String(c.value).replace(".", ",")}%` : brl(c.value), confirmed: true, detail: `Conferida em ${date(c.verifiedAt)} · Fonte: ${c.source}` }
      : { label: TO_CONFIRM, confirmed: false },
    affiliation:
      p.affiliation.status === "disponivel"
        ? { label: "Afiliação aberta", confirmed: true }
        : p.affiliation.status === "nao_disponivel"
          ? { label: "Afiliação fechada no momento", confirmed: true }
          : { label: TO_CONFIRM, confirmed: false },
    conditions: p.affiliation.conditions,
    productUrl: p.productUrl,
    affiliateUrl: p.affiliation.affiliateUrl,
  };
}

/** Benefícios exibíveis: só de produto oficial aprovado (nunca de rascunho ou demo). */
export const visibleBenefits = (p: Product) => (isApprovedOfficial(p) ? p.approvedBenefits : []);

/** Selo de origem para card e detalhe. */
export function originLabel(p: Product): { label: string; demo: boolean } {
  if (p.origin === "demonstrativo") return { label: "Produto demonstrativo", demo: true };
  if (p.approval !== "aprovado") return { label: "Oficial · cadastro em preenchimento", demo: false };
  return { label: `Oficial ${p.brand}`, demo: false };
}

/** Foto principal (ou null → fallback visual, nunca imagem inventada). */
export const coverOf = (p: Product) => p.images[0] ?? null;
