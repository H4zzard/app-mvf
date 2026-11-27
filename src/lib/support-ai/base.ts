/**
 * Base de conhecimento DO REPOSITÓRIO para a Nina (sem material privado):
 *  - guias do aplicativo (`src/content/nina/aplicativo.json`), voltados à aluna;
 *  - registro dos MÓDULOS oficiais do catálogo (nome, ordem, trilho);
 *  - aulas do catálogo (título, resumo, prática — nunca vídeo), com id real para o botão.
 * Transcrições, PDFs e materiais do curso entram pelo pipeline (`npm run support-kb`)
 * direto no banco, nunca no Git. Tudo começa como RASCUNHO até a equipe aprovar.
 * Módulo puro.
 */
import guidesFile from "../../content/nina/aplicativo.json" with { type: "json" };
import { catalog, officialCatalogFile } from "../catalog/index.ts";
import { textHash, validateDocument } from "./knowledge.ts";
import type { LessonInfo } from "./decisions.ts";
import type { ApprovalStatus, KnowledgeDocument } from "./types.ts";

export interface AppGuide {
  id: string;
  title: string;
  description: string;
  navigation: string;
  routes: string[];
  /** "todas" = funciona para alunas reais; "demonstracao" = hoje aparece como Em breve para alunas. */
  availability: "todas" | "demonstracao";
  access: string;
  steps: string[];
  faq: { q: string; a: string }[];
  limitations: string[];
  /** Arquivos da funcionalidade (para detectar documentação desatualizada). */
  watch: string[];
  verifiedAt: string;
  status: ApprovalStatus;
}

export const APP_GUIDES: AppGuide[] = guidesFile.guides as AppGuide[];

const AVAILABILITY_TEXT: Record<AppGuide["availability"], string> = {
  todas: "Disponível para todas as alunas.",
  demonstracao: "Para alunas, ainda em preparação: aparece como Em breve. Funciona só na demonstração.",
};

/** Texto do guia para a busca e para a Nina (linguagem de atendimento, sem código). */
export function guideToDocument(g: AppGuide): KnowledgeDocument {
  const text = [
    `${g.title}. ${g.description}`,
    `Onde fica no app. ${g.navigation}.`,
    AVAILABILITY_TEXT[g.availability],
    `Quem pode usar. ${g.access}`,
    g.steps.length ? `Passo a passo. ${g.steps.join(" ")}` : "",
    ...g.faq.map((f) => `Pergunta frequente. ${f.q}? ${f.a}`),
    g.limitations.length ? `Limitações. ${g.limitations.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { id: g.id, title: g.title, origin: `guia-app:${g.routes[0]}`, type: "tutorial_app", version: 1, updatedAt: g.verifiedAt, status: g.status, access: "alunas", text };
}

export function repoGuides(): { docs: KnowledgeDocument[]; errors: string[] } {
  const docs: KnowledgeDocument[] = [];
  const errors: string[] = [];
  for (const g of APP_GUIDES) {
    const r = validateDocument(guideToDocument(g));
    if (r.ok) docs.push(r.doc);
    else errors.push(`${g.id || "(sem id)"}: ${r.errors.join(" ")}`);
  }
  return { docs, errors };
}

/** Impressão digital dos arquivos de uma funcionalidade (conteúdos lidos por quem chama). */
export const guideFingerprint = (contents: string[]) => textHash(contents.join("\n---\n"));

/* ------------------------------ Módulos e aulas ------------------------------ */

/** Registro de cada MÓDULO OFICIAL (nome, ordem, trilho). Descrição/objetivo: só quando a equipe enviar. */
export function officialModuleDocs(): KnowledgeDocument[] {
  const rails = new Map(officialCatalogFile.rails.map((r) => [r.id, r]));
  return officialCatalogFile.modules
    .filter((m) => m.origin === "oficial")
    .map((m) => {
      const rail = rails.get(m.railId);
      const lessons = officialCatalogFile.lessons.filter((l) => l.moduleId === m.id && l.origin === "oficial");
      return {
        id: `modulo-${m.id}`.replace(/[^a-z0-9-]/g, "-").slice(0, 80),
        title: `Módulo ${m.title}`,
        origin: `catalogo:${m.id}`,
        type: "material" as const,
        moduleId: m.id,
        version: 1,
        updatedAt: "2026-11-26",
        status: "rascunho" as const,
        access: "alunas" as const,
        text: [
          `O módulo ${m.title} faz parte da Formação MVF, no trilho ${rail?.title ?? "da área de Aulas"}${rail?.subtitle ? ` (${rail.subtitle})` : ""}.`,
          `Ele fica em Aulas, no trilho ${rail?.title ?? ""}, na posição ${m.order}.${m.tagline ? ` Chamada do módulo. ${m.tagline}.` : ""}`,
          lessons.length
            ? `Aulas oficiais deste módulo. ${lessons.map((l) => l.title).join(", ")}.`
            : "As aulas oficiais deste módulo ainda estão sendo cadastradas no app pela equipe.",
        ].join(" "),
      };
    });
}

/** Aulas do catálogo como documentos (oficiais e de exemplo; todas começam como rascunho). */
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
      status: "rascunho" as const,
      access: "alunas" as const,
      text: [
        mod ? `Aula do módulo ${mod.title}.` : "",
        `Aula ${l.title}.`,
        l.origin === "oficial" ? "" : "Aula de exemplo da demonstração.",
        l.summary,
        l.practice ? `Na prática. ${l.practice}` : "",
        l.tags.length ? `Assuntos. ${l.tags.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
  });
}

