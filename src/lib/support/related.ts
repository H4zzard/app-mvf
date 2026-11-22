/**
 * Aulas e materiais relacionados a um problema de suporte. Usa SÓ o catálogo
 * atual (src/lib/catalog) e a Central de Materiais — nada é inventado. Puro.
 */
import type { CatalogLesson } from "@/types/catalog";
import { catalog } from "../catalog/index.ts";
import { DEMO_MATERIALS, type Material } from "../../demo/materials.ts";
import { HELP_SHORTCUTS } from "../../demo/help-center.ts";
import type { TicketCategory } from "./tickets.ts";
import { overlapScore } from "./search.ts";

export interface RelatedLearning {
  lessons: CatalogLesson[];
  materials: Material[];
}

export function relatedLearning(text: string, topic: TicketCategory | null, limit = 3): RelatedLearning {
  const keywords = topic ? (HELP_SHORTCUTS.find((s) => s.topic === topic)?.keywords ?? "") : "";
  const query = `${text} ${keywords}`.trim();
  if (!query) return { lessons: [], materials: [] };
  const lessons = catalog
    .lessons()
    .map((l, i) => ({ l, i, s: overlapScore(query, l.title, l.summary, l.tags.join(" ")) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.l);
  const lessonIds = new Set(lessons.map((l) => l.id));
  const materials = DEMO_MATERIALS.map((m, i) => ({ m, i, s: overlapScore(query, m.title, m.description) + (m.lessonId && lessonIds.has(m.lessonId) ? 2 : 0) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.m);
  return { lessons, materials };
}
