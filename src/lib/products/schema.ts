/**
 * Validação do catálogo de produtos. PURO (sem React, rede, relógio ou fs).
 * Erro = o arquivo não pode ser usado. Aviso = pendência de preenchimento.
 */
import {
  PRODUCT_SCHEMA_VERSION,
  type Affiliation,
  type Commission,
  type ContentTag,
  type Price,
  type Product,
  type ProductFormat,
  type ProductImage,
  type ProductsFile,
} from "./types.ts";

export const PRODUCT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CATEGORIES = ["skincare", "maquiagem", "cabelos", "corpo"] as const;
export const ORIGINS = ["oficial", "demonstrativo"] as const;
export const APPROVALS = ["rascunho", "em_revisao", "aprovado"] as const;
export const AVAILABILITIES = ["disponivel", "em_breve", "indisponivel", "a_confirmar"] as const;
export const AFFILIATION_STATUSES = ["disponivel", "nao_disponivel", "a_confirmar"] as const;
export const COMMISSION_TYPES = ["percentual", "valor_fixo"] as const;
export const FORMATS: ProductFormat[] = ["aparecendo", "avatar_ia", "maos_produto", "narracao_imagens"];
export const CONTENT_TAGS: ContentTag[] = ["rotina", "textura", "passo-a-passo", "unboxing", "antes-de-usar", "apresentacao", "sem-fala", "duvidas"];

// `text` = limite de descrição e modo de uso do Estúdio (RECORDING_LIMITS.text), para o produto chegar inteiro.
export const PRODUCT_LIMITS = { name: 60, brand: 40, short: 160, text: 600, item: 200, items: 12, images: 8 } as const;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

export const isHttpsUrl = (v: unknown): v is string => {
  if (typeof v !== "string" || v.length > 500) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
};

export interface ProductParse {
  product: Product | null;
  errors: string[];
  warnings: string[];
}

function str(o: Obj, key: string, max: number, path: string, errors: string[], required = false): string {
  const v = o[key];
  if (v === undefined || v === null) {
    if (required) errors.push(`${path}.${key}: obrigatório.`);
    return "";
  }
  if (typeof v !== "string") {
    errors.push(`${path}.${key}: deve ser texto.`);
    return "";
  }
  const t = v.trim();
  if (required && !t) errors.push(`${path}.${key}: obrigatório.`);
  if (t.length > max) errors.push(`${path}.${key}: até ${max} caracteres.`);
  return t;
}

function list(o: Obj, key: string, path: string, errors: string[], max: number = PRODUCT_LIMITS.items): string[] {
  const v = o[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    errors.push(`${path}.${key}: deve ser uma lista de textos.`);
    return [];
  }
  const items = (v as string[]).map((x) => x.trim()).filter(Boolean);
  if (items.length > max) errors.push(`${path}.${key}: no máximo ${max} itens.`);
  if (items.some((x) => x.length > PRODUCT_LIMITS.item)) errors.push(`${path}.${key}: cada item com até ${PRODUCT_LIMITS.item} caracteres.`);
  return items;
}

function image(v: unknown, path: string, errors: string[]): ProductImage | null {
  if (!isObj(v)) return (errors.push(`${path}: imagem inválida.`), null);
  const src = typeof v.src === "string" ? v.src : "";
  // Só arquivo local em /public — nada de URL externa, vídeo ou caminho relativo.
  if (!/^\/[a-z0-9][a-z0-9/_.-]*\.(png|jpe?g|webp|avif)$/i.test(src) || src.includes("..")) {
    errors.push(`${path}.src: use um caminho local de imagem em /public (ex.: /produtos/numi-1.jpg).`);
    return null;
  }
  const alt = typeof v.alt === "string" ? v.alt.trim() : "";
  if (!alt) errors.push(`${path}.alt: descreva a imagem (acessibilidade).`);
  if (!oneOf(["foto", "capa-oficial"] as const, v.kind)) errors.push(`${path}.kind: "foto" ou "capa-oficial".`);
  return { src, alt, kind: v.kind === "capa-oficial" ? "capa-oficial" : "foto" };
}

function price(v: unknown, path: string, errors: string[]): Price | null {
  if (v === undefined || v === null) return null;
  if (!isObj(v)) return (errors.push(`${path}: preço inválido.`), null);
  const ok = typeof v.amount === "number" && Number.isFinite(v.amount) && v.amount > 0 && v.currency === "BRL" && typeof v.verifiedAt === "string" && DATE.test(v.verifiedAt);
  if (!ok) return (errors.push(`${path}: preço exige amount > 0, currency "BRL" e verifiedAt (AAAA-MM-DD).`), null);
  return { amount: v.amount as number, currency: "BRL", verifiedAt: v.verifiedAt as string };
}