/** Link interno de uma aula, só se ela EXISTE e está visível no catálogo. */
export function lessonHref(lessonId: string): string | null {
  const l = catalog.getLesson(lessonId);
  return l ? `/aulas/${l.id}` : null;
}

/**
 * Alunas reais ainda veem Aulas como “Em breve” (DemoModule). Quando a área for
 * liberada para alunas, troque para true: aí só aulas OFICIAIS viram botão.
 */
export const MEMBER_LESSONS_LIVE = false;

/**
 * Valida uma aula para o botão “Abrir aula”: existe, está visível, e a sessão pode abrir.
 * - demonstração: qualquer aula do catálogo (oficial ou de exemplo, rotulada);
 * - aluna real: só aula OFICIAL e só quando a área de Aulas estiver liberada.
 */
export function resolveLessonForSession(lessonId: string, session: { demo: boolean }): LessonInfo | null {
  const l = catalog.getLesson(lessonId);
  if (!l) return null;
  if (!session.demo && (!MEMBER_LESSONS_LIVE || l.origin !== "oficial")) return null;
  const mod = catalog.getModule(l.moduleId);
  return { title: l.title, moduleTitle: mod?.title ?? null, href: `/aulas/${l.id}` };
}

export function allRepoKnowledge(): KnowledgeDocument[] {
  return [...repoGuides().docs, ...officialModuleDocs(), ...catalogLessonDocs()];
}

/* ------------------------------ Relatório de cobertura ------------------------------ */

export interface CoverageReport {
  officialModules: number;
  officialLessons: number;
  officialLessonsWithTranscript: number;
  indexedDocuments: number;
  approvedDocuments: number;
  pendingDocuments: number;
  appGuides: number;
  appGuidesApproved: number;
  lessonsWithoutTranscript: string[];
}

/**
 * Contagens REAIS (nada de número de demonstração): catálogo oficial + documentos
 * importados (`imported`, ex.: lidos de ~/MVF-base pelo pipeline).
 */
export function coverageReport(imported: KnowledgeDocument[] = []): CoverageReport {
  const officialLessons = officialCatalogFile.lessons.filter((l) => l.origin === "oficial");
  const transcripts = new Set(imported.filter((d) => d.type === "transcricao" && d.lessonId).map((d) => d.lessonId!));
  const all = [...allRepoKnowledge(), ...imported];
  return {
    officialModules: officialCatalogFile.modules.filter((m) => m.origin === "oficial").length,
    officialLessons: officialLessons.length,
    officialLessonsWithTranscript: officialLessons.filter((l) => transcripts.has(l.id)).length,
    indexedDocuments: all.length,
    approvedDocuments: all.filter((d) => d.status === "aprovado").length,
    pendingDocuments: all.filter((d) => d.status === "rascunho" || d.status === "em_revisao").length,
    appGuides: APP_GUIDES.length,
    appGuidesApproved: APP_GUIDES.filter((g) => g.status === "aprovado").length,
    lessonsWithoutTranscript: officialLessons.filter((l) => !transcripts.has(l.id)).map((l) => l.id),
  };
}
