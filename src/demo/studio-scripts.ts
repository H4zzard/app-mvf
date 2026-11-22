/**
 * Biblioteca de roteiros do Animador, montada a partir do contrato CENTRAL
 * (`src/lib/studio/library.ts`):
 * - roteiros da EQUIPE com status “aprovado” (`src/content/roteiros-oficiais.json`);
 * - modelos de EXEMPLO do MVF (`studio-templates.ts`): primeira parte → Gancho,
 *   partes do meio → Desenvolvimento, última → CTA.
 * Nunca importar roteiros de terceiros.
 */
import raw from "../content/roteiros-oficiais.json" with { type: "json" };
import type { ScriptParts } from "../lib/studio/contracts.ts";
import { parseScriptsFile, type StudioScript } from "../lib/studio/library.ts";
import { STUDIO_TEMPLATES, type ScriptTemplate } from "./studio-templates.ts";

export interface LibraryScript {
  id: string;
  title: string;
  category: string;
  summary: string;
  /** “exemplo” = modelo MVF; “equipe” = roteiro próprio/autorizado aprovado pela equipe. */
  source: "exemplo" | "equipe";
  /** `{produto}` é trocado pelo nome do produto informado (ou “produto”). */
  parts: ScriptParts;
}

const CATEGORY: Record<string, string> = {
  "tpl-gancho-demo-cta": "Demonstração",
  "tpl-rotina-3-passos": "Rotina",
  "tpl-responde-duvida": "Dúvidas",
  "tpl-lista-3-motivos": "Lista",
  "tpl-unboxing": "Unboxing",
};

/** Modelos de exemplo no formato central (`StudioScript`). */
export function templateToScript(t: ScriptTemplate): StudioScript {
  const lines = t.beats.map((b) => b.line.pt);
  return {
    id: t.id,
    title: t.title.pt,
    category: CATEGORY[t.id] ?? "Outros",
    summary: t.summary,
    format: "avatar_ia",
    language: "pt-BR",
    estimatedSeconds: null,
    tags: [],
    productId: null,
    parts: { hook: lines[0] ?? "", body: lines.slice(1, -1).join(" "), cta: lines.length > 1 ? lines[lines.length - 1] : "" },
    origin: "demonstrativo",
    authorization: { source: "Modelo de exemplo do App MVF", authorized: true },
    status: "aprovado",
  };
}

const parsed = parseScriptsFile(raw);
if (!parsed.ok) throw new Error(`Roteiros oficiais inválidos (src/content/roteiros-oficiais.json):\n- ${parsed.errors.join("\n- ")}`);

/** Roteiros da equipe gravados no arquivo oficial (todos os status). */
export const OFFICIAL_SCRIPTS: StudioScript[] = parsed.scripts;
/** Modelos de exemplo no formato central. */
export const DEMO_SCRIPTS: StudioScript[] = STUDIO_TEMPLATES.map(templateToScript);

const toLibrary = (s: StudioScript): LibraryScript => ({
  id: s.id,
  title: s.title,
  category: s.category,
  summary: s.summary,
  source: s.origin === "equipe" ? "equipe" : "exemplo",
  parts: s.parts,
});

/** O que o Animador mostra: roteiros da equipe APROVADOS + exemplos. */
export const SCRIPT_LIBRARY: LibraryScript[] = [...OFFICIAL_SCRIPTS.filter((s) => s.status === "aprovado"), ...DEMO_SCRIPTS].map(toLibrary);
export const SCRIPT_CATEGORIES = [...new Set(SCRIPT_LIBRARY.map((s) => s.category))];

export function fillProduct(parts: ScriptParts, productName: string): ScriptParts {
  const p = productName.replace(/\s+/g, " ").trim() || "produto";
  const f = (s: string) => s.replaceAll("{produto}", p);
  return { hook: f(parts.hook), body: f(parts.body), cta: f(parts.cta) };
}

export function searchLibrary(query: string, category: string): LibraryScript[] {
  const q = query.trim().toLowerCase();
  return SCRIPT_LIBRARY.filter((s) => (!category || s.category === category) && (!q || `${s.title} ${s.summary} ${s.parts.hook} ${s.parts.body} ${s.parts.cta}`.toLowerCase().includes(q)));
}
