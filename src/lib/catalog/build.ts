/**
 * Montagem e consulta do CATÁLOGO. Módulo PURO (testável, sem React/rede).
 *
 * Regras de mesclagem:
 * - Módulos, trilhos e curso vêm do arquivo oficial.
 * - Aulas/materiais oficiais têm prioridade. Um módulo COM aulas oficiais não
 *   recebe aulas demonstrativas; um módulo SEM aulas oficiais pode receber as de
 *   exemplo (marcadas `origin: "demonstrativo"`).
 * - `lessonAliases` mapeia IDs antigos (usados pelo plano/progresso) para os novos;
 *   aula demonstrativa “substituída” por alias some do catálogo.
 * - `oculto` nunca aparece; `em_breve` aparece com estado próprio.
 */
import type { OnboardingProfile } from "@/types";
import type { CatalogFile, CatalogLesson, CatalogMaterial, CatalogModule, CatalogRail, ProfileTag } from "@/types/catalog";
import { TAG_LABEL, profileTags } from "./profile-tags.ts";

export interface DemoOverlay {
  lessons: CatalogLesson[];
  materials: CatalogMaterial[];
}

export interface Catalog {
  course: CatalogFile["course"];
  rails: CatalogRail[];
  modules: CatalogModule[];
  lessons: CatalogLesson[];
  materials: CatalogMaterial[];
  aliases: Record<string, string>;
}

const byOrder = <T extends { order: number; id: string }>(a: T, b: T) => a.order - b.order || a.id.localeCompare(b.id);

export function buildCatalog(file: CatalogFile, demo: DemoOverlay | null): Catalog {
  const officialModules = new Set(file.lessons.map((l) => l.moduleId));
  const officialIds = new Set(file.lessons.map((l) => l.id));
  const aliased = new Set(Object.keys(file.lessonAliases));
  const moduleIds = new Set(file.modules.map((m) => m.id));
  const demoLessons = (demo?.lessons ?? []).filter(
    (l) => moduleIds.has(l.moduleId) && !officialModules.has(l.moduleId) && !officialIds.has(l.id) && !aliased.has(l.id),
  );
  const lessonIds = new Set([...officialIds, ...demoLessons.map((l) => l.id)]);
  const demoMaterials = (demo?.materials ?? []).filter(
    (m) => !file.materials.some((o) => o.id === m.id) && (m.lessonId === null || lessonIds.has(m.lessonId) || aliased.has(m.lessonId)),
  );
  return {
    course: file.course,
    rails: [...file.rails].sort(byOrder),
    modules: [...file.modules].sort(byOrder),
    lessons: [...file.lessons, ...demoLessons],
    materials: [...file.materials, ...demoMaterials],
    aliases: { ...file.lessonAliases },
  };
}

export interface CatalogGaps {
  modulesWithoutLessons: string[];
  modulesOnlyDemo: string[];
  officialLessons: number;
  demoLessons: number;
  lessonsWithoutVideo: string[];
  lessonsWithoutDuration: string[];
  materialsWithoutFile: number;
}