function commission(v: unknown, path: string, errors: string[]): Commission | null {
  if (v === undefined || v === null) return null;
  if (!isObj(v)) return (errors.push(`${path}: comissão inválida.`), null);
  const value = v.value;
  const source = typeof v.source === "string" ? v.source.trim() : "";
  const okType = oneOf(COMMISSION_TYPES, v.type);
  const okValue = typeof value === "number" && Number.isFinite(value) && value > 0 && (v.type !== "percentual" || value <= 100);
  const okDate = typeof v.verifiedAt === "string" && DATE.test(v.verifiedAt);
  if (!okType || !okValue || !source || !okDate) {
    errors.push(`${path}: comissão exige type (percentual|valor_fixo), value válido, source (fonte) e verifiedAt (AAAA-MM-DD).`);
    return null;
  }
  return { value: value as number, type: v.type as Commission["type"], source, verifiedAt: v.verifiedAt as string };
}

function affiliation(v: unknown, path: string, errors: string[]): Affiliation {
  const empty: Affiliation = { status: "a_confirmar", conditions: "", affiliateUrl: null };
  if (v === undefined || v === null) return empty;
  if (!isObj(v)) return (errors.push(`${path}: afiliação inválida.`), empty);
  if (!oneOf(AFFILIATION_STATUSES, v.status)) errors.push(`${path}.status: ${AFFILIATION_STATUSES.join(" | ")}.`);
  const conditions = str(v, "conditions", PRODUCT_LIMITS.text, path, errors);
  let url: string | null = null;
  if (v.affiliateUrl !== undefined && v.affiliateUrl !== null && v.affiliateUrl !== "") {
    if (isHttpsUrl(v.affiliateUrl)) url = v.affiliateUrl;
    else errors.push(`${path}.affiliateUrl: use um endereço https completo.`);
  }
  return { status: oneOf(AFFILIATION_STATUSES, v.status) ? v.status : "a_confirmar", conditions, affiliateUrl: url };
}

/** Valida UM produto (objeto vindo de JSON, planilha ou fixture). */
export function parseProduct(raw: unknown, path = "produto"): ProductParse {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(raw)) return { product: null, errors: [`${path}: deve ser um objeto.`], warnings };

  const id = typeof raw.id === "string" ? raw.id : "";
  if (!PRODUCT_ID.test(id) || id.length > 60) errors.push(`${path}.id: use letras minúsculas, números e hífens (ex.: numi-creme-3em1).`);
  const at = id ? `${path}(${id})` : path;
  const brand = str(raw, "brand", PRODUCT_LIMITS.brand, at, errors, true);
  const name = str(raw, "name", PRODUCT_LIMITS.name, at, errors, true);
  if (raw.category !== null && raw.category !== undefined && !oneOf(CATEGORIES, raw.category)) errors.push(`${at}.category: ${CATEGORIES.join(" | ")} ou null.`);
  if (!oneOf(ORIGINS, raw.origin)) errors.push(`${at}.origin: oficial | demonstrativo.`);
  if (!oneOf(APPROVALS, raw.approval)) errors.push(`${at}.approval: ${APPROVALS.join(" | ")}.`);
  if (!oneOf(AVAILABILITIES, raw.availability)) errors.push(`${at}.availability: ${AVAILABILITIES.join(" | ")}.`);
  if (raw.isNew !== undefined && typeof raw.isNew !== "boolean") errors.push(`${at}.isNew: true ou false.`);

  const imgsRaw = raw.images ?? [];
  const images: ProductImage[] = [];
  if (!Array.isArray(imgsRaw)) errors.push(`${at}.images: deve ser uma lista.`);
  else {
    if (imgsRaw.length > PRODUCT_LIMITS.images) errors.push(`${at}.images: no máximo ${PRODUCT_LIMITS.images}.`);
    imgsRaw.forEach((x, i) => {
      const img = image(x, `${at}.images[${i}]`, errors);
      if (img) images.push(img);
    });
  }

  const formats = list(raw, "formats", at, errors);
  const badFormat = formats.filter((f) => !FORMATS.includes(f as ProductFormat));
  if (badFormat.length) errors.push(`${at}.formats: valores desconhecidos (${badFormat.join(", ")}). Use ${FORMATS.join(" | ")}.`);
  const tags = list(raw, "contentTags", at, errors);
  const badTag = tags.filter((t) => !CONTENT_TAGS.includes(t as ContentTag));
  if (badTag.length) errors.push(`${at}.contentTags: valores desconhecidos (${badTag.join(", ")}).`);

  let productUrl: string | null = null;
  if (raw.productUrl !== undefined && raw.productUrl !== null && raw.productUrl !== "") {
    if (isHttpsUrl(raw.productUrl)) productUrl = raw.productUrl;
    else errors.push(`${at}.productUrl: use um endereço https completo.`);
  }

  const product: Product = {
    id,
    brand,
    name,
    category: oneOf(CATEGORIES, raw.category) ? raw.category : null,
    origin: oneOf(ORIGINS, raw.origin) ? raw.origin : "demonstrativo",
    approval: oneOf(APPROVALS, raw.approval) ? raw.approval : "rascunho",
    availability: oneOf(AVAILABILITIES, raw.availability) ? raw.availability : "a_confirmar",
    isNew: raw.isNew === true,
    images,
    shortDescription: str(raw, "shortDescription", PRODUCT_LIMITS.short, at, errors),
    description: str(raw, "description", PRODUCT_LIMITS.text, at, errors),
    howToUse: str(raw, "howToUse", PRODUCT_LIMITS.text, at, errors),
    characteristics: list(raw, "characteristics", at, errors),
    approvedBenefits: list(raw, "approvedBenefits", at, errors),
    restrictions: list(raw, "restrictions", at, errors),
    price: price(raw.price, `${at}.price`, errors),
    commission: commission(raw.commission, `${at}.commission`, errors),
    affiliation: affiliation(raw.affiliation, `${at}.affiliation`, errors),
    productUrl,
    materialIds: list(raw, "materialIds", at, errors),
    lessonIds: list(raw, "lessonIds", at, errors),
    contentTags: tags as ContentTag[],
    formats: formats as ProductFormat[],
    ...(Array.isArray(raw.review) ? { review: list(raw, "review", at, errors, 20) } : {}),
  };

  // Produto DEMONSTRATIVO nunca carrega dado comercial nem benefício (seria apresentá-lo como real).
  if (product.origin === "demonstrativo") {
    if (product.price) errors.push(`${at}: produto demonstrativo não pode ter preço.`);
    if (product.commission) errors.push(`${at}: produto demonstrativo não pode ter comissão.`);
    if (product.productUrl || product.affiliation.affiliateUrl) errors.push(`${at}: produto demonstrativo não pode ter link.`);
    if (product.affiliation.status !== "a_confirmar" || product.affiliation.conditions) errors.push(`${at}: produto demonstrativo não tem condição de afiliação.`);
    if (product.approvedBenefits.length) errors.push(`${at}: produto demonstrativo não tem benefícios aprovados.`);
    if (/numi/i.test(product.brand)) errors.push(`${at}: produto demonstrativo não pode usar a marca NUMI.`);
  }
  // Aprovação é pré-requisito para qualquer dado comercial publicado.
  if (product.origin === "oficial" && product.approval !== "aprovado") {
    if (product.price || product.commission || product.productUrl || product.affiliation.affiliateUrl) {
      warnings.push(`${at}: há dados comerciais, mas eles só aparecem depois de approval = "aprovado".`);
    }
  }
  if (product.origin === "oficial") {
    const missing = productGaps(product);
    if (missing.length) warnings.push(`${at}: falta preencher ${missing.join(", ")}.`);
  }
  return { product: errors.length ? null : product, errors, warnings };
}

