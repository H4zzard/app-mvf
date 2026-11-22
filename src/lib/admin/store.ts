/**
 * Estado do painel administrativo DEMONSTRATIVO. Redutor PURO e determinístico
 * (sem React, rede, relógio ou armazenamento). Vive só em memória: recarregar
 * descarta tudo (mesma regra de persistência da demo).
 *
 * Toda escrita passa por: permissão do PERFIL SIMULADO → validação do contrato
 * oficial → (se houver) regra do fluxo editorial. Ação inválida = estado igual.
 */
import type { CatalogLesson } from "@/types/catalog";
import type { Product } from "../products/types.ts";
import type { StudioScript } from "../studio/library.ts";
import { checkTransition, type EditorialStatus } from "../content/editorial.ts";
import { profileCan, type AdminProfile } from "./roles.ts";
import { checkLesson, lessonImpact, moveModule, type CatalogEditContext, type ModuleEdit } from "./catalog-edit.ts";
import { checkProduct, statusFromApproval } from "./products-edit.ts";
import { checkScriptDraft } from "./scripts-edit.ts";

export type DraftKind = "aula" | "produto" | "roteiro";

export interface Draft<T> {
  id: string;
  data: T;
  /** Versão do arquivo oficial (null = item novo, criado no painel). */
  base: T | null;
  status: EditorialStatus;
  /** Status de origem (para “descartar”). */
  baseStatus: EditorialStatus | null;
}

export interface AdminState {
  profile: AdminProfile;
  moduleEdits: Record<string, ModuleEdit>;
  lessons: Record<string, Draft<CatalogLesson>>;
  /** Aulas oficiais marcadas para sair do arquivo (com impacto confirmado). */
  removedLessons: string[];
  products: Record<string, Draft<Product>>;
  scripts: Record<string, Draft<StudioScript>>;
  /** Histórico desta sessão (o que realmente aconteceu). */
  log: { seq: number; text: string }[];
  seq: number;
}

export interface AdminContext {
  catalog: CatalogEditContext;
  productsBase: Product[];
  scriptsBase: StudioScript[];
  productExists: (id: string) => boolean;
}

export function initialAdminState(profile: AdminProfile = "administrador"): AdminState {
  return { profile, moduleEdits: {}, lessons: {}, removedLessons: [], products: {}, scripts: {}, log: [], seq: 0 };
}

export type AdminAction =
  | { type: "profile/set"; profile: AdminProfile }
  | { type: "module/move"; id: string; dir: -1 | 1 }
  | { type: "module/edit"; id: string; patch: Omit<ModuleEdit, "order"> }
  | { type: "lesson/save"; lesson: CatalogLesson }
  | { type: "lesson/remove"; id: string; confirmed: boolean }
  | { type: "product/save"; product: Product }
  | { type: "script/save"; script: StudioScript }
  | { type: "status/set"; kind: DraftKind; id: string; to: EditorialStatus }
  | { type: "draft/discard"; kind: DraftKind; id: string }
  | { type: "reset" };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const log = (s: AdminState, text: string): AdminState => ({ ...s, seq: s.seq + 1, log: [{ seq: s.seq + 1, text }, ...s.log].slice(0, 50) });

/** Ao mudar o conteúdo de algo em revisão/aprovado, ele volta a rascunho (precisa nova revisão). */
const afterEdit = (current: EditorialStatus | undefined, changed: boolean): EditorialStatus =>
  !current ? "rascunho" : changed && current !== "rascunho" && current !== "arquivado" ? "rascunho" : current;

