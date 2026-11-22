/**
 * Edição de PRODUTOS no painel demonstrativo. Módulo PURO.
 *
 * Reaproveita integralmente o catálogo do Prompt 11: `parseProduct` (validação),
 * `productGaps` (o que falta), `parseProductsFile` (arquivo oficial) e as colunas
 * `PRODUCT_CSV_COLUMNS` (importável por `npm run products -- import`).
 *
 * Regras: só produtos OFICIAIS são editados (demonstrativos ficam só para consulta);
 * “aprovado” exige o cadastro completo — o Creme 3 em 1 não vira aprovado só por ter
 * capa oficial; produto incompleto continua rascunho.
 */
import { parseProduct, parseProductsFile, productGaps } from "../products/schema.ts";
import { PRODUCT_CSV_COLUMNS } from "../products/import.ts";
import type { ApprovalStatus, Product, ProductsFile } from "../products/types.ts";
import { isExportable, type EditorialStatus } from "../content/editorial.ts";
import { toCsv } from "./diff.ts";
import { slug } from "./catalog-edit.ts";

export function newProductId(name: string, taken: Set<string>): string {
  const base = `numi-${slug(name) || "novo-produto"}`;
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

export function blankProduct(id: string): Product {
  return {
    id,
    brand: "NUMI",
    name: "",
    category: null,
    origin: "oficial",
    approval: "rascunho",
    availability: "a_confirmar",
    isNew: false,
    images: [],
    shortDescription: "",
    description: "",
    howToUse: "",
    characteristics: [],
    approvedBenefits: [],
    restrictions: [],
    price: null,
    commission: null,
    affiliation: { status: "a_confirmar", conditions: "", affiliateUrl: null },
    productUrl: null,
    materialIds: [],
    lessonIds: [],
    contentTags: [],
    formats: [],
  };
}

/** Status editorial → `approval` gravado no arquivo. */
export function approvalFor(status: EditorialStatus): ApprovalStatus {
  if (isExportable(status)) return "aprovado";
  return status === "em_revisao" ? "em_revisao" : "rascunho";
}

/** `approval` do arquivo → status editorial inicial no painel. */
export function statusFromApproval(a: ApprovalStatus): EditorialStatus {
  return a === "aprovado" ? "aprovado" : a === "em_revisao" ? "em_revisao" : "rascunho";
}

export interface ProductCheck {
  errors: string[];
  missing: string[];
  warnings: string[];
}

export function checkProduct(p: Product, opts: { imageExists?: (src: string) => boolean } = {}): ProductCheck {
  if (p.origin !== "oficial") return { errors: ["Produtos demonstrativos não são editados no painel (só consulta)."], missing: [], warnings: [] };
  // Valida como RASCUNHO: dado comercial em rascunho é permitido (fica oculto até aprovar).
  const r = parseProduct({ ...p, approval: "rascunho" });
  const errors = r.errors.map((e) => e.replace(/^produto(\([^)]*\))?[.:]?\s*/, ""));
  if (opts.imageExists) for (const img of p.images) if (!opts.imageExists(img.src)) errors.push(`Imagem não encontrada em /public: ${img.src}`);
  // “aprovação da equipe” é o próprio passo editorial, não um campo.
  const missing = productGaps(p).filter((g) => g !== "aprovação da equipe");
  const warnings = r.warnings.filter((w) => !/falta preencher|só aparecem depois/.test(w));
  return { errors, missing, warnings };
}

export interface ProductDraftEntry {
  product: Product;
  status: EditorialStatus;
}

export interface ProductsExport {
  ok: boolean;
  errors: string[];
  file: ProductsFile | null;
}

/**
 * Arquivo oficial candidato: base + rascunhos não arquivados (com `approval`
 * derivado do status). Validado por `parseProductsFile` (só oficiais).
 */
export function buildProductsExport(base: ProductsFile, drafts: ProductDraftEntry[], updatedAt: string): ProductsExport {
  const byId = new Map(base.products.map((p) => [p.id, p]));
  for (const d of drafts) {
    if (d.status === "arquivado") continue; // arquivado não muda o arquivo
    byId.set(d.product.id, { ...d.product, approval: approvalFor(d.status) });
  }
  const candidate = { ...base, updatedAt, products: [...byId.values()] };
  const r = parseProductsFile(candidate, { requireOfficial: true });
  return r.ok ? { ok: true, errors: [], file: r.file } : { ok: false, errors: r.errors, file: null };
}

const listCell = (xs: string[]) => xs.join(";");

/** Planilha compatível com `npm run products -- import produtos.csv`. */
export function productsToCsv(products: Product[]): string {
  type Col = (typeof PRODUCT_CSV_COLUMNS)[number];
  const rows = products.map((p) => {
    const r: Record<Col, string> = {
      id: p.id,
      marca: p.brand,
      nome: p.name,
      categoria: p.category ?? "",
      origem: p.origin,
      aprovacao: p.approval,
      disponibilidade: p.availability,
      novidade: p.isNew ? "sim" : "nao",
      descricao_curta: p.shortDescription,
      descricao: p.description,
      modo_de_uso: p.howToUse,
      caracteristicas: listCell(p.characteristics),
      beneficios_aprovados: listCell(p.approvedBenefits),
      restricoes: listCell(p.restrictions),
      preco: p.price ? String(p.price.amount).replace(".", ",") : "",
      preco_verificado_em: p.price?.verifiedAt ?? "",
      comissao_valor: p.commission ? String(p.commission.value).replace(".", ",") : "",
      comissao_tipo: p.commission?.type ?? "",
      comissao_fonte: p.commission?.source ?? "",
      comissao_verificada_em: p.commission?.verifiedAt ?? "",
      afiliacao_status: p.affiliation.status,
      afiliacao_condicoes: p.affiliation.conditions,
      link_afiliacao: p.affiliation.affiliateUrl ?? "",
      link_produto: p.productUrl ?? "",
      imagens: p.images.map((i) => `${i.src}|${i.alt}${i.kind === "capa-oficial" ? "|capa-oficial" : ""}`).join(";"),
      materiais: listCell(p.materialIds),
      aulas: listCell(p.lessonIds),
      tags: listCell(p.contentTags),
      formatos: listCell(p.formats),
    };
    return r;
  });
  return toCsv([...PRODUCT_CSV_COLUMNS], rows);
}