/** O que falta para o cadastro oficial ficar completo (para a equipe). */
export function productGaps(p: Product): string[] {
  const out: string[] = [];
  if (!p.category) out.push("categoria");
  if (!p.images.some((i) => i.kind === "foto")) out.push("fotos do produto");
  if (!p.shortDescription) out.push("descrição curta");
  if (!p.description) out.push("descrição");
  if (!p.howToUse) out.push("modo de uso");
  if (!p.characteristics.length) out.push("características");
  if (!p.approvedBenefits.length) out.push("benefícios aprovados");
  if (!p.restrictions.length) out.push("restrições");
  if (!p.price) out.push("preço");
  if (!p.commission) out.push("comissão (com fonte e data)");
  if (p.affiliation.status === "a_confirmar") out.push("status de afiliação");
  if (!p.affiliation.conditions) out.push("condições de afiliação");
  if (!p.productUrl && !p.affiliation.affiliateUrl) out.push("link oficial");
  if (p.approval !== "aprovado") out.push("aprovação da equipe");
  return out;
}

export type ProductsFileParse =
  | { ok: true; file: ProductsFile; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

/** Valida o arquivo oficial inteiro (ou um arquivo enviado pela equipe). */
export function parseProductsFile(raw: unknown, opts: { requireOfficial?: boolean } = {}): ProductsFileParse {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["O arquivo deve ser um objeto JSON."], warnings };
  if (raw.version !== PRODUCT_SCHEMA_VERSION) errors.push(`version: esperado ${PRODUCT_SCHEMA_VERSION}.`);
  if (typeof raw.updatedAt !== "string" || !DATE.test(raw.updatedAt)) errors.push("updatedAt: data AAAA-MM-DD.");
  if (!Array.isArray(raw.products)) return { ok: false, errors: [...errors, "products: deve ser uma lista."], warnings };
  const products: Product[] = [];
  const seen = new Set<string>();
  raw.products.forEach((p, i) => {
    const r = parseProduct(p, `products[${i}]`);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (!r.product) return;
    if (seen.has(r.product.id)) errors.push(`products[${i}]: id repetido (${r.product.id}).`);
    seen.add(r.product.id);
    if (opts.requireOfficial && r.product.origin !== "oficial") errors.push(`products[${i}](${r.product.id}): o arquivo oficial só aceita origin "oficial".`);
    products.push(r.product);
  });
  if (errors.length) return { ok: false, errors, warnings };
  const review = Array.isArray(raw.review) ? raw.review.filter((x): x is string => typeof x === "string") : undefined;
  return { ok: true, file: { version: PRODUCT_SCHEMA_VERSION, updatedAt: raw.updatedAt as string, ...(review ? { review } : {}), products }, warnings };
}
