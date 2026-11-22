/**
 * Edição de CURSOS E AULAS no painel demonstrativo. Módulo PURO.
 *
 * Reaproveita integralmente o contrato do catálogo:
 * - validação: `parseCatalogFile` (mesmas regras do arquivo oficial e do CLI);
 * - montagem/prévia: `buildCatalog` + `createCatalogApi` (mesmas regras das telas);
 * - planilha: colunas `LESSON_CSV_COLUMNS` (importável por `npm run catalog -- import-csv`).
 *
 * IDs: aula nova recebe `l-…` único. Para SUBSTITUIR uma aula de exemplo, a aula
 * oficial usa o MESMO ID (o progresso e as tarefas do plano continuam valendo) —
 * a regra de mesclagem já faz a oficial prevalecer. Aliases existentes no arquivo
 * são preservados como estão.
 */
import type { CatalogFile, CatalogLesson, CatalogModule, ContentAvailability, LessonLevel, MediaRef, ProfileTag } from "@/types/catalog";
import { parseCatalogFile } from "../catalog/schema.ts";
import { LESSON_CSV_COLUMNS } from "../catalog/csv.ts";
import { buildCatalog, createCatalogApi, type DemoOverlay } from "../catalog/build.ts";
import { isExportable, type EditorialStatus } from "../content/editorial.ts";
import { toCsv } from "./diff.ts";

export interface LessonRefs {
  /** Tarefas do plano: id da tarefa → aula. */
  tasks: { id: string; title: string; lessonId: string }[];
  /** Outros lugares que apontam para aulas (encontros, produtos, publicações). */
  others: { where: string; lessonId: string }[];
}

export interface CatalogEditContext {
  file: CatalogFile;
  demo: DemoOverlay;
  refs: LessonRefs;
}

export type ModuleEdit = Partial<Pick<CatalogModule, "order" | "availability" | "recommendedFor" | "tagline">>;

export const LEVEL_LABEL: Record<LessonLevel, string> = { fundamento: "Fundamento", intermediario: "Intermediário", avancado: "Avançado" };
export const AVAILABILITY_LABEL: Record<ContentAvailability, string> = { disponivel: "Disponível", em_breve: "Em breve", oculto: "Oculta" };
export const MEDIA_PROVIDER_LABEL = { kiwify: "Kiwify", youtube: "YouTube", vimeo: "Vimeo", outro: "Outro" } as const;

export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

/** ID novo, único entre oficiais, exemplos, aliases e rascunhos. */
export function newLessonId(title: string, taken: Set<string>): string {
  const base = `l-${slug(title) || "nova-aula"}`;
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

export function blankLesson(id: string, moduleId: string, order: number): CatalogLesson {
  return {
    id,
    moduleId,
    title: "",
    order,
    durationMinutes: null,
    level: "fundamento",
    tags: [],
    prerequisites: [],
    summary: "",
    practice: "",
    media: { kind: "none" },
    materialIds: [],
    origin: "oficial",
    availability: "em_breve",
  };
}

/** Módulos com as edições do rascunho aplicadas (ordem, disponibilidade, recomendações). */
export function applyModuleEdits(modules: CatalogModule[], edits: Record<string, ModuleEdit>): CatalogModule[] {
  return modules.map((m) => (edits[m.id] ? { ...m, ...edits[m.id] } : m));
}

/** Move um módulo para cima/baixo DENTRO do trilho e renumera a ordem (1..n). */
export function moveModule(modules: CatalogModule[], id: string, dir: -1 | 1): Record<string, ModuleEdit> {
  const target = modules.find((m) => m.id === id);
  if (!target) return {};
  const rail = modules.filter((m) => m.railId === target.railId).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const i = rail.findIndex((m) => m.id === id);
  const j = i + dir;
  if (j < 0 || j >= rail.length) return {};
  [rail[i], rail[j]] = [rail[j], rail[i]];
  const out: Record<string, ModuleEdit> = {};
  rail.forEach((m, k) => {
    if (m.order !== k + 1) out[m.id] = { order: k + 1 };
  });
  return out;
}

export interface LessonCheck {
  errors: string[];
  missing: string[];
  warnings: string[];
}

/** Valida UMA aula com o mesmo validador do arquivo oficial. */
export function checkLesson(lesson: CatalogLesson, ctx: CatalogEditContext, opts: { modules?: CatalogModule[]; others?: CatalogLesson[] } = {}): LessonCheck {
  const others = (opts.others ?? ctx.file.lessons).filter((l) => l.id !== lesson.id);
  const candidate = { ...ctx.file, modules: opts.modules ?? ctx.file.modules, lessons: [...others, lesson] };
  const parsed = parseCatalogFile(candidate);
  const idx = others.length;
  const mine = (e: string) => e.startsWith(`lessons[${idx}]`) || e.includes(`(${lesson.id})`);
  const errors = parsed.ok ? [] : parsed.errors.filter(mine).map((e) => e.replace(/^lessons\[\d+\](\s\([^)]*\))?[.:]?\s*/, ""));
  if (!parsed.ok && errors.length === 0 && parsed.errors.length) errors.push(...parsed.errors.slice(0, 1));
  if (ctx.file.lessonAliases[lesson.id]) errors.push(`O ID ${lesson.id} já é um alias e não pode ser usado por uma aula.`);
  const missing: string[] = [];
  if (!lesson.summary.trim()) missing.push("descrição (resumo)");
  if (lesson.durationMinutes === null) missing.push("duração");
  if (lesson.media.kind === "none" && lesson.availability === "disponivel") missing.push("vídeo (ou marque como “Em breve”)");
  const warnings: string[] = [];
  if (ctx.demo.lessons.some((d) => d.id === lesson.id)) warnings.push("Substitui a aula de exemplo com o mesmo ID: o progresso e as tarefas do plano continuam valendo.");
  return { errors, missing, warnings };
}

