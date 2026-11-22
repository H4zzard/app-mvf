/**
 * Importação de aulas por planilha CSV (ex.: Google Sheets → Arquivo → Fazer
 * download → CSV). Módulo PURO: lê o texto e converte para aulas do catálogo.
 * A validação final é sempre a de `parseCatalogFile` (mesmas regras do JSON).
 */
import type { CatalogLesson } from "@/types/catalog";

/** Colunas esperadas (cabeçalho da planilha), na ordem do modelo. */
export const LESSON_CSV_COLUMNS = [
  "id",
  "modulo_id",
  "ordem",
  "titulo",
  "duracao_min",
  "nivel",
  "tags",
  "prerequisitos",
  "resumo",
  "pratica",
  "video_provedor",
  "video_ref",
  "materiais",
  "disponibilidade",
  "substitui_id",
] as const;

/** Parser CSV (RFC 4180): vírgula, aspas duplas, aspas escapadas e quebras de linha dentro de aspas. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const list = (v: string) => v.split(";").map((s) => s.trim()).filter(Boolean);

export interface CsvLessonsResult {
  lessons: Record<string, unknown>[];
  aliases: Record<string, string>;
  errors: string[];
}

/**
 * Converte o CSV em objetos de aula (ainda NÃO validados) e aliases.
 * Linhas de exemplo do modelo (id começando com `l-exemplo-`) são recusadas.
 */
export function lessonsFromCsv(text: string): CsvLessonsResult {
  const rows = parseCsv(text);
  const errors: string[] = [];
  if (rows.length === 0) return { lessons: [], aliases: {}, errors: ["Planilha vazia."] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = LESSON_CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { lessons: [], aliases: {}, errors: [`Colunas ausentes no cabeçalho: ${missing.join(", ")}.`] };
  const col = (r: string[], name: (typeof LESSON_CSV_COLUMNS)[number]) => (r[header.indexOf(name)] ?? "").trim();

  const lessons: Record<string, unknown>[] = [];
  const aliases: Record<string, string> = {};
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const id = col(r, "id");
    if (id.startsWith("l-exemplo-")) return errors.push(`Linha ${line}: é a linha de EXEMPLO do modelo; apague antes de importar.`);
    const provider = col(r, "video_provedor");
    const ref = col(r, "video_ref");
    const duration = col(r, "duracao_min");
    const lesson: Record<string, unknown> = {
      id,
      moduleId: col(r, "modulo_id"),
      title: col(r, "titulo"),
      order: Number(col(r, "ordem")),
      durationMinutes: duration === "" ? null : Number(duration),
      level: col(r, "nivel") || "fundamento",
      tags: list(col(r, "tags")),
      prerequisites: list(col(r, "prerequisitos")),
      summary: col(r, "resumo"),
      practice: col(r, "pratica"),
      media: provider === "" ? { kind: "none" } : provider === "proprio" ? { kind: "proprio", assetId: ref } : { kind: "externo", provider, ref },
      materialIds: list(col(r, "materiais")),
      origin: "oficial",
      availability: col(r, "disponibilidade") || "em_breve",
    };
    lessons.push(lesson);
    const old = col(r, "substitui_id");
    if (old) aliases[old] = id;
  });
  return { lessons, aliases, errors };
}

/** Junta aulas importadas ao arquivo: mesma `id` substitui, novas são acrescentadas. */
export function mergeLessons(existing: CatalogLesson[] | Record<string, unknown>[], incoming: Record<string, unknown>[]): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>((existing as Record<string, unknown>[]).map((l) => [String(l.id), l]));
  for (const l of incoming) byId.set(String(l.id), l);
  return [...byId.values()];
}
