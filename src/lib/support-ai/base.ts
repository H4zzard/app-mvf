/**
 * Base de conhecimento DISPONÍVEL NO REPOSITÓRIO (sem material privado):
 *  - guias do uso do app (`src/content/suporte-base.json`, status por documento);
 *  - aulas do catálogo (título, resumo e prática — nunca vídeo), com `lessonId`
 *    para gerar o link interno. Aula oficial = aprovado; aula de exemplo = rascunho.
 * Transcrições, PDFs e materiais do curso entram pelo pipeline de importação
 * (scripts/support-knowledge.ts) direto no banco, nunca no Git. Módulo puro.
 */
import raw from "../../content/suporte-base.json" with { type: "json" };
import { catalog } from "../catalog/index.ts";
import { validateDocument } from "./knowledge.ts";
import type { KnowledgeDocument } from "./types.ts";

export function repoGuides(): { docs: KnowledgeDocument[]; errors: string[] } {
  const docs: KnowledgeDocument[] = [];
  const errors: string[] = [];
  for (const d of raw.documents as KnowledgeDocument[]) {
    const r = validateDocument(d);
    if (r.ok) docs.push(r.doc);
    else errors.push(`${d.id || "(sem id)"}: ${r.errors.join(" ")}`);
  }
  return { docs, errors };
}

export function catalogLessonDocs(): KnowledgeDocument[] {
  return catalog.lessons().map((l) => {
    const mod = catalog.getModule(l.moduleId);
    return {
      id: `aula-${l.id}`.replace(/[^a-z0-9-]/g, "-").slice(0, 80),
      title: l.title,
      origin: `catalogo:${l.id}`,
      type: "material" as const,
      moduleId: l.moduleId,
      lessonId: l.id,
      version: 1,
      updatedAt: "2026-11-26",
      status: l.origin === "oficial" ? ("aprovado" as const) : ("rascunho" as const),
      access: "alunas" as const,
      text: [mod ? `Módulo ${mod.title}.` : "", `Aula ${l.title}.`, l.summary, l.practice ? `Na prática: ${l.practice}` : ""].filter(Boolean).join(" "),
    };
  });
}

/** Link interno de uma aula, só se ela EXISTE e está visível no catálogo. */
export function lessonHref(lessonId: string): string | null {
  const l = catalog.getLesson(lessonId);
  return l ? `/aulas/${l.id}` : null;
}

export function allRepoKnowledge(): KnowledgeDocument[] {
  return [...repoGuides().docs, ...catalogLessonDocs()];
}
