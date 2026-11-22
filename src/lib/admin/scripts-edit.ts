/**
 * Edição de ROTEIROS do Estúdio no painel demonstrativo. Módulo PURO.
 * Usa o contrato central `StudioScript` (src/lib/studio/library.ts) — a mesma
 * estrutura que alimenta o Animador. Nada de biblioteca paralela.
 */
import { checkScript, parseScriptsFile, type ScriptFileStatus, type StudioScript } from "../studio/library.ts";
import type { EditorialStatus } from "../content/editorial.ts";
import { slug } from "./catalog-edit.ts";

export function newScriptId(title: string, taken: Set<string>): string {
  const base = `rot-${slug(title) || "novo-roteiro"}`;
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

export function blankScript(id: string): StudioScript {
  return {
    id,
    title: "",
    category: "",
    summary: "",
    format: "avatar_ia",
    language: "pt-BR",
    estimatedSeconds: null,
    tags: [],
    productId: null,
    parts: { hook: "", body: "", cta: "" },
    origin: "equipe",
    authorization: { source: "", authorized: false },
    status: "rascunho",
  };
}

/** “Publicado localmente” existe só na sessão: no arquivo vira “aprovado”. */
export function fileStatusFor(status: EditorialStatus): ScriptFileStatus {
  return status === "publicado_local" ? "aprovado" : status;
}

export function checkScriptDraft(s: StudioScript, productExists: (id: string) => boolean) {
  if (s.origin !== "equipe") return { errors: ["Exemplos do App MVF não são editados (só consulta)."], missing: [], warnings: [] };
  return checkScript(s, { productExists });
}

export interface ScriptDraftEntry {
  script: StudioScript;
  status: EditorialStatus;
}

/** Arquivo `roteiros-oficiais.json` candidato: base + rascunhos (todos os status, inclusive arquivado). */
export function buildScriptsExport(base: StudioScript[], drafts: ScriptDraftEntry[], updatedAt: string, productExists: (id: string) => boolean) {
  const byId = new Map(base.map((s) => [s.id, s]));
  for (const d of drafts) byId.set(d.script.id, { ...d.script, status: fileStatusFor(d.status) });
  const file = { version: 1, updatedAt, scripts: [...byId.values()] };
  const r = parseScriptsFile(file, { productExists });
  return r.ok ? { ok: true as const, errors: [] as string[], file } : { ok: false as const, errors: r.errors, file: null };
}
