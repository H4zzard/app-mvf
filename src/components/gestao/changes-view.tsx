"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Download, FileJson, FileSpreadsheet, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_LABEL } from "@/lib/content/editorial";
import { buildCatalogExport, lessonsToCsv } from "@/lib/admin/catalog-edit";
import { buildProductsExport, productsToCsv } from "@/lib/admin/products-edit";
import { buildScriptsExport } from "@/lib/admin/scripts-edit";
import { buildChangeReport } from "@/lib/admin/report";
import { productsBase } from "@/lib/admin/context";
import { diffFields, type FieldChange } from "@/lib/admin/diff";
import { useAdmin } from "./admin-provider";
import { AdminPageHeader, StatusBadge, downloadFile } from "./admin-ui";

const today = () => new Date().toISOString().slice(0, 10);

export function ChangesView() {
  const { state, dispatch, ctx, pending } = useAdmin();
  const [done, setDone] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const catalogExp = buildCatalogExport(ctx.catalog, state.moduleEdits, Object.values(state.lessons).map((d) => ({ lesson: d.data, status: d.status })), state.removedLessons);
  const productsExp = buildProductsExport(productsBase, Object.values(state.products).map((d) => ({ product: d.data, status: d.status })), today());
  const scriptsExp = buildScriptsExport(ctx.scriptsBase, Object.values(state.scripts).map((d) => ({ script: d.data, status: d.status })), today(), ctx.productExists);
  const catalogTouched = Object.keys(state.moduleEdits).length + Object.keys(state.lessons).length + state.removedLessons.length > 0;

  const download = (name: string, content: string, type: string) => {
    downloadFile(name, content, type);
    setDone(`Arquivo “${name}” gerado e baixado. Nada foi gravado no projeto: revise e importe pelo procedimento abaixo.`);
  };

  if (!pending) {
    return (
      <div>
        <AdminPageHeader title="Revisar e exportar" description="Alterações desta sessão, validação e exportação para revisão." />
        <EmptyState icon={CircleCheck} title="Nenhuma alteração pendente" description="Edite aulas, módulos, produtos ou roteiros. As mudanças aparecem aqui para revisar e exportar." />
        <ImportGuide />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Revisar e exportar"
        description={`${pending} alteração(ões) pendente(s) em memória. Exportar gera arquivos para revisão; nada é gravado nos arquivos do projeto nem no banco.`}
      />
      {done ? (
        <p role="status" className="mb-4 rounded-xl bg-success-soft p-3 text-sm text-success">
          {done}
        </p>
      ) : null}

      <div className="space-y-5">
        {catalogTouched ? (
          <Card className="p-4 sm:p-5" aria-labelledby="ch-cat">
            <h2 id="ch-cat" className="font-semibold text-fg">
              Cursos e aulas
            </h2>
            <ul className="mt-3 space-y-3">
              {Object.entries(state.moduleEdits).map(([id, edit]) => {
                const base = ctx.catalog.file.modules.find((m) => m.id === id)!;
                return <ChangeItem key={id} title={`Módulo: ${base.title}`} changes={diffFields(pick(base, Object.keys(edit)), edit, LABELS)} />;
              })}
              {Object.values(state.lessons).map((d) => (
                <ChangeItem
                  key={d.id}
                  title={`Aula: ${d.data.title || d.id}`}
                  status={d.status}
                  note={d.status === "aprovado" || d.status === "publicado_local" ? "Entra no arquivo exportado." : "Não entra no arquivo oficial até ser aprovada."}
                  changes={diffFields(d.base, d.data, LABELS)}
                  onDiscard={() => dispatch({ type: "draft/discard", kind: "aula", id: d.id })}
                />
              ))}
              {state.removedLessons.map((id) => (
                <li key={id} className="rounded-xl border border-line p-3 text-sm">
                  Aula <code>{id}</code> será removida do arquivo oficial.
                </li>
              ))}
            </ul>
            <ExportBox
              ok={catalogExp.ok}
              errors={catalogExp.errors}
              summary={`${catalogExp.included.length} aula(s) aprovada(s) entram · ${catalogExp.excluded.length} ainda em rascunho/revisão ficam de fora.`}
              actions={[
                { label: "catalogo-oficial.json", icon: FileJson, onClick: () => download("catalogo-oficial.json", JSON.stringify(catalogExp.file, null, 2) + "\n", "application/json") },
                {
                  label: "aulas-aprovadas.csv",
                  icon: FileSpreadsheet,
                  disabled: catalogExp.included.length === 0,
                  onClick: () => download("aulas-aprovadas.csv", lessonsToCsv(Object.values(state.lessons).filter((d) => catalogExp.included.includes(d.id)).map((d) => d.data)), "text/csv"),
                },
              ]}
            />
          </Card>
        ) : null}

        {Object.keys(state.products).length ? (
          <Card className="p-4 sm:p-5" aria-labelledby="ch-prod">
            <h2 id="ch-prod" className="font-semibold text-fg">
              Produtos NUMI
            </h2>
            <ul className="mt-3 space-y-3">
              {Object.values(state.products).map((d) => (
                <ChangeItem
                  key={d.id}
                  title={`Produto: ${d.data.name || d.id}`}
                  status={d.status}
                  note={d.status === "arquivado" ? "Arquivado: não altera o arquivo." : `Exportado com approval “${d.status === "aprovado" || d.status === "publicado_local" ? "aprovado" : d.status === "em_revisao" ? "em_revisao" : "rascunho"}”.`}
                  changes={diffFields(d.base, d.data, LABELS)}
                  onDiscard={() => dispatch({ type: "draft/discard", kind: "produto", id: d.id })}
                />
              ))}
            </ul>
            <ExportBox
              ok={productsExp.ok}
              errors={productsExp.errors}
              summary="Arquivo completo dos produtos oficiais, validado pelo mesmo schema do Marketplace."
              actions={[
                { label: "produtos-oficiais.json", icon: FileJson, onClick: () => download("produtos-oficiais.json", JSON.stringify(productsExp.file, null, 2) + "\n", "application/json") },
                { label: "produtos.csv", icon: FileSpreadsheet, onClick: () => download("produtos.csv", productsToCsv(productsExp.file?.products ?? []), "text/csv") },
              ]}
            />
          </Card>
        ) : null}

        {Object.keys(state.scripts).length ? (
          <Card className="p-4 sm:p-5" aria-labelledby="ch-rot">
            <h2 id="ch-rot" className="font-semibold text-fg">
              Roteiros
            </h2>
            <ul className="mt-3 space-y-3">
              {Object.values(state.scripts).map((d) => (
                <ChangeItem
                  key={d.id}
                  title={`Roteiro: ${d.data.title || d.id}`}
                  status={d.status}
                  note="No Animador, só aparece com status “aprovado” no arquivo."
                  changes={diffFields(d.base, d.data, LABELS)}
                  onDiscard={() => dispatch({ type: "draft/discard", kind: "roteiro", id: d.id })}
                />
              ))}
            </ul>
            <ExportBox
              ok={scriptsExp.ok}
              errors={scriptsExp.errors}
              summary="Arquivo completo dos roteiros da equipe (todos os status)."
              actions={[{ label: "roteiros-oficiais.json", icon: FileJson, onClick: () => download("roteiros-oficiais.json", JSON.stringify(scriptsExp.file, null, 2) + "\n", "application/json") }]}
            />
          </Card>
        ) : null}

        <Card className="p-4 sm:p-5">
          <h2 className="font-semibold text-fg">Relatório para revisão</h2>
          <p className="mt-1 text-sm text-muted">Todas as alterações (inclusive rascunhos), com antes e depois, para a equipe revisar.</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => download(`alteracoes-painel-${today()}.json`, JSON.stringify(buildChangeReport(state, ctx, today()), null, 2) + "\n", "application/json")}
          >
            <Download aria-hidden className="size-4" /> Baixar relatório (JSON)
          </Button>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="font-semibold text-fg">Descartar tudo</h2>
          {confirmReset ? (
            <div role="alertdialog" aria-labelledby="reset-q" className="mt-2 space-y-2">
              <p id="reset-q" className="text-sm text-fg">
                Descartar as {pending} alterações desta sessão? Não dá para desfazer.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setConfirmReset(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    dispatch({ type: "reset" });
                    setConfirmReset(false);
                    setDone(null);
                  }}
                >
                  Descartar tudo
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="mt-2" onClick={() => setConfirmReset(true)}>
              <RotateCcw aria-hidden className="size-4" /> Descartar todas as alterações
            </Button>
          )}
        </Card>

        <ImportGuide />
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  id: "ID",
  origin: "Origem",
  format: "Formato",
  language: "Idioma",
  status: "Status no arquivo",
  brand: "Marca",
  isNew: "Novidade",
  contentTags: "Tags de conteúdo",
  formats: "Formatos",
  lessonIds: "Aulas relacionadas",
  approval: "Aprovação",
  summaryText: "Resumo",
  title: "Título",
  name: "Nome",
  moduleId: "Módulo",
  order: "Ordem",
  durationMinutes: "Duração",
  level: "Nível",
  tags: "Tags",
  prerequisites: "Pré-requisitos",
  summary: "Resumo",
  practice: "Prática",
  media: "Vídeo",
  materialIds: "Materiais",
  availability: "Disponibilidade",
  tagline: "Frase de apoio",
  recommendedFor: "Recomendado para",
  description: "Descrição",
  shortDescription: "Descrição curta",
  howToUse: "Modo de uso",
  characteristics: "Características",
  approvedBenefits: "Benefícios aprovados",
  restrictions: "Restrições",
  price: "Preço",
  commission: "Comissão",
  affiliation: "Afiliação",
  productUrl: "Link do produto",
  images: "Imagens",
  parts: "Fala",
  category: "Categoria",
  authorization: "Autorização",
  productId: "Produto relacionado",
  estimatedSeconds: "Duração estimada",
};

