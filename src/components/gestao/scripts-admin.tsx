"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { fillProduct } from "@/demo/studio-scripts";
import { productCatalog } from "@/lib/products";
import { buildAnimationPrompts, defaultAnimationBrief, exactDialogue } from "@/lib/studio/animation";
import { SCRIPT_FORMAT_LABEL, SCRIPT_LANGUAGE_LABEL, SCRIPT_LIMITS, estimateScriptSeconds, type ScriptFormat, type ScriptLanguage, type StudioScript } from "@/lib/studio/library";
import { blankScript, newScriptId } from "@/lib/admin/scripts-edit";
import { demoScripts } from "@/lib/admin/context";
import { presetGroups } from "@/lib/admin/overview";
import { profileCan } from "@/lib/admin/roles";
import type { EditorialStatus } from "@/lib/content/editorial";
import { useAdmin } from "./admin-provider";
import { AdminPageHeader, CheckboxInput, EditorSheet, FormSection, Issues, LinesInput, PreviewFrame, SelectInput, StatusActions, StatusBadge, TextArea, TextInput } from "./admin-ui";

type Tab = "equipe" | "exemplos" | "presets";
const PRESETS = presetGroups();

export function ScriptsAdminView() {
  const { state, ctx } = useAdmin();
  const [tab, setTab] = useState<Tab>("equipe");
  const [editing, setEditing] = useState<null | { id: string | null }>(null);
  const [preview, setPreview] = useState<StudioScript | null>(null);
  useLayoutEffect(
    () => () => {
      setEditing(null);
      setPreview(null);
    },
    [],
  );
  const canEdit = profileCan(state.profile, "content:edit");
  const team = useMemo(() => {
    const ids = new Set([...ctx.scriptsBase.map((s) => s.id), ...Object.keys(state.scripts)]);
    return [...ids].map((id) => {
      const d = state.scripts[id];
      const base = ctx.scriptsBase.find((s) => s.id === id);
      return { script: d?.data ?? base!, status: (d?.status ?? base?.status ?? "rascunho") as EditorialStatus };
    });
  }, [ctx, state.scripts]);

  return (
    <div>
      <AdminPageHeader
        title="Roteiros e presets"
        description="Biblioteca central do Estúdio IA. No Animador, aparecem só os roteiros da equipe aprovados e os exemplos do App MVF."
        actions={
          <Button onClick={() => setEditing({ id: null })} disabled={!canEdit}>
            <Plus aria-hidden className="size-4" /> Novo roteiro
          </Button>
        }
      />
      <p className="mb-4 rounded-xl bg-canvas p-3 text-sm text-muted">
        Só roteiros <strong className="font-semibold text-fg">próprios ou autorizados</strong> da equipe MVF. Não importe roteiros de terceiros (como os da referência MVM). O app não valida
        resultado comercial.
      </p>
      <div className="mb-5 max-w-lg">
        <Segmented
          label="Seções da biblioteca"
          value={tab}
          onChange={setTab}
          options={[
            { value: "equipe", label: "Da equipe", short: "Equipe", count: team.length },
            { value: "exemplos", label: "Exemplos", count: demoScripts.length },
            { value: "presets", label: "Presets" },
          ]}
        />
      </div>

      {tab === "equipe" ? (
        team.length ? (
          <ul className="space-y-2" aria-label="Roteiros da equipe">
            {team.map(({ script: s, status }) => (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1 basis-60">
                    <p className="font-semibold text-fg">{s.title || "(sem título)"}</p>
                    <p className="text-xs text-muted">
                      {s.category || "Sem categoria"} · {SCRIPT_FORMAT_LABEL[s.format]} · <code>{s.id}</code>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <StatusBadge status={status} />
                      {s.authorization.authorized ? <Badge tone="success">Uso autorizado</Badge> : <Badge tone="warning">Autorização pendente</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setEditing({ id: s.id })}>
                    <Pencil aria-hidden className="size-4" /> {canEdit ? "Editar" : "Ver"}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="p-6 text-center">
            <p className="font-serif text-lg font-semibold text-fg">Nenhum roteiro da equipe ainda</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">Crie um rascunho com um roteiro próprio da equipe MVF. Ele só vai para o Animador depois de aprovado e importado.</p>
            {canEdit ? (
              <Button className="mt-4" onClick={() => setEditing({ id: null })}>
                <Plus aria-hidden className="size-4" /> Novo roteiro
              </Button>
            ) : null}
          </Card>
        )
      ) : null}

      {tab === "exemplos" ? (
        <ul className="space-y-2" aria-label="Roteiros de exemplo">
          {demoScripts.map((s) => (
            <li key={s.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="font-semibold text-fg">{s.title}</p>
                  <p className="text-xs text-muted">
                    {s.category} · {s.summary}
                  </p>
                  <div className="mt-1">
                    <DemoBadge label="Exemplo MVF · só consulta" />
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setPreview(s)} aria-haspopup="dialog" aria-label={`Prévia de ${s.title}`}>
                  <Eye aria-hidden className="size-4" /> Prévia
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "presets" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Presets usados pelas ferramentas Criar Personagem e Animar Personagem, organizados por grupo. Nesta etapa são só para consulta: a edição de presets fica para depois, com
            a mesma estrutura (rótulo em português e trecho em inglês).
          </p>
          {PRESETS.map((g) => (
            <details key={g.id} className="rounded-2xl border border-line bg-card" open={g.id === "personagem"}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-fg [&::-webkit-details-marker]:hidden">
                {g.label}
                <span className="text-xs font-normal text-muted">{Object.values(g.lists).reduce((n, l) => n + l.length, 0)} opções</span>
              </summary>
              <div className="grid grid-cols-1 gap-4 border-t border-line p-4 md:grid-cols-2">
                {Object.entries(g.lists).map(([name, list]) => (
                  <div key={name} className="min-w-0">
                    <p className="text-sm font-semibold text-fg">{name}</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {list.map((o) => (
                        <li key={o.id} className="flex flex-wrap gap-x-2 rounded-lg bg-canvas px-2 py-1.5">
                          <span className="font-medium text-fg">{o.label}</span>
                          <span className="text-muted">“{o.en}”</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : null}

      {editing ? <ScriptEditor key={editing.id ?? "novo"} id={editing.id} onClose={() => setEditing(null)} /> : null}
      {preview ? (
        <EditorSheet title={preview.title} eyebrow="Exemplo do App MVF · consulta" dirty={false} onClose={() => setPreview(null)} footer={null}>
          <AnimatorPreview script={preview} />
        </EditorSheet>
      ) : null}
    </div>
  );
}

/** Como o roteiro aparece no Animador: item da biblioteca + fala final + takes (gerador real). */
function AnimatorPreview({ script }: { script: StudioScript }) {
  const product = script.productId ? productCatalog.get(script.productId) : undefined;
  const parts = fillProduct(script.parts, product?.name ?? "");
  const brief = { ...defaultAnimationBrief(), readyImage: true, parts, enabled: { hook: Boolean(parts.hook.trim()), body: Boolean(parts.body.trim()), cta: Boolean(parts.cta.trim()) } };
  const dialogue = exactDialogue(brief);
  const out = dialogue.trim() ? buildAnimationPrompts(brief) : null;
  return (
    <div className="space-y-4">
      <PreviewFrame label="Item na biblioteca do Animador">
        <div className="rounded-xl border border-line bg-card p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{script.origin === "equipe" ? "Roteiro da equipe" : "Exemplo MVF"}</Badge>
            <Badge tone="neutral">{script.category || "Categoria"}</Badge>
          </div>
          <p className="mt-1.5 font-semibold text-fg">{script.title || "Título do roteiro"}</p>
          <p className="text-xs text-muted">{script.summary}</p>
        </div>
      </PreviewFrame>
      <PreviewFrame label="Fala final e takes">
        {out ? (
          <div className="space-y-2 text-sm">
            <p className="whitespace-pre-wrap rounded-xl border border-line bg-card p-3 text-fg">{dialogue}</p>
            <p className="text-xs text-muted">
              {out.takes.length} take(s) de 8 s · cerca de {out.estimatedSeconds} s de fala{product ? ` · produto: ${product.name}` : ""}. A fala não é alterada.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Escreva a fala para ver os takes.</p>
        )}
      </PreviewFrame>
    </div>
  );
}

function ScriptEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state, dispatch, ctx, validate } = useAdmin();
  const canEdit = profileCan(state.profile, "content:edit");
  const taken = useMemo(() => new Set([...ctx.scriptsBase.map((s) => s.id), ...demoScripts.map((s) => s.id), ...Object.keys(state.scripts)]), [ctx, state.scripts]);
  const initial = useMemo<StudioScript>(() => (id ? (state.scripts[id]?.data ?? ctx.scriptsBase.find((s) => s.id === id)!) : blankScript("")), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<StudioScript>(initial);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const sid = form.id || newScriptId(form.title, taken);
  const script: StudioScript = { ...form, id: sid };
  const v = validate("roteiro", script) as { errors: string[]; missing: string[]; warnings?: string[] };
  const current = state.scripts[sid]?.data ?? ctx.scriptsBase.find((s) => s.id === sid) ?? null;
  const dirty = JSON.stringify(current) !== JSON.stringify(script);
  const set = <K extends keyof StudioScript>(k: K, val: StudioScript[K]) => {
    setForm((f) => ({ ...f, [k]: val }));
    setSavedMsg(null);
  };
  const setPart = (k: keyof StudioScript["parts"], t: string) => set("parts", { ...form.parts, [k]: t });
  const auto = estimateScriptSeconds(form.parts);

  return (
    <EditorSheet
      title={form.title || "Novo roteiro"}
      eyebrow={`ID ${sid}`}
      dirty={dirty && canEdit}
      onClose={onClose}
      footer={
        <Button
          disabled={!canEdit || !dirty || v.errors.length > 0}
          onClick={() => {
            dispatch({ type: "script/save", script });
            setForm(script);
            setSavedMsg("Salvo no rascunho desta sessão.");
          }}
        >
          Salvar rascunho
        </Button>
      }
    >
      <div className="space-y-4">
        {savedMsg ? (
          <p role="status" className="rounded-xl bg-success-soft p-3 text-sm font-medium text-success">
            {savedMsg}
          </p>
        ) : null}
        <Issues errors={v.errors} missing={v.missing} warnings={v.warnings} />

        <FormSection title="Identificação">
          <TextInput label="Título" required value={form.title} onChange={(t) => set("title", t)} max={SCRIPT_LIMITS.title} className="sm:col-span-2" />
          <TextInput label="Categoria" required value={form.category} onChange={(t) => set("category", t)} max={SCRIPT_LIMITS.category} placeholder="Ex.: Rotina, Unboxing" />
          <SelectInput label="Formato" value={form.format} onChange={(f) => set("format", f)} options={(Object.keys(SCRIPT_FORMAT_LABEL) as ScriptFormat[]).map((f) => ({ value: f, label: SCRIPT_FORMAT_LABEL[f] }))} />
          <SelectInput label="Idioma da fala" value={form.language} onChange={(l) => set("language", l)} options={(Object.keys(SCRIPT_LANGUAGE_LABEL) as ScriptLanguage[]).map((l) => ({ value: l, label: SCRIPT_LANGUAGE_LABEL[l] }))} />
          <TextInput
            label="Duração estimada (segundos)"
            type="number"
            value={form.estimatedSeconds === null ? "" : String(form.estimatedSeconds)}
            onChange={(t) => set("estimatedSeconds", t.trim() === "" ? null : Number(t))}
            hint={`Vazio = calcular pela fala (agora ≈ ${auto} s).`}
          />
          <TextArea label="Resumo" value={form.summary} onChange={(t) => set("summary", t)} max={SCRIPT_LIMITS.summary} rows={2} className="sm:col-span-2" />
          <LinesInput label="Tags" value={form.tags} onChange={(t) => set("tags", t)} />
          <SelectInput
            label="Produto relacionado"
            value={form.productId ?? ""}
            onChange={(p) => set("productId", p || null)}
            options={[{ value: "", label: "Nenhum" }, ...productCatalog.all().map((p) => ({ value: p.id, label: `${p.name}${p.origin === "demonstrativo" ? " (exemplo)" : ""}` }))]}
          />
        </FormSection>

        <FormSection title="Fala">
          <TextArea label="Gancho" value={form.parts.hook} onChange={(t) => setPart("hook", t)} rows={2} className="sm:col-span-2" hint="Use {produto} para o nome do produto." />
          <TextArea label="Desenvolvimento" value={form.parts.body} onChange={(t) => setPart("body", t)} rows={4} className="sm:col-span-2" />
          <TextArea label="CTA" value={form.parts.cta} onChange={(t) => setPart("cta", t)} rows={2} className="sm:col-span-2" />
        </FormSection>

        <FormSection title="Origem e autorização">
          <TextInput label="Origem do texto" value={form.authorization.source} onChange={(t) => set("authorization", { ...form.authorization, source: t })} max={SCRIPT_LIMITS.source} hint="Ex.: escrito pela equipe MVF em nov/2026." className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <CheckboxInput
              label="A equipe tem autorização para usar este texto"
              checked={form.authorization.authorized}
              onChange={(b) => set("authorization", { ...form.authorization, authorized: b })}
              hint="Obrigatório para aprovar. Roteiros de terceiros sem licença não podem entrar."
            />
          </div>
        </FormSection>

        <section aria-label="Fluxo editorial" className="rounded-2xl border border-line bg-card p-4">
          <StatusActions kind="roteiro" id={sid} />
        </section>

        <AnimatorPreview script={script} />
      </div>
    </EditorSheet>
  );
}
