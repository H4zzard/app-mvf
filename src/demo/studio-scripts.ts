/**
 * Biblioteca de roteiros do Animador (EXEMPLOS MVF).
 *
 * Derivada dos modelos de exemplo do Estúdio (`studio-templates.ts`), reaproveitando
 * as falas já existentes: primeira parte → Gancho, partes do meio →
 * Desenvolvimento, última → CTA. Roteiros próprios/licenciados da equipe NUMI
 * entrarão aqui no MESMO formato, com `source: "validado"`. Nunca importar
 * roteiros de terceiros.
 */
import type { ScriptParts } from "../lib/studio/contracts.ts";
import { STUDIO_TEMPLATES, type ScriptTemplate } from "./studio-templates.ts";

export interface LibraryScript {
  id: string;
  title: string;
  category: string;
  summary: string;
  source: "exemplo" | "validado";
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

function fromTemplate(t: ScriptTemplate): LibraryScript {
  const lines = t.beats.map((b) => b.line.pt);
  return {
    id: t.id,
    title: t.title.pt,
    category: CATEGORY[t.id] ?? "Outros",
    summary: t.summary,
    source: t.source,
    parts: { hook: lines[0] ?? "", body: lines.slice(1, -1).join(" "), cta: lines.length > 1 ? lines[lines.length - 1] : "" },
  };
}

export const SCRIPT_LIBRARY: LibraryScript[] = STUDIO_TEMPLATES.map(fromTemplate);
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
