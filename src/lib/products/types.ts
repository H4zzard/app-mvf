/**
 * Contrato do catálogo de PRODUTOS (Marketplace + Estúdio IA).
 *
 * Fonte única: `src/content/produtos-oficiais.json` (oficial, preenchido pela
 * equipe) + `src/demo/products.ts` (demonstrativo). Acesso só pela API
 * `productCatalog` (`src/lib/products/index.ts`). Ver docs/MARKETPLACE.md.
 *
 * Regra de ouro: dado comercial (preço, comissão, afiliação, links) só aparece
 * quando o produto é OFICIAL, APROVADO e o dado tem fonte e data de verificação.
 * Fora disso a interface mostra “A confirmar”.
 */

export const PRODUCT_SCHEMA_VERSION = 1;

export type ProductCategory = "skincare" | "maquiagem" | "cabelos" | "corpo";
export type ProductOrigin = "oficial" | "demonstrativo";
/** rascunho/em_revisao: cadastro em preenchimento — nada comercial é exibido. */
export type ApprovalStatus = "rascunho" | "em_revisao" | "aprovado";
export type Availability = "disponivel" | "em_breve" | "indisponivel" | "a_confirmar";
export type AffiliationStatus = "disponivel" | "nao_disponivel" | "a_confirmar";
export type CommissionType = "percentual" | "valor_fixo";
/** Formatos de vídeo (mesmos valores do onboarding + gravação aparecendo). */
export type ProductFormat = "aparecendo" | "avatar_ia" | "maos_produto" | "narracao_imagens";
export type ContentTag = "rotina" | "textura" | "passo-a-passo" | "unboxing" | "antes-de-usar" | "apresentacao" | "sem-fala" | "duvidas";

export interface ProductImage {
  /** Caminho LOCAL em /public (nunca URL externa). */
  src: string;
  alt: string;
  /** "capa-oficial" = arte oficial da área de membros (não é foto de catálogo). */
  kind: "foto" | "capa-oficial";
}

export interface Price {
  amount: number;
  currency: "BRL";
  /** AAAA-MM-DD. */
  verifiedAt: string;
}

export interface Commission {
  value: number;
  type: CommissionType;
  /** De onde veio o número (ex.: “Painel TikTok Shop da NUMI, conferido pela equipe”). */
  source: string;
  /** AAAA-MM-DD. */
  verifiedAt: string;
}

export interface Affiliation {
  status: AffiliationStatus;
  /** Condições OFICIAIS, como a equipe escreveu. Vazio = não informado. */
  conditions: string;
  /** https. Só exibido com produto aprovado. */
  affiliateUrl: string | null;
}

export interface Product {
  /** Estável: nunca renomear (favoritos e listas dependem dele). */
  id: string;
  brand: string;
  name: string;
  /** null = categoria ainda não informada. */
  category: ProductCategory | null;
  origin: ProductOrigin;
  approval: ApprovalStatus;
  availability: Availability;
  isNew: boolean;
  images: ProductImage[];
  shortDescription: string;
  description: string;
  howToUse: string;
  characteristics: string[];
  /** Benefícios APROVADOS pela marca. Nunca preencher por conta própria. */
  approvedBenefits: string[];
  /** Restrições, cuidados e o que NÃO pode ser dito. */
  restrictions: string[];
  price: Price | null;
  commission: Commission | null;
  affiliation: Affiliation;
  /** https. Só exibido com produto aprovado. */
  productUrl: string | null;
  /** IDs da Central de Materiais. */
  materialIds: string[];
  /** IDs de aulas do catálogo. */
  lessonIds: string[];
  contentTags: ContentTag[];
  formats: ProductFormat[];
  /** Notas internas de revisão (não exibidas para a aluna). */
  review?: string[];
}

export interface ProductsFile {
  version: number;
  updatedAt: string;
  review?: string[];
  products: Product[];
}
