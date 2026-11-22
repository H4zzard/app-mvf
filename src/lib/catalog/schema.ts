/**
 * Validação do arquivo OFICIAL do catálogo (`src/content/catalogo-oficial.json`
 * ou um arquivo novo enviado pela equipe). Módulo PURO.
 *
 * Erros bloqueiam (o arquivo não é usado); avisos só informam pendências.
 * Mensagens em português, com o caminho do campo, para a equipe corrigir.
 */
import type {
  CatalogCourse,
  CatalogFile,
  CatalogLesson,
  CatalogMaterial,
  CatalogModule,
  CatalogRail,
  ContentAvailability,
  ContentOrigin,
  LessonLevel,
  MaterialCategory,
  MaterialKind,
  MediaRef,
  ProfileTag,
} from "@/types/catalog";

export const CATALOG_VERSION = 1;

export const ID_PATTERNS = {
  rail: /^[a-z0-9][a-z0-9-]{0,59}$/,
  module: /^m-[a-z0-9-]{1,60}$/,
  lesson: /^l-[a-z0-9-]{1,60}$/,
  material: /^mat-[a-z0-9-]{1,60}$/,
} as const;

const ORIGINS: ContentOrigin[] = ["oficial", "demonstrativo"];
const AVAILABILITY: ContentAvailability[] = ["disponivel", "em_breve", "oculto"];
const LEVELS: LessonLevel[] = ["fundamento", "intermediario", "avancado"];
const KINDS: MaterialKind[] = ["checklist", "modelo", "guia"];
const CATEGORIES: MaterialCategory[] = ["tiktok-shop", "roteiros", "ia", "produtos", "numi"];
export const PROFILE_TAGS: ProfileTag[] = [
  "todos", "iniciante", "experiente", "aparecer", "sem_aparecer", "avatar_ia", "maos_produto", "narracao", "explorar",
  "bloqueio_produto", "bloqueio_roteiro", "bloqueio_gravar", "bloqueio_editar", "bloqueio_tiktok_shop", "bloqueio_organizacao",
];
const PROVIDERS = ["kiwify", "youtube", "vimeo", "outro"] as const;

export type CatalogParse =
  | { ok: true; file: CatalogFile; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number, allowEmpty = false): v is string =>
  typeof v === "string" && v.length <= max && (allowEmpty || v.trim().length > 0);
const posInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10_000;
const oneOf = <T extends string>(v: unknown, list: readonly T[]): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/** Referência de mídia/arquivo: nunca URL (a URL é resolvida no servidor, para quem tem acesso). */
export function validateMediaRef(v: unknown, path: string, errors: string[]): MediaRef | null {
  if (!isObj(v)) return errors.push(`${path}: informe { "kind": "none" } ou uma referência.`), null;
  if (v.kind === "none") return { kind: "none" };
  if (v.kind === "externo") {
    if (!oneOf(v.provider, PROVIDERS)) return errors.push(`${path}.provider: use ${PROVIDERS.join(", ")}.`), null;
    if (!text(v.ref, 200)) return errors.push(`${path}.ref: informe o identificador do vídeo/arquivo.`), null;
    if (/:\/\/|^www\./i.test(v.ref)) return errors.push(`${path}.ref: use o IDENTIFICADOR, não a URL (links não ficam no catálogo).`), null;
    return { kind: "externo", provider: v.provider, ref: v.ref };
  }
  if (v.kind === "proprio") {
    if (!text(v.assetId, 200) || /:\/\//.test(v.assetId)) return errors.push(`${path}.assetId: informe o identificador do arquivo (sem URL).`), null;
    return { kind: "proprio", assetId: v.assetId };
  }
  errors.push(`${path}.kind: use "none", "externo" ou "proprio".`);
  return null;
}

export function parseCatalogFile(raw: unknown, opts: { requireOfficial?: boolean } = {}): CatalogParse {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requireOfficial = opts.requireOfficial ?? true;
  if (!isObj(raw)) return { ok: false, errors: ["O arquivo precisa ser um objeto JSON."], warnings };
  if (raw.version !== CATALOG_VERSION) errors.push(`version: use ${CATALOG_VERSION}.`);
  const originOk = (v: unknown, path: string) => {
    if (!oneOf(v, ORIGINS)) return errors.push(`${path}: use "oficial" ou "demonstrativo".`), false;
    if (requireOfficial && v !== "oficial") return errors.push(`${path}: o arquivo oficial só aceita "oficial".`), false;
    return true;
  };

  // Curso
  const c = raw.course;
  let course: CatalogCourse | null = null;
  if (!isObj(c) || !ID_PATTERNS.rail.test(String(c.id)) || !text(c.title, 120)) errors.push("course: informe id e title.");
  else if (originOk(c.origin, "course.origin")) course = { id: String(c.id), title: String(c.title), subtitle: text(c.subtitle, 200, true) ? String(c.subtitle) : undefined, origin: c.origin as ContentOrigin };

  // Trilhos
  const rails: CatalogRail[] = [];
  const railIds = new Set<string>();
  if (!Array.isArray(raw.rails) || raw.rails.length === 0) errors.push("rails: informe ao menos um trilho.");
  else
    raw.rails.forEach((r, i) => {
      const p = `rails[${i}]`;
      if (!isObj(r) || !ID_PATTERNS.rail.test(String(r.id))) return errors.push(`${p}.id inválido (letras minúsculas, números e hífen).`);
      if (railIds.has(String(r.id))) return errors.push(`${p}.id duplicado: ${r.id}`);
      if (!text(r.title, 80) || !text(r.subtitle, 160, true) || !posInt(r.order)) return errors.push(`${p}: title, subtitle e order (inteiro ≥ 1) obrigatórios.`);
      railIds.add(String(r.id));
      rails.push({ id: String(r.id), title: String(r.title), subtitle: String(r.subtitle), order: r.order as number });
    });

  // Módulos
  const modules: CatalogModule[] = [];
  const moduleIds = new Set<string>();
  if (!Array.isArray(raw.modules)) errors.push("modules: informe a lista de módulos.");
  else
    raw.modules.forEach((m, i) => {
      const p = `modules[${i}]`;
      if (!isObj(m) || !ID_PATTERNS.module.test(String(m.id))) return errors.push(`${p}.id inválido (formato m-nome-do-modulo).`);
      const id = String(m.id);
      if (moduleIds.has(id)) return errors.push(`${p}.id duplicado: ${id}`);
      moduleIds.add(id);
      if (course && m.courseId !== course.id) errors.push(`${p}.courseId: use "${course.id}".`);
      if (!railIds.has(String(m.railId))) errors.push(`${p}.railId inexistente: ${m.railId}`);
      if (!text(m.title, 120)) errors.push(`${p}.title obrigatório.`);
      if (!text(m.tagline, 160, true)) errors.push(`${p}.tagline: texto (pode ser vazio).`);
      if (typeof m.cover !== "string" || !/^\/[a-z0-9/_.-]+\.(png|jpe?g|webp)$/i.test(m.cover)) errors.push(`${p}.cover: caminho de imagem em /public (ex.: /area-membros/x.png).`);
      if (!posInt(m.order)) errors.push(`${p}.order: inteiro ≥ 1.`);
      if (!oneOf(m.availability, AVAILABILITY)) errors.push(`${p}.availability: disponivel, em_breve ou oculto.`);
      if (!Array.isArray(m.recommendedFor) || !m.recommendedFor.every((t) => oneOf(t, PROFILE_TAGS))) errors.push(`${p}.recommendedFor: use marcadores de perfil válidos.`);
      if (m.href !== undefined && (typeof m.href !== "string" || !m.href.startsWith("/"))) errors.push(`${p}.href: caminho interno (começa com /).`);
      if (!originOk(m.origin, `${p}.origin`)) return;
      modules.push({
        id, courseId: String(m.courseId), railId: String(m.railId), title: String(m.title), tagline: String(m.tagline ?? ""),
        cover: String(m.cover), order: Number(m.order), origin: m.origin as ContentOrigin, availability: m.availability as ContentAvailability,
        recommendedFor: (Array.isArray(m.recommendedFor) ? m.recommendedFor : []) as ProfileTag[], ...(m.href ? { href: String(m.href) } : {}),
      });
    });

  // Materiais (antes das aulas, para validar materialIds)
  const materials: CatalogMaterial[] = [];
  const materialIds = new Set<string>();
  if (!Array.isArray(raw.materials)) errors.push("materials: informe a lista (pode ser vazia).");
  else
    raw.materials.forEach((m, i) => {
      const p = `materials[${i}]`;
      if (!isObj(m) || !ID_PATTERNS.material.test(String(m.id))) return errors.push(`${p}.id inválido (formato mat-nome).`);
      if (materialIds.has(String(m.id))) return errors.push(`${p}.id duplicado: ${m.id}`);
      materialIds.add(String(m.id));
      if (!text(m.title, 160) || !oneOf(m.kind, KINDS) || !oneOf(m.category, CATEGORIES) || !text(m.description, 600, true)) {
        return errors.push(`${p}: title, kind (${KINDS.join("/")}), category (${CATEGORIES.join("/")}) e description obrigatórios.`);
      }
      const file = validateMediaRef(m.file, `${p}.file`, errors);
      if (!file || !originOk(m.origin, `${p}.origin`)) return;
      materials.push({ id: String(m.id), title: String(m.title), kind: m.kind, category: m.category, description: String(m.description), lessonId: m.lessonId ? String(m.lessonId) : null, file, origin: m.origin as ContentOrigin });
      if (file.kind === "none") warnings.push(`${p} (${m.id}): sem arquivo ainda.`);
    });

  // Aulas
  const lessons: CatalogLesson[] = [];
  const lessonIds = new Set<string>();
  if (!Array.isArray(raw.lessons)) errors.push("lessons: informe a lista (pode ser vazia).");
  else {
    raw.lessons.forEach((l, i) => {
      const p = `lessons[${i}]`;
      if (!isObj(l) || !ID_PATTERNS.lesson.test(String(l.id))) return errors.push(`${p}.id inválido (formato l-nome-da-aula).`);
      const id = String(l.id);
      if (lessonIds.has(id)) return errors.push(`${p}.id duplicado: ${id}`);
      lessonIds.add(id);
      if (!moduleIds.has(String(l.moduleId))) errors.push(`${p}.moduleId inexistente: ${l.moduleId}`);
      if (!text(l.title, 160)) errors.push(`${p}.title obrigatório.`);
      if (!posInt(l.order)) errors.push(`${p}.order: inteiro ≥ 1.`);
      if (l.durationMinutes !== null && !(Number.isInteger(l.durationMinutes) && (l.durationMinutes as number) >= 1 && (l.durationMinutes as number) <= 600)) {
        errors.push(`${p}.durationMinutes: minutos (1–600) ou null se ainda não souber.`);
      }
      if (!oneOf(l.level, LEVELS)) errors.push(`${p}.level: ${LEVELS.join(", ")}.`);
      if (!Array.isArray(l.tags) || !l.tags.every((t) => text(t, 40))) errors.push(`${p}.tags: lista de textos.`);
      if (!Array.isArray(l.prerequisites) || !l.prerequisites.every((t) => typeof t === "string")) errors.push(`${p}.prerequisites: lista de IDs de aula.`);
      if (!Array.isArray(l.materialIds) || !l.materialIds.every((t) => materialIds.has(String(t)))) errors.push(`${p}.materialIds: só IDs de materiais deste arquivo.`);
      if (!text(l.summary, 1000, true) || !text(l.practice, 600, true)) errors.push(`${p}: summary e practice são textos (podem ser vazios).`);
      if (!oneOf(l.availability, AVAILABILITY)) errors.push(`${p}.availability: disponivel, em_breve ou oculto.`);
      const media = validateMediaRef(l.media, `${p}.media`, errors);
      if (!media || !originOk(l.origin, `${p}.origin`)) return;
      lessons.push({
        id, moduleId: String(l.moduleId), title: String(l.title), order: Number(l.order),
        durationMinutes: (l.durationMinutes as number | null) ?? null, level: l.level as LessonLevel,
        tags: (l.tags as string[]) ?? [], prerequisites: (l.prerequisites as string[]) ?? [],
        summary: String(l.summary ?? ""), practice: String(l.practice ?? ""), media,
        materialIds: (l.materialIds as string[]) ?? [], origin: l.origin as ContentOrigin, availability: l.availability as ContentAvailability,
      });
      if (media.kind === "none" && l.availability === "disponivel") warnings.push(`${p} (${id}): disponível, mas ainda sem vídeo vinculado.`);
      if (l.durationMinutes === null) warnings.push(`${p} (${id}): duração ainda não informada.`);
    });
    for (const l of lessons) for (const pre of l.prerequisites) if (!lessonIds.has(pre)) errors.push(`lessons (${l.id}).prerequisites: aula inexistente ${pre}.`);
    for (const m of materials) if (m.lessonId && !lessonIds.has(m.lessonId)) errors.push(`materials (${m.id}).lessonId: aula inexistente ${m.lessonId}.`);
  }

  // Aliases de compatibilidade (ID antigo → ID novo)
  const aliases: Record<string, string> = {};
  if (!isObj(raw.lessonAliases)) errors.push('lessonAliases: objeto (pode ser {}).');
  else
    for (const [from, to] of Object.entries(raw.lessonAliases)) {
      if (!ID_PATTERNS.lesson.test(from) || typeof to !== "string" || !lessonIds.has(to)) errors.push(`lessonAliases.${from}: deve apontar para uma aula deste arquivo.`);
      else aliases[from] = to;
    }

  const review = Array.isArray(raw.review) ? raw.review.filter((r): r is string => typeof r === "string") : undefined;
  if (errors.length > 0 || !course) return { ok: false, errors, warnings };
  return { ok: true, file: { version: CATALOG_VERSION, review, course, rails, modules, lessons, materials, lessonAliases: aliases }, warnings };
}
