/**
 * Filtros, busca e ordenação dos módulos da demonstração. Funções puras.
 */
import type { Lesson } from "@/types";
import type { ViralCategory, ViralCountry, ViralKind, ViralPlatform, ViralReference } from "../../demo/virals.ts";
import type { DemoProduct, ProductCategory } from "../../demo/products.ts";
import type { CommunityPost, SpaceId } from "../../demo/community.ts";
import type { LibraryCategoryId } from "../../demo/library.ts";
import { LIBRARY_CATEGORIES } from "../../demo/library.ts";

/** Normaliza para busca: minúsculas e sem acentos. */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function matchesQuery(query: string, ...fields: string[]): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = normalizeSearch(fields.join(" "));
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/* --------------------------------- Aulas --------------------------------- */

export type LessonStatusFilter = "todas" | "pendentes" | "concluidas";

export function filterLessons(
  lessons: Lesson[],
  opts: { query: string; category: LibraryCategoryId | "todas"; status: LessonStatusFilter; isDone: (id: string) => boolean },
): Lesson[] {
  const modules = opts.category === "todas" ? null : LIBRARY_CATEGORIES.find((c) => c.id === opts.category)?.modules ?? [];
  return lessons.filter(
    (l) =>
      (!modules || modules.includes(l.module)) &&
      (opts.status === "todas" || (opts.status === "concluidas") === opts.isDone(l.id)) &&
      matchesQuery(opts.query, l.title, l.module, l.tags.join(" ")),
  );
}

/* --------------------------------- Virais --------------------------------- */

export interface ViralFilters {
  query: string;
  platform: ViralPlatform | "todas";
  kind: ViralKind | "todos";
  country: ViralCountry | "todos";
  category: ViralCategory | "todas";
  onlyFavorites: boolean;
  sort: "curadoria" | "az" | "duracao";
}

export const DEFAULT_VIRAL_FILTERS: ViralFilters = {
  query: "",
  platform: "todas",
  kind: "todos",
  country: "todos",
  category: "todas",
  onlyFavorites: false,
  sort: "curadoria",
};

export function filterVirals(items: ViralReference[], f: ViralFilters, favorites: string[]): ViralReference[] {
  const result = items.filter(
    (v) =>
      (f.platform === "todas" || v.platform === f.platform) &&
      (f.kind === "todos" || v.kind === f.kind) &&
      (f.country === "todos" || v.country === f.country) &&
      (f.category === "todas" || v.category === f.category) &&
      (!f.onlyFavorites || favorites.includes(v.id)) &&
      matchesQuery(f.query, v.title, v.hook, v.cta),
  );
  const sorted = [...result];
  if (f.sort === "az") sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  else if (f.sort === "duracao") sorted.sort((a, b) => a.durationSec - b.durationSec || a.id.localeCompare(b.id));
  else sorted.sort((a, b) => b.curationOrder - a.curationOrder);
  return sorted;
}

export function activeViralFilterCount(f: ViralFilters): number {
  return (
    Number(f.platform !== "todas") +
    Number(f.kind !== "todos") +
    Number(f.country !== "todos") +
    Number(f.category !== "todas") +
    Number(f.onlyFavorites)
  );
}

/* ------------------------------- Marketplace ------------------------------- */

export function filterProducts(
  items: DemoProduct[],
  opts: { query: string; category: ProductCategory | "todas"; onlyMine: boolean; mine: string[] },
): DemoProduct[] {
  return items.filter(
    (p) =>
      (opts.category === "todas" || p.category === opts.category) &&
      (!opts.onlyMine || opts.mine.includes(p.id)) &&
      matchesQuery(opts.query, p.name, p.description),
  );
}

/* -------------------------------- Comunidade -------------------------------- */

export function filterPosts(posts: CommunityPost[], space: SpaceId | "todos"): CommunityPost[] {
  return space === "todos" ? posts.filter((p) => p.spaceId !== "elite" && p.spaceId !== "icon") : posts.filter((p) => p.spaceId === space);
}
