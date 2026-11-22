/**
 * Importação FUTURA de produtos por planilha (CSV) ou JSON, com PRÉVIA antes de
 * gravar. Módulo PURO: recebe texto/objetos e devolve o resultado; quem grava é
 * o CLI (`npm run products -- import … --write`).
 *
 * Regras de segurança dos dados oficiais:
 * - célula vazia NUNCA apaga um valor existente;
 * - mudar um valor já cadastrado de produto OFICIAL é “conflito” e só é aplicado
 *   com `overwrite: true` (o operador revisa a prévia antes);
 * - o resultado final passa pela mesma validação do arquivo oficial.
 */
import { parseCsv } from "../catalog/csv.ts";
import { parseProduct } from "./schema.ts";
import type { Product } from "./types.ts";

/** Colunas do modelo (docs/catalogo/modelo-produtos.csv). Listas usam “;”. */
export const PRODUCT_CSV_COLUMNS = [
  "id",
  "marca",
  "nome",
  "categoria",
  "origem",
  "aprovacao",
  "disponibilidade",
  "novidade",
  "descricao_curta",
  "descricao",
  "modo_de_uso",
  "caracteristicas",
  "beneficios_aprovados",
  "restricoes",
  "preco",
  "preco_verificado_em",
  "comissao_valor",
  "comissao_tipo",
  "comissao_fonte",
  "comissao_verificada_em",
  "afiliacao_status",
  "afiliacao_condicoes",
  "link_afiliacao",
  "link_produto",
  "imagens",
  "materiais",
  "aulas",
  "tags",
  "formatos",
] as const;

