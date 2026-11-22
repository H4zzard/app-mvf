/**
 * Biblioteca de ROTEIROS do Estúdio IA — contrato central. Módulo PURO.
 *
 * Fonte única do Animador e do painel:
 * - oficial: `src/content/roteiros-oficiais.json` (roteiros PRÓPRIOS ou AUTORIZADOS
 *   da equipe MVF, `origin: "equipe"`). Vazio até a equipe entregar.
 * - exemplos: modelos MVF de `src/demo/studio-templates.ts` (`origin: "demonstrativo"`).
 *
 * Nunca importar roteiros de terceiros (ex.: os 100 da referência MVM) nem
 * usar selo de “validado comercialmente”. No Animador, só aparecem os
 * oficiais com status “aprovado” (mais os exemplos rotulados).
 */
import type { ScriptParts } from "./contracts.ts";
import { ANIMATION_LIMITS, PACE_WPS, wordCount } from "./animation.ts";
import { findClaims } from "./claims.ts";

export type ScriptFormat = "avatar_ia" | "maos_produto" | "narracao_imagens" | "aparecendo";
export type ScriptLanguage = "pt-BR" | "en";
/** Status gravado no arquivo. (“Publicado localmente” só existe na sessão do painel.) */
export type ScriptFileStatus = "rascunho" | "em_revisao" | "aprovado" | "arquivado";

export const SCRIPT_FORMAT_LABEL: Record<ScriptFormat, string> = {
  avatar_ia: "Avatar IA",
  maos_produto: "Mãos e produto",
  narracao_imagens: "Narração e imagens",
  aparecendo: "Aparecendo",
};
export const SCRIPT_LANGUAGE_LABEL: Record<ScriptLanguage, string> = { "pt-BR": "Português (Brasil)", en: "Inglês" };

export interface StudioScript {
  /** Estável. Oficial: `rot-…`; exemplo: `tpl-…`. */
  id: string;
  title: string;
  category: string;
  summary: string;
  format: ScriptFormat;
  language: ScriptLanguage;
  /** null = calcular pela fala. */
  estimatedSeconds: number | null;
  tags: string[];
  /** Produto relacionado (ID do catálogo de produtos) ou null. */
  productId: string | null;
  /** `{produto}` é trocado pelo nome do produto no Animador. */
  parts: ScriptParts;
  origin: "demonstrativo" | "equipe";
  /** De onde veio o texto e se a equipe tem autorização de uso. */
  authorization: { source: string; authorized: boolean };
  status: ScriptFileStatus;
}

export const SCRIPT_LIMITS = { title: 100, category: 40, summary: 200, tag: 30, tags: 10, source: 200, minSeconds: 5, maxSeconds: 600 } as const;
export const OFFICIAL_SCRIPT_ID = /^rot-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANY_SCRIPT_ID = /^(rot|tpl)-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORMATS = Object.keys(SCRIPT_FORMAT_LABEL) as ScriptFormat[];
const STATUSES: ScriptFileStatus[] = ["rascunho", "em_revisao", "aprovado", "arquivado"];

/** Duração estimada da fala (ritmo natural do Animador). */
export function estimateScriptSeconds(parts: ScriptParts): number {
  const words = wordCount([parts.hook, parts.body, parts.cta].join(" "));
  return Math.max(1, Math.round(words / PACE_WPS.natural));
}

export interface ScriptCheck {
  /** Impedem salvar/exportar. */
  errors: string[];
  /** Faltam para ficar pronto (aprovação). */
  missing: string[];
  /** Avisos (alegações, números) — não bloqueiam. */
  warnings: string[];
}