/** Onde a aula é usada (para avisar antes de excluir). */
export function lessonImpact(id: string, ctx: CatalogEditContext, drafts: CatalogLesson[] = []): string[] {
  const aliasesTo = Object.entries(ctx.file.lessonAliases).filter(([, to]) => to === id).map(([from]) => from);
  const ids = new Set([id, ...aliasesTo]);
  const out: string[] = [];
  for (const t of ctx.refs.tasks) if (ids.has(t.lessonId)) out.push(`Tarefa do plano “${t.title}”`);
  for (const o of ctx.refs.others) if (ids.has(o.lessonId)) out.push(o.where);
  for (const l of [...ctx.file.lessons, ...drafts]) if (l.id !== id && l.prerequisites.some((p) => ids.has(p))) out.push(`Pré-requisito da aula “${l.title || l.id}”`);
  for (const m of ctx.file.materials) if (m.lessonId && ids.has(m.lessonId)) out.push(`Material “${m.title}”`);
  for (const a of aliasesTo) out.push(`Alias de compatibilidade ${a} → ${id}`);
  if (ctx.demo.lessons.some((d) => d.id === id)) out.push("Ao excluir, a aula de EXEMPLO com este ID volta a aparecer.");
  return [...new Set(out)];
}

export interface LessonDraftEntry {
  lesson: CatalogLesson;
  status: EditorialStatus;
}

export interface CatalogExport {
  ok: boolean;
  errors: string[];
  file: CatalogFile | null;
  included: string[];
  excluded: { id: string; status: EditorialStatus }[];
  removed: string[];
}

/**
 * Arquivo oficial candidato: base + edições de módulos + aulas APROVADAS/publicadas
 * localmente − aulas removidas. Validado por `parseCatalogFile` (requireOfficial).
 */
export function buildCatalogExport(ctx: CatalogEditContext, moduleEdits: Record<string, ModuleEdit>, drafts: LessonDraftEntry[], removed: string[] = []): CatalogExport {
  const included = drafts.filter((d) => isExportable(d.status));
  const excluded = drafts.filter((d) => !isExportable(d.status)).map((d) => ({ id: d.lesson.id, status: d.status }));
  const byId = new Map(ctx.file.lessons.filter((l) => !removed.includes(l.id)).map((l) => [l.id, l]));
  for (const d of included) byId.set(d.lesson.id, d.lesson);
  const candidate: CatalogFile = { ...ctx.file, modules: applyModuleEdits(ctx.file.modules, moduleEdits), lessons: [...byId.values()] };
  const parsed = parseCatalogFile(candidate);
  return {
    ok: parsed.ok,
    errors: parsed.ok ? [] : parsed.errors,
    file: parsed.ok ? parsed.file : null,
    included: included.map((d) => d.lesson.id),
    excluded,
    removed,
  };
}

/** Catálogo como a aluna veria (prévia), com as mesmas regras das telas. */
export function previewCatalog(ctx: CatalogEditContext, moduleEdits: Record<string, ModuleEdit>, lessons: CatalogLesson[]) {
  const file: CatalogFile = { ...ctx.file, modules: applyModuleEdits(ctx.file.modules, moduleEdits), lessons };
  return createCatalogApi(buildCatalog(file, ctx.demo));
}

const mediaCols = (m: MediaRef): [string, string] => (m.kind === "none" ? ["", ""] : m.kind === "proprio" ? ["proprio", m.assetId] : [m.provider, m.ref]);

/** Planilha compatível com `npm run catalog -- import-csv` (mesmas colunas do modelo). */
export function lessonsToCsv(lessons: CatalogLesson[]): string {
  const rows = lessons.map((l) => {
    const [provider, ref] = mediaCols(l.media);
    const row: Record<(typeof LESSON_CSV_COLUMNS)[number], string> = {
      id: l.id,
      modulo_id: l.moduleId,
      ordem: String(l.order),
      titulo: l.title,
      duracao_min: l.durationMinutes === null ? "" : String(l.durationMinutes),
      nivel: l.level,
      tags: l.tags.join(";"),
      prerequisitos: l.prerequisites.join(";"),
      resumo: l.summary,
      pratica: l.practice,
      video_provedor: provider,
      video_ref: ref,
      materiais: l.materialIds.join(";"),
      disponibilidade: l.availability,
      substitui_id: "",
    };
    return row;
  });
  return toCsv([...LESSON_CSV_COLUMNS], rows);
}

export const PROFILE_TAG_OPTIONS: ProfileTag[] = ["todos", "iniciante", "experiente", "aparecer", "sem_aparecer", "avatar_ia", "maos_produto", "narracao", "explorar", "bloqueio_produto", "bloqueio_roteiro", "bloqueio_gravar", "bloqueio_editar", "bloqueio_tiktok_shop", "bloqueio_organizacao"];
