/**
 * Catálogo de produtos usado pelo app: arquivo OFICIAL validado + produtos
 * DEMONSTRATIVOS. Ponto único de acesso para o Marketplace e o Estúdio IA
 * (o painel admin/banco substituirá a origem dos dados, mantendo esta API).
 *
 * Arquivo oficial inválido → build e testes falham (não sobe catálogo errado).
 */
import raw from "../../content/produtos-oficiais.json" with { type: "json" };
import { DEMO_PRODUCTS } from "../../demo/products.ts";
import { parseProduct, parseProductsFile } from "./schema.ts";
import type { Product } from "./types.ts";

const parsed = parseProductsFile(raw, { requireOfficial: true });
if (!parsed.ok) {
  throw new Error(`Catálogo de produtos inválido (src/content/produtos-oficiais.json):\n- ${parsed.errors.join("\n- ")}`);
}
for (const p of DEMO_PRODUCTS) {
  const r = parseProduct(p, `demo(${p.id})`);
  if (!r.product || p.origin !== "demonstrativo") throw new Error(`Produto demonstrativo inválido:\n- ${[...r.errors, p.origin !== "demonstrativo" ? "origin deve ser demonstrativo" : ""].filter(Boolean).join("\n- ")}`);
}

/** Enquanto não houver produtos oficiais completos, os demonstrativos permitem treinar o fluxo. */
export const INCLUDE_DEMO_PRODUCTS = true;

export function createProductCatalog(official: Product[], demo: Product[] | null) {
  const officialIds = new Set(official.map((p) => p.id));
  // Oficiais primeiro; um demonstrativo nunca substitui um oficial com o mesmo id.
  const all = [...official, ...(demo ?? []).filter((p) => !officialIds.has(p.id))];
  const byId = new Map(all.map((p) => [p.id, p]));
  return {
    all: () => all,
    get: (id: string) => byId.get(id),
    official: () => all.filter((p) => p.origin === "oficial"),
    demo: () => all.filter((p) => p.origin === "demonstrativo"),
    /** Produtos da marca NUMI (oficiais). */
    numi: () => all.filter((p) => p.origin === "oficial" && /^numi$/i.test(p.brand)),
    news: () => all.filter((p) => p.isNew),
    /** Categorias que têm ao menos um produto (para os filtros). */
    categories: () => [...new Set(all.map((p) => p.category).filter((c): c is NonNullable<Product["category"]> => c !== null))],
  };
}

export type ProductCatalog = ReturnType<typeof createProductCatalog>;

export const officialProductsFile = parsed.file;
export const productCatalog = createProductCatalog(parsed.file.products, INCLUDE_DEMO_PRODUCTS ? DEMO_PRODUCTS : null);