type Row = Record<string, unknown>;
const listOf = (s: string) =>
  s
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
const num = (s: string) => {
  const n = Number(s.replace(/\s|R\$|%/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/** Converte a planilha em objetos PARCIAIS (só as células preenchidas). */
export function productsFromCsv(text: string): { rows: Row[]; errors: string[] } {
  const errors: string[] = [];
  const table = parseCsv(text.replace(/^﻿/, ""));
  if (table.length === 0) return { rows: [], errors: ["Planilha vazia."] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const unknown = header.filter((h) => h && !(PRODUCT_CSV_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) errors.push(`Colunas desconhecidas: ${unknown.join(", ")}.`);
  if (!header.includes("id")) errors.push("A coluna “id” é obrigatória.");
  const rows: Row[] = [];
  table.slice(1).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return;
    const get = (col: string) => (cells[header.indexOf(col)] ?? "").trim();
    const has = (col: string) => header.includes(col) && get(col) !== "";
    const r: Row = { id: get("id") };
    if (has("marca")) r.brand = get("marca");
    if (has("nome")) r.name = get("nome");
    if (has("categoria")) r.category = get("categoria");
    if (has("origem")) r.origin = get("origem");
    if (has("aprovacao")) r.approval = get("aprovacao");
    if (has("disponibilidade")) r.availability = get("disponibilidade");
    if (has("novidade")) r.isNew = /^(sim|true|1)$/i.test(get("novidade"));
    if (has("descricao_curta")) r.shortDescription = get("descricao_curta");
    if (has("descricao")) r.description = get("descricao");
    if (has("modo_de_uso")) r.howToUse = get("modo_de_uso");
    if (has("caracteristicas")) r.characteristics = listOf(get("caracteristicas"));
    if (has("beneficios_aprovados")) r.approvedBenefits = listOf(get("beneficios_aprovados"));
    if (has("restricoes")) r.restrictions = listOf(get("restricoes"));
    if (has("preco")) r.price = { amount: num(get("preco")), currency: "BRL", verifiedAt: get("preco_verificado_em") };
    if (has("comissao_valor"))
      r.commission = { value: num(get("comissao_valor")), type: get("comissao_tipo"), source: get("comissao_fonte"), verifiedAt: get("comissao_verificada_em") };
    if (has("afiliacao_status") || has("afiliacao_condicoes") || has("link_afiliacao")) {
      r.affiliation = {
        ...(has("afiliacao_status") ? { status: get("afiliacao_status") } : {}),
        ...(has("afiliacao_condicoes") ? { conditions: get("afiliacao_condicoes") } : {}),
        ...(has("link_afiliacao") ? { affiliateUrl: get("link_afiliacao") } : {}),
      };
    }
    if (has("link_produto")) r.productUrl = get("link_produto");
    if (has("imagens"))
      // “caminho|texto alternativo” ou “caminho|texto|capa-oficial” (arte oficial, não foto de catálogo).
      r.images = listOf(get("imagens")).map((x) => {
        const [src, alt, kind] = x.split("|").map((s) => s.trim());
        return { src, alt: alt ?? "", kind: kind === "capa-oficial" ? "capa-oficial" : "foto" };
      });
    if (has("materiais")) r.materialIds = listOf(get("materiais"));
    if (has("aulas")) r.lessonIds = listOf(get("aulas"));
    if (has("tags")) r.contentTags = listOf(get("tags"));
    if (has("formatos")) r.formats = listOf(get("formatos"));
    if (!r.id) errors.push(`Linha ${i + 2}: sem id.`);
    rows.push(r);
  });
  return { rows, errors };
}

/** JSON enviado pela equipe: `{ products: [...] }` ou uma lista. */
export function productsFromJson(data: unknown): { rows: Row[]; errors: string[] } {
  const list = Array.isArray(data) ? data : typeof data === "object" && data !== null && Array.isArray((data as Row).products) ? ((data as Row).products as unknown[]) : null;
  if (!list) return { rows: [], errors: ["Esperado uma lista de produtos ou { products: [...] }."] };
  const bad = list.findIndex((x) => typeof x !== "object" || x === null || Array.isArray(x));
  if (bad >= 0) return { rows: [], errors: [`Item ${bad + 1}: deve ser um objeto.`] };
  return { rows: list as Row[], errors: [] };
}

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === 0);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface ImportConflict {
  id: string;
  field: string;
  current: unknown;
  incoming: unknown;
}

export interface ImportPreview {
  added: string[];
  updated: { id: string; fields: string[] }[];
  unchanged: string[];
  /** Mudanças em produto oficial que NÃO foram aplicadas (precisam de overwrite). */
  conflicts: ImportConflict[];
  errors: string[];
  warnings: string[];
  /** Lista final (existentes + importados), já validada. Só gravar se `errors` estiver vazio. */
  products: Product[];
}

export function previewProductImport(existing: Product[], rows: Row[], opts: { overwrite?: boolean } = {}): ImportPreview {
  const out: ImportPreview = { added: [], updated: [], unchanged: [], conflicts: [], errors: [], warnings: [], products: [] };
  const result = new Map(existing.map((p) => [p.id, p]));
  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (seen.has(id)) {
      out.errors.push(`Item ${i + 1}: id repetido na importação (${id}).`);
      return;
    }
    seen.add(id);
    const current = result.get(id);
    let merged: Row;
    const changed: string[] = [];
    if (!current) {
      merged = { origin: "oficial", approval: "rascunho", availability: "a_confirmar", ...row, id };
    } else {
      merged = { ...current };
      for (const [field, value] of Object.entries(row)) {
        if (field === "id" || isEmpty(value)) continue; // vazio nunca apaga
        const incoming = field === "affiliation" ? { ...current.affiliation, ...(value as Row) } : value;
        if (same((current as unknown as Row)[field], incoming)) continue;
        const hadValue = !isEmpty((current as unknown as Row)[field]) && !(field === "affiliation" && current.affiliation.status === "a_confirmar" && !current.affiliation.conditions && !current.affiliation.affiliateUrl);
        if (current.origin === "oficial" && hadValue && !opts.overwrite) {
          out.conflicts.push({ id, field, current: (current as unknown as Row)[field], incoming });
          continue;
        }
        merged[field] = incoming;
        changed.push(field);
      }
    }
    const parsed = parseProduct(merged, `importação[${i + 1}]`);
    out.warnings.push(...parsed.warnings);
    if (!parsed.product) {
      out.errors.push(...parsed.errors);
      return;
    }
    result.set(id, parsed.product);
    if (!current) out.added.push(id);
    else if (changed.length) out.updated.push({ id, fields: changed });
    else out.unchanged.push(id);
  });

  out.products = [...result.values()];
  return out;
}