export function createCatalogApi(catalog: Catalog) {
  const visible = <T extends { availability: string }>(x: T) => x.availability !== "oculto";
  const railOrder = new Map(catalog.rails.map((r) => [r.id, r.order]));
  const modules = catalog.modules.filter(visible).sort((a, b) => (railOrder.get(a.railId) ?? 99) - (railOrder.get(b.railId) ?? 99) || byOrder(a, b));
  const moduleIndex = new Map(modules.map((m, i) => [m.id, i]));
  const lessons = catalog.lessons
    .filter(visible)
    .filter((l) => moduleIndex.has(l.moduleId))
    .sort((a, b) => (moduleIndex.get(a.moduleId) ?? 0) - (moduleIndex.get(b.moduleId) ?? 0) || byOrder(a, b));
  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  function resolveLessonId(id: string): string {
    let cur = id;
    for (let i = 0; i < 5 && catalog.aliases[cur]; i++) cur = catalog.aliases[cur];
    return cur;
  }
  const getLesson = (id: string) => lessonById.get(resolveLessonId(id));
  const getModule = (id: string) => modules.find((m) => m.id === id);
  const lessonsOfModule = (moduleId: string) => lessons.filter((l) => l.moduleId === moduleId);
  const modulesOfRail = (railId: string) => modules.filter((m) => m.railId === railId);
  const playable = (l: CatalogLesson) => l.availability === "disponivel";

  return {
    course: catalog.course,
    rails: () => catalog.rails.filter((r) => modulesOfRail(r.id).length > 0),
    modules: () => modules,
    modulesOfRail,
    getModule,
    lessons: () => lessons,
    lessonsOfModule,
    getLesson,
    resolveLessonId,
    moduleOfLesson: (lessonId: string) => {
      const l = getLesson(lessonId);
      return l ? getModule(l.moduleId) : undefined;
    },
    materials: () => catalog.materials,

    /** Progresso do módulo (só aulas visíveis). */
    moduleProgress(moduleId: string, isDone: (id: string) => boolean) {
      const ls = lessonsOfModule(moduleId);
      return { total: ls.length, done: ls.filter((l) => isDone(l.id)).length };
    },

    /**
     * Próxima aula: primeiro a do plano (ordem do plano, IDs resolvidos), senão a
     * primeira disponível e não concluída na ordem do catálogo.
     */
    nextLesson(opts: { preferred: string[]; isDone: (id: string) => boolean }): CatalogLesson | undefined {
      for (const id of opts.preferred) {
        const l = getLesson(id);
        if (l && playable(l) && !opts.isDone(l.id)) return l;
      }
      return lessons.find((l) => playable(l) && !opts.isDone(l.id));
    },

    /** Seguinte na trilha: próxima do módulo, senão a primeira do próximo módulo com aulas. */
    nextInTrail(lessonId: string): CatalogLesson | undefined {
      const cur = getLesson(lessonId);
      if (!cur) return undefined;
      const i = lessons.indexOf(cur);
      return lessons.slice(i + 1).find(playable);
    },

    searchLessons(query: string, normalize: (s: string) => string): CatalogLesson[] {
      const terms = normalize(query).split(/\s+/).filter(Boolean);
      if (terms.length === 0) return lessons;
      return lessons.filter((l) => {
        const hay = normalize([l.title, getModule(l.moduleId)?.title ?? "", l.tags.join(" "), l.summary].join(" "));
        return terms.every((t) => hay.includes(t));
      });
    },

    /**
     * Recomendações a partir do onboarding: pontua pelos marcadores do módulo.
     * Bloqueio principal pesa mais; “todos” pesa pouco; empate segue a ordem do catálogo.
     */
    recommendModules(profile: OnboardingProfile | null | undefined, limit = 6): { modules: CatalogModule[]; reason: string } {
      if (!profile) {
        const first = catalog.rails[0];
        return { modules: (first ? modulesOfRail(first.id) : modules).slice(0, limit), reason: "Para quem está começando" };
      }
      const tags = new Set(profileTags(profile));
      const matched = new Set<ProfileTag>();
      const scored = modules
        .map((m, i) => {
          let score = 0;
          for (const t of m.recommendedFor) {
            if (t === "todos") score += 1;
            else if (tags.has(t)) {
              score += t.startsWith("bloqueio_") ? 100 : 10;
              matched.add(t);
            }
          }
          return { m, score, i };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .slice(0, limit);
      const reasonTags = [...matched].filter((t) => !t.startsWith("bloqueio_")).map((t) => TAG_LABEL[t]).filter(Boolean);
      return {
        modules: scored.map((x) => x.m),
        reason: reasonTags.length ? `Para o seu perfil: ${reasonTags.join(" · ")}` : "Para o seu perfil",
      };
    },

    /** Pendências para o relatório (`npm run catalog:check`). */
    gaps(): CatalogGaps {
      return {
        modulesWithoutLessons: modules.filter((m) => !m.href && lessonsOfModule(m.id).length === 0).map((m) => m.id),
        modulesOnlyDemo: modules.filter((m) => {
          const ls = lessonsOfModule(m.id);
          return ls.length > 0 && ls.every((l) => l.origin === "demonstrativo");
        }).map((m) => m.id),
        officialLessons: lessons.filter((l) => l.origin === "oficial").length,
        demoLessons: lessons.filter((l) => l.origin === "demonstrativo").length,
        lessonsWithoutVideo: lessons.filter((l) => l.origin === "oficial" && l.media.kind === "none").map((l) => l.id),
        lessonsWithoutDuration: lessons.filter((l) => l.origin === "oficial" && l.durationMinutes === null).map((l) => l.id),
        materialsWithoutFile: catalog.materials.filter((m) => m.file.kind === "none").length,
      };
    },
  };
}

export type CatalogApi = ReturnType<typeof createCatalogApi>;