export function checkScript(s: StudioScript, opts: { productExists?: (id: string) => boolean } = {}): ScriptCheck {
  const errors: string[] = [];
  const missing: string[] = [];
  const L = SCRIPT_LIMITS;
  if (!ANY_SCRIPT_ID.test(s.id) || s.id.length > 64) errors.push("ID inválido (use rot-nome-do-roteiro).");
  if (s.origin === "equipe" && !OFFICIAL_SCRIPT_ID.test(s.id)) errors.push("Roteiro da equipe usa ID começando com “rot-”.");
  if (s.title.trim().length < 3 || s.title.length > L.title) errors.push(`Título entre 3 e ${L.title} caracteres.`);
  if (!s.category.trim() || s.category.length > L.category) errors.push(`Categoria obrigatória (até ${L.category} caracteres).`);
  if (s.summary.length > L.summary) errors.push(`Resumo com até ${L.summary} caracteres.`);
  if (!FORMATS.includes(s.format)) errors.push("Formato inválido.");
  if (s.language !== "pt-BR" && s.language !== "en") errors.push("Idioma inválido.");
  if (s.estimatedSeconds !== null && (!Number.isInteger(s.estimatedSeconds) || s.estimatedSeconds < L.minSeconds || s.estimatedSeconds > L.maxSeconds)) {
    errors.push(`Duração entre ${L.minSeconds} e ${L.maxSeconds} segundos (ou deixe em branco).`);
  }
  if (s.tags.length > L.tags || s.tags.some((t) => !t.trim() || t.length > L.tag)) errors.push(`Até ${L.tags} tags de ${L.tag} caracteres.`);
  for (const [k, v] of Object.entries(s.parts)) if (v.length > ANIMATION_LIMITS.part) errors.push(`${k === "hook" ? "Gancho" : k === "body" ? "Desenvolvimento" : "CTA"}: até ${ANIMATION_LIMITS.part} caracteres.`);
  if (!s.parts.hook.trim() && !s.parts.body.trim()) errors.push("Escreva ao menos o gancho ou o desenvolvimento.");
  if (s.productId && opts.productExists && !opts.productExists(s.productId)) errors.push("Produto relacionado não existe no catálogo.");
  if (s.authorization.source.length > L.source) errors.push(`Origem com até ${L.source} caracteres.`);
  if (/validad[oa]\s+comercialmente/i.test(`${s.title} ${s.summary} ${s.tags.join(" ")} ${s.category}`)) errors.push("Não use o selo “validado comercialmente”: o app não valida resultado comercial.");
  if (!STATUSES.includes(s.status)) errors.push("Status inválido.");

  if (!s.parts.hook.trim()) missing.push("gancho");
  if (!s.parts.body.trim()) missing.push("desenvolvimento");
  if (!s.parts.cta.trim()) missing.push("CTA");
  if (!s.summary.trim()) missing.push("resumo");
  if (!s.authorization.source.trim()) missing.push("origem do texto");
  if (!s.authorization.authorized) missing.push("confirmação de autorização de uso");
  if (s.origin !== "equipe") missing.push("roteiro da equipe (exemplos não são aprovados)");

  const warnings = findClaims([s.parts.hook, s.parts.body, s.parts.cta].join(" ")).map((w) => w.message);
  return { errors, missing, warnings };
}

export type ScriptsFileParse = { ok: true; scripts: StudioScript[]; warnings: string[] } | { ok: false; errors: string[] };

/** Valida o arquivo oficial (`roteiros-oficiais.json`). Só roteiros da equipe. */
export function parseScriptsFile(raw: unknown, opts: { productExists?: (id: string) => boolean } = {}): ScriptsFileParse {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, errors: ["O arquivo deve ser um objeto JSON."] };
  const o = raw as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];
  if (o.version !== 1) errors.push("version: use 1.");
  if (!Array.isArray(o.scripts)) return { ok: false, errors: [...errors, "scripts: deve ser uma lista."] };
  const seen = new Set<string>();
  const scripts: StudioScript[] = [];
  o.scripts.forEach((x, i) => {
    const s = x as StudioScript;
    const shapeOk =
      typeof s === "object" && s !== null && typeof s.id === "string" && typeof s.title === "string" && typeof s.category === "string" &&
      typeof s.summary === "string" && Array.isArray(s.tags) && typeof s.parts === "object" && s.parts !== null &&
      ["hook", "body", "cta"].every((k) => typeof (s.parts as unknown as Record<string, unknown>)[k] === "string") &&
      typeof s.authorization === "object" && s.authorization !== null && typeof s.authorization.source === "string" && typeof s.authorization.authorized === "boolean";
    if (!shapeOk) return errors.push(`scripts[${i}]: formato inválido.`);
    if (s.origin !== "equipe") return errors.push(`scripts[${i}] (${s.id}): o arquivo oficial só aceita origin "equipe".`);
    if (seen.has(s.id)) return errors.push(`scripts[${i}]: id repetido (${s.id}).`);
    seen.add(s.id);
    const c = checkScript(s, opts);
    errors.push(...c.errors.map((e) => `scripts[${i}] (${s.id}): ${e}`));
    if (s.status === "aprovado" && c.missing.length) errors.push(`scripts[${i}] (${s.id}): aprovado, mas falta ${c.missing.join(", ")}.`);
    warnings.push(...c.warnings.map((w) => `${s.id}: ${w}`));
    scripts.push(s);
  });
  return errors.length ? { ok: false, errors } : { ok: true, scripts, warnings };
}