function pick<T extends object>(o: T, keys: string[]): Partial<T> {
  return Object.fromEntries(keys.map((k) => [k, (o as Record<string, unknown>)[k]])) as Partial<T>;
}

function ChangeItem({ title, status, note, changes, onDiscard }: { title: string; status?: Parameters<typeof StatusBadge>[0]["status"]; note?: string; changes: FieldChange[]; onDiscard?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-fg">{title}</p>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
      {changes.length ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="text-subtle">
              <tr>
                <th className="py-1 pr-2 font-medium">Campo</th>
                <th className="py-1 pr-2 font-medium">Antes</th>
                <th className="py-1 font-medium">Depois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {changes.map((c) => (
                <tr key={c.field}>
                  <td className="py-1.5 pr-2 font-medium text-fg">{c.field}</td>
                  <td className="max-w-[14rem] break-words py-1.5 pr-2 text-muted">{c.before.length > 160 ? `${c.before.slice(0, 157)}…` : c.before}</td>
                  <td className="max-w-[14rem] break-words py-1.5 text-fg">{c.after.length > 160 ? `${c.after.slice(0, 157)}…` : c.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted">Só mudança de status.</p>
      )}
      {onDiscard ? (
        confirm ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg">Descartar estas alterações?</span>
            <Button size="sm" variant="secondary" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onDiscard}>
              Descartar
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="mt-1" onClick={() => setConfirm(true)}>
            Descartar alterações
          </Button>
        )
      ) : null}
    </li>
  );
}

function ExportBox({ ok, errors, summary, actions }: { ok: boolean; errors: string[]; summary: string; actions: { label: string; icon: typeof FileJson; onClick: () => void; disabled?: boolean }[] }) {
  return (
    <div className="mt-4 rounded-xl bg-canvas p-3">
      {ok ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CircleCheck aria-hidden className="size-4" /> Validado com as regras do arquivo oficial.
        </p>
      ) : (
        <div className="text-sm">
          <p className="flex items-center gap-2 font-medium text-brand">
            <CircleAlert aria-hidden className="size-4" /> A exportação não passou na validação:
          </p>
          <ul className="mt-1 list-disc pl-5 text-fg">
            {errors.slice(0, 6).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-1 text-xs text-muted">{summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.label} size="sm" variant="secondary" disabled={!ok || a.disabled} onClick={a.onClick}>
            <a.icon aria-hidden className="size-4" /> {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ImportGuide() {
  return (
    <Card className="mt-5 p-4 sm:p-5" aria-labelledby="imp">
      <h2 id="imp" className="font-semibold text-fg">
        Como importar (feito por quem cuida do projeto)
      </h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-fg">
        <li>Revise o arquivo exportado e o relatório com a equipe.</li>
        <li>
          Aulas: <code className="text-xs">npm run catalog -- check arquivo.json</code> ou <code className="text-xs">npm run catalog -- import-csv aulas.csv</code> (prévia).
        </li>
        <li>
          Produtos: <code className="text-xs">npm run products -- check arquivo.json</code> ou <code className="text-xs">npm run products -- import produtos.csv</code> (prévia).
        </li>
        <li>
          Roteiros: copie para <code className="text-xs">src/content/roteiros-oficiais.json</code> e rode <code className="text-xs">npm test</code>.
        </li>
        <li>
          Só depois da revisão, grave com <code className="text-xs">--write</code> e rode <code className="text-xs">npm test</code> e <code className="text-xs">npm run build</code>.
        </li>
      </ol>
      <p className="mt-2 text-xs text-muted">O painel nunca executa a importação nem grava arquivos. Status: {Object.values(STATUS_LABEL).join(" · ")}.</p>
      <Badge tone="neutral">Detalhes em docs/PAINEL_ADMIN.md</Badge>
    </Card>
  );
}
