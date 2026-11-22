/**
 * Busca e filtros do Marketplace. Puro. Nunca ordena nem filtra por preço ou
 * comissão (o Marketplace não é um ranking de ganhos).
 */
import type { Availability, Product, ProductCategory, ProductOrigin } from "./types.ts";

export type ProductList = "todos" | "salvos" | "meus";

export interface ProductFilters {
  query: string;
  category: ProductCategory | "todas";
  origin: ProductOrigin | "todas";
  availability: Availability | "todas";
  list: ProductList;
  saved: string[];
  mine: string[];
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = { query: "", category: "todas", origin: "todas", availability: "todas", list: "todos", saved: [], mine: [] };

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function haystack(p: Product): string {
  return normalize([p.name, p.brand, p.shortDescription, p.description, p.characteristics.join(" "), p.contentTags.join(" ")].join(" "));
}

export function filterProductList(items: Product[], f: ProductFilters): Product[] {
  const terms = normalize(f.query).split(/\s+/).filter(Boolean);
  return items.filter(
    (p) =>
      (f.category === "todas" || p.category === f.category) &&
      (f.origin === "todas" || p.origin === f.origin) &&
      (f.availability === "todas" || p.availability === f.availability) &&
      (f.list !== "salvos" || f.saved.includes(p.id)) &&
      (f.list !== "meus" || f.mine.includes(p.id)) &&
      (terms.length === 0 || terms.every((t) => haystack(p).includes(t))),
  );
}

/** Quantos filtros (além da busca e da lista) estão ativos. */
export const activeProductFilterCount = (f: ProductFilters) => Number(f.category !== "todas") + Number(f.origin !== "todas") + Number(f.availability !== "todas");

/** Lista ordenada pela ordem em que a aluna adicionou (ids desconhecidos são ignorados). */
export function pickInOrder(items: Product[], ids: string[]): Product[] {
  const byId = new Map(items.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}