export function validateDraft(kind: DraftKind, data: unknown, ctx: AdminContext, s?: AdminState): { errors: string[]; missing: string[] } {
  if (kind === "aula") {
    const lessons = s ? Object.values(s.lessons).map((d) => d.data) : [];
    const modules = ctx.catalog.file.modules.map((m) => (s?.moduleEdits[m.id] ? { ...m, ...s.moduleEdits[m.id] } : m));
    const others = [...ctx.catalog.file.lessons.filter((l) => !lessons.some((d) => d.id === l.id)), ...lessons];
    return checkLesson(data as CatalogLesson, ctx.catalog, { modules, others });
  }
  if (kind === "produto") return checkProduct(data as Product);
  return checkScriptDraft(data as StudioScript, ctx.productExists);
}

export function createAdminReducer(ctx: AdminContext) {
  const can = (s: AdminState, p: Parameters<typeof profileCan>[1]) => profileCan(s.profile, p);

  return function adminReducer(s: AdminState, a: AdminAction): AdminState {
    switch (a.type) {
      case "profile/set":
        return s.profile === a.profile ? s : { ...s, profile: a.profile };

      case "module/move": {
        if (!can(s, "content:edit")) return s;
        const modules = ctx.catalog.file.modules.map((m) => (s.moduleEdits[m.id] ? { ...m, ...s.moduleEdits[m.id] } : m));
        const patch = moveModule(modules, a.id, a.dir);
        if (!Object.keys(patch).length) return s;
        const edits = { ...s.moduleEdits };
        for (const [id, p] of Object.entries(patch)) {
          const base = ctx.catalog.file.modules.find((m) => m.id === id);
          const next = { ...edits[id], ...p };
          if (base && next.order === base.order) delete next.order;
          if (Object.keys(next).length) edits[id] = next;
          else delete edits[id];
        }
        return log({ ...s, moduleEdits: edits }, `Ordem dos módulos alterada no rascunho.`);
      }

      case "module/edit": {
        if (!can(s, "content:edit")) return s;
        const base = ctx.catalog.file.modules.find((m) => m.id === a.id);
        if (!base) return s;
        const next: ModuleEdit = { ...s.moduleEdits[a.id], ...a.patch };
        for (const k of Object.keys(next) as (keyof ModuleEdit)[]) if (same(next[k], base[k])) delete next[k];
        if (next.tagline !== undefined && next.tagline.length > 160) return s;
        const edits = { ...s.moduleEdits };
        if (Object.keys(next).length) edits[a.id] = next;
        else delete edits[a.id];
        return same(edits, s.moduleEdits) ? s : log({ ...s, moduleEdits: edits }, `Módulo “${base.title}” editado no rascunho.`);
      }

      case "lesson/save": {
        if (!can(s, "content:edit")) return s;
        const l = a.lesson;
        if (l.origin !== "oficial") return s;
        const current = s.lessons[l.id];
        const base = ctx.catalog.file.lessons.find((x) => x.id === l.id) ?? null;
        // ID estável: nunca colide com alias e não troca o ID de uma aula existente.
        if (ctx.catalog.file.lessonAliases[l.id]) return s;
        if (validateDraft("aula", l, ctx, s).errors.length) return s;
        const changed = !same(current?.data ?? base, l);
        if (!changed && current) return s;
        const status = afterEdit(current?.status ?? (base ? "aprovado" : undefined), changed);
        const draft: Draft<CatalogLesson> = { id: l.id, data: l, base, status, baseStatus: current?.baseStatus ?? (base ? "aprovado" : null) };
        return log({ ...s, lessons: { ...s.lessons, [l.id]: draft }, removedLessons: s.removedLessons.filter((x) => x !== l.id) }, `Aula “${l.title}” salva no rascunho.`);
      }

      case "lesson/remove": {
        if (!can(s, "content:edit")) return s;
        const draft = s.lessons[a.id];
        const isOfficial = ctx.catalog.file.lessons.some((l) => l.id === a.id);
        if (!draft && !isOfficial) return s;
        const impact = lessonImpact(a.id, ctx.catalog, Object.values(s.lessons).map((d) => d.data));
        if (impact.length && !a.confirmed) return s; // precisa ver e confirmar o impacto
        const lessons = { ...s.lessons };
        delete lessons[a.id];
        const removed = isOfficial && !s.removedLessons.includes(a.id) ? [...s.removedLessons, a.id] : s.removedLessons;
        return log({ ...s, lessons, removedLessons: removed }, `Aula ${a.id} ${isOfficial ? "marcada para sair do arquivo" : "descartada"}.`);
      }

      case "product/save": {
        if (!can(s, "content:edit")) return s;
        const p = a.product;
        if (p.origin !== "oficial") return s; // demonstrativo: só consulta
        if (checkProduct(p).errors.length) return s;
        const current = s.products[p.id];
        const base = ctx.productsBase.find((x) => x.id === p.id) ?? null;
        const changed = !same(current?.data ?? base, p);
        if (!changed && current) return s;
        const baseStatus = base ? statusFromApproval(base.approval) : null;
        const status = afterEdit(current?.status ?? baseStatus ?? undefined, changed);
        return log({ ...s, products: { ...s.products, [p.id]: { id: p.id, data: p, base, status, baseStatus: current?.baseStatus ?? baseStatus } } }, `Produto “${p.name}” salvo no rascunho.`);
      }

      case "script/save": {
        if (!can(s, "content:edit")) return s;
        const sc = a.script;
        if (sc.origin !== "equipe") return s;
        if (checkScriptDraft(sc, ctx.productExists).errors.length) return s;
        const current = s.scripts[sc.id];
        const base = ctx.scriptsBase.find((x) => x.id === sc.id) ?? null;
        const changed = !same(current?.data ?? base, sc);
        if (!changed && current) return s;
        const baseStatus = base ? (base.status as EditorialStatus) : null;
        const status = afterEdit(current?.status ?? baseStatus ?? undefined, changed);
        return log({ ...s, scripts: { ...s.scripts, [sc.id]: { id: sc.id, data: sc, base, status, baseStatus: current?.baseStatus ?? baseStatus } } }, `Roteiro “${sc.title}” salvo no rascunho.`);
      }

      case "status/set": {
        const bag = a.kind === "aula" ? s.lessons : a.kind === "produto" ? s.products : s.scripts;
        const draft = bag[a.id] as Draft<unknown> | undefined;
        if (!draft) return s;
        const v = validateDraft(a.kind, draft.data, ctx, s);
        const r = checkTransition(draft.status, a.to, { can: (p) => can(s, p), errors: v.errors, missing: v.missing });
        if (!r.ok) return s;
        const next = { ...bag, [a.id]: { ...draft, status: a.to } };
        const key = a.kind === "aula" ? "lessons" : a.kind === "produto" ? "products" : "scripts";
        return log({ ...s, [key]: next } as AdminState, `${a.kind === "aula" ? "Aula" : a.kind === "produto" ? "Produto" : "Roteiro"} ${a.id}: ${draft.status} → ${a.to}.`);
      }

      case "draft/discard": {
        const key = a.kind === "aula" ? "lessons" : a.kind === "produto" ? "products" : "scripts";
        const bag = { ...(s[key] as Record<string, Draft<unknown>>) };
        if (!bag[a.id]) return s;
        delete bag[a.id];
        return log({ ...s, [key]: bag } as AdminState, `Alterações de ${a.id} descartadas.`);
      }

      case "reset":
        return initialAdminState(s.profile);
    }
  };
}

/** Status editorial atual de um item (rascunho da sessão ou o do arquivo). */
export function statusOf<T>(draft: Draft<T> | undefined, fallback: EditorialStatus | null): EditorialStatus | null {
  return draft?.status ?? fallback;
}

/** Quantas alterações pendentes existem nesta sessão. */
export function pendingCount(s: AdminState): number {
  return Object.keys(s.moduleEdits).length + Object.keys(s.lessons).length + s.removedLessons.length + Object.keys(s.products).length + Object.keys(s.scripts).length;
}
