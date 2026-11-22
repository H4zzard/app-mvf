/**
 * Relatório de alterações do painel (JSON para revisão humana). Módulo PURO.
 * Inclui rascunhos e itens em revisão — diferente dos arquivos oficiais, que só
 * levam o que foi aprovado.
 */
import { STATUS_LABEL } from "../content/editorial.ts";
import { diffFields } from "./diff.ts";
import type { AdminContext, AdminState } from "./store.ts";

export function buildChangeReport(s: AdminState, ctx: AdminContext, generatedOn: string) {
  const item = <T extends object>(kind: string, d: { id: string; data: T; base: T | null; status: keyof typeof STATUS_LABEL }) => ({
    kind,
    id: d.id,
    status: d.status,
    statusLabel: STATUS_LABEL[d.status],
    isNew: d.base === null,
    changes: diffFields(d.base, d.data),
    after: d.data,
  });
  return {
    generatedOn,
    note: "Relatório do painel DEMONSTRATIVO. “Aprovado” e “Publicado localmente” não são aprovação nem publicação reais.",
    profile: s.profile,
    modules: Object.entries(s.moduleEdits).map(([id, edit]) => ({ id, edit, title: ctx.catalog.file.modules.find((m) => m.id === id)?.title ?? id })),
    lessons: Object.values(s.lessons).map((d) => item("aula", d)),
    removedLessons: s.removedLessons,
    products: Object.values(s.products).map((d) => item("produto", d)),
    scripts: Object.values(s.scripts).map((d) => item("roteiro", d)),
    log: s.log.map((l) => l.text),
  };
}
