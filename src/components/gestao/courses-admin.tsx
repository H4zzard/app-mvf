"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, BookOpen, Pencil, Plus, Replace, SearchX, Trash2 } from "lucide-react";
import { LessonPlayer } from "@/components/aulas/lesson-player";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchField } from "@/components/ui/chips";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import type { CatalogLesson, CatalogModule, ContentAvailability, LessonLevel, MediaRef, ProfileTag } from "@/types/catalog";
import { TAG_LABEL } from "@/lib/catalog/profile-tags";
import {
  AVAILABILITY_LABEL,
  LEVEL_LABEL,
  MEDIA_PROVIDER_LABEL,
  PROFILE_TAG_OPTIONS,
  applyModuleEdits,
  blankLesson,
  lessonImpact,
  newLessonId,
  previewCatalog,
} from "@/lib/admin/catalog-edit";
import { profileCan } from "@/lib/admin/roles";
import { isLocallyPublished, type EditorialStatus } from "@/lib/content/editorial";
import { cn } from "@/lib/cn";
import { useAdmin } from "./admin-provider";
import { AdminPageHeader, CheckboxInput, EditorSheet, FormSection, Issues, LinesInput, PreviewFrame, SelectInput, StatusActions, StatusBadge, TextArea, TextInput } from "./admin-ui";

type Tab = "modulos" | "aulas";
type Editing = null | { mode: "new" } | { mode: "edit"; id: string } | { mode: "replace"; demoId: string };
type OriginFilter = "todas" | "oficiais" | "rascunhos" | "exemplo";

const AVAIL_OPTS = (Object.keys(AVAILABILITY_LABEL) as ContentAvailability[]).map((v) => ({ value: v, label: AVAILABILITY_LABEL[v] }));
const LEVEL_OPTS = (Object.keys(LEVEL_LABEL) as LessonLevel[]).map((v) => ({ value: v, label: LEVEL_LABEL[v] }));

export function CoursesAdminView() {
  const { state, ctx } = useAdmin();
  const [tab, setTab] = useState<Tab>("modulos");
  const [editing, setEditing] = useState<Editing>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  useLayoutEffect(
    () => () => {
      setEditing(null);
      setModuleId(null);
    },
    [],
  );
  const canEdit = profileCan(state.profile, "content:edit");
  const modules = applyModuleEdits(ctx.catalog.file.modules, state.moduleEdits);

  return (
    <div>
      <AdminPageHeader
        title="Cursos e aulas"
        description={`${ctx.catalog.file.course.title}: ${ctx.catalog.file.rails.length} trilhos e ${modules.length} módulos oficiais. Edições ficam em rascunho nesta sessão.`}
        actions={
          <Button onClick={() => setEditing({ mode: "new" })} disabled={!canEdit} title={canEdit ? undefined : "O perfil simulado não edita conteúdo"}>
            <Plus aria-hidden className="size-4" /> Nova aula
          </Button>
        }
      />
      {!canEdit ? <p className="mb-4 rounded-xl bg-canvas p-3 text-sm text-muted">O perfil simulado não tem permissão para editar conteúdo. Troque o perfil no menu para editar.</p> : null}
      <div className="mb-5 max-w-md">
        <Segmented
          label="Seções de cursos"
          value={tab}
          onChange={setTab}
          options={[
            { value: "modulos", label: "Módulos", count: modules.length },
            { value: "aulas", label: "Aulas" },
          ]}
        />
      </div>
      {tab === "modulos" ? <ModulesPanel modules={modules} canEdit={canEdit} onOpen={setModuleId} /> : <LessonsPanel onEdit={(id) => setEditing({ mode: "edit", id })} onReplace={(demoId) => setEditing({ mode: "replace", demoId })} canEdit={canEdit} />}

      {editing ? <LessonEditor key={JSON.stringify(editing)} editing={editing} onClose={() => setEditing(null)} /> : null}
      {moduleId ? <ModuleEditor key={moduleId} id={moduleId} onClose={() => setModuleId(null)} /> : null}
    </div>
  );
}

/* --------------------------------- Módulos --------------------------------- */

function ModulesPanel({ modules, canEdit, onOpen }: { modules: CatalogModule[]; canEdit: boolean; onOpen: (id: string) => void }) {
  const { state, dispatch, ctx } = useAdmin();
  const counts = useLessonCounts();
  return (
    <div className="space-y-6">
      {[...ctx.catalog.file.rails]
        .sort((a, b) => a.order - b.order)
        .map((rail) => {
          const ms = modules.filter((m) => m.railId === rail.id).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
          return (
            <section key={rail.id} aria-labelledby={`rail-${rail.id}`}>
              <h2 id={`rail-${rail.id}`} className="font-serif text-lg font-semibold text-fg">
                {rail.title}
              </h2>
              <ul className="mt-2 space-y-2">
                {ms.map((m, i) => {
                  const c = counts[m.id] ?? { official: 0, demo: 0, drafts: 0 };
                  const edited = Boolean(state.moduleEdits[m.id]);
                  return (
                    <li key={m.id}>
                      <Card className={cn("flex items-center gap-3 p-2.5 pr-2 sm:p-3", edited && "border-brand/40")}>
                        <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-blush sm:h-20 sm:w-14">
                          <Image src={m.cover} alt="" fill sizes="56px" className="object-cover" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg">
                            {m.order}. {m.title}
                          </p>
                          <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted">
                            <span>{c.official} oficiais</span>·<span>{c.demo} de exemplo</span>
                            {c.drafts ? <span className="text-brand">· {c.drafts} em rascunho</span> : null}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {m.availability !== "disponivel" ? <Badge tone="neutral">{AVAILABILITY_LABEL[m.availability]}</Badge> : null}
                            {m.href ? <Badge tone="neutral">Área do app</Badge> : null}
                            {edited ? <Badge tone="brand">Editado</Badge> : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            disabled={!canEdit || i === 0}
                            onClick={() => dispatch({ type: "module/move", id: m.id, dir: -1 })}
                            aria-label={`Subir ${m.title}`}
                            className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg disabled:opacity-35"
                          >
                            <ArrowUp aria-hidden className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={!canEdit || i === ms.length - 1}
                            onClick={() => dispatch({ type: "module/move", id: m.id, dir: 1 })}
                            aria-label={`Descer ${m.title}`}
                            className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg disabled:opacity-35"
                          >
                            <ArrowDown aria-hidden className="size-4" />
                          </button>
                          <button type="button" onClick={() => onOpen(m.id)} aria-haspopup="dialog" aria-label={`Abrir ${m.title}`} className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg">
                            <Pencil aria-hidden className="size-4" />
                          </button>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

function useLessonCounts() {
  const { state, ctx } = useAdmin();
  return useMemo(() => {
    const out: Record<string, { official: number; demo: number; drafts: number }> = {};
    const add = (m: string, k: "official" | "demo" | "drafts") => ((out[m] ??= { official: 0, demo: 0, drafts: 0 })[k] += 1);
    const draftIds = new Set(Object.keys(state.lessons));
    for (const l of ctx.catalog.file.lessons) if (!state.removedLessons.includes(l.id)) add(l.moduleId, "official");
    const officialModules = new Set(ctx.catalog.file.lessons.map((l) => l.moduleId));
    for (const l of ctx.catalog.demo.lessons) if (!officialModules.has(l.moduleId) && !draftIds.has(l.id)) add(l.moduleId, "demo");
    for (const d of Object.values(state.lessons)) add(d.data.moduleId, "drafts");
    return out;
  }, [state.lessons, state.removedLessons, ctx]);
}

function ModuleEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, dispatch, ctx } = useAdmin();
  const base = applyModuleEdits(ctx.catalog.file.modules, state.moduleEdits).find((m) => m.id === id)!;
  const [tagline, setTagline] = useState(base.tagline);
  const [availability, setAvailability] = useState<ContentAvailability>(base.availability);
  const [tags, setTags] = useState<ProfileTag[]>(base.recommendedFor);
  const [saved, setSaved] = useState(false);
  const canEdit = profileCan(state.profile, "content:edit");
  const dirty = tagline !== base.tagline || availability !== base.availability || JSON.stringify(tags) !== JSON.stringify(base.recommendedFor);
  const lessons = [...ctx.catalog.file.lessons.filter((l) => !state.removedLessons.includes(l.id) && !state.lessons[l.id]), ...Object.values(state.lessons).filter((d) => isLocallyPublished(d.status)).map((d) => d.data)];
  const preview = previewCatalog(ctx.catalog, state.moduleEdits, lessons);
  const visible = preview.lessonsOfModule(id);
  const error = tagline.length > 160 ? "Use até 160 caracteres." : undefined;

  return (
    <EditorSheet
      title={base.title}
      eyebrow={`Módulo ${base.order} · ${ctx.catalog.file.rails.find((r) => r.id === base.railId)?.title ?? ""}`}
      dirty={dirty}
      onClose={onClose}
      footer={
        <Button
          disabled={!canEdit || !dirty || Boolean(error)}
          onClick={() => {
            dispatch({ type: "module/edit", id, patch: { tagline, availability, recommendedFor: tags } });
            setSaved(true);
          }}
        >
          Salvar no rascunho
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-4">
          <span className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl bg-blush">
            <Image src={base.cover} alt={`Capa oficial do módulo ${base.title}`} fill sizes="96px" className="object-cover" />
          </span>
          <div className="min-w-0 text-sm text-muted">
            <p>
              ID estável: <code className="text-fg">{base.id}</code>
            </p>
            <p className="mt-1">Capa oficial (não editável aqui). Título e trilho vêm do arquivo oficial.</p>
            <p className="mt-1">{base.origin === "oficial" ? "Módulo oficial." : "Módulo de exemplo."}</p>
          </div>
        </div>
        <TextInput label="Frase de apoio" value={tagline} onChange={(v) => (setTagline(v), setSaved(false))} max={160} error={error} />
        <SelectInput label="Disponibilidade" value={availability} onChange={(v) => (setAvailability(v), setSaved(false))} options={AVAIL_OPTS} hint="“Oculta” não aparece para as alunas." />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-fg">Recomendado para (perfil do onboarding)</legend>
          <div className="flex flex-wrap gap-1.5">
            {PROFILE_TAG_OPTIONS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => (setTags((x) => (on ? x.filter((y) => y !== t) : [...x, t])), setSaved(false))}
                  className={cn("min-h-9 rounded-full border px-3 text-xs font-medium", on ? "border-brand bg-brand text-white" : "border-line bg-card text-fg hover:border-brand/30")}
                >
                  {TAG_LABEL[t] ?? t}
                </button>
              );
            })}
          </div>
        </fieldset>
        {saved && !dirty ? (
          <p role="status" className="text-sm font-medium text-success">
            Salvo no rascunho desta sessão.
          </p>
        ) : null}
        <PreviewFrame label="Aulas que a aluna veria neste módulo">
          {visible.length ? (
            <ul className="space-y-1.5">
              {visible.map((l) => (
                <li key={l.id} className="flex items-center gap-2 rounded-xl bg-card p-2.5 text-sm">
                  <BookOpen aria-hidden className="size-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1 truncate">{l.title}</span>
                  {l.origin === "demonstrativo" ? <DemoBadge label="Exemplo" /> : <Badge tone="brand">Oficial</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhuma aula: a aluna vê “Em breve”.</p>
          )}
        </PreviewFrame>
      </div>
    </EditorSheet>
  );
}

/* ---------------------------------- Aulas ---------------------------------- */

interface Row {
  lesson: CatalogLesson;
  kind: "oficial" | "rascunho" | "exemplo";
  status: EditorialStatus | null;
  replacedByDraft?: boolean;
}

function LessonsPanel({ onEdit, onReplace, canEdit }: { onEdit: (id: string) => void; onReplace: (demoId: string) => void; canEdit: boolean }) {
  const { state, ctx } = useAdmin();
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("todos");
  const [origin, setOrigin] = useState<OriginFilter>("todas");
  const modules = applyModuleEdits(ctx.catalog.file.modules, state.moduleEdits);
  const modTitle = (id: string) => modules.find((m) => m.id === id)?.title ?? id;

  const rows: Row[] = useMemo(() => {
    const drafts = Object.values(state.lessons);
    const draftIds = new Set(drafts.map((d) => d.id));
    const official: Row[] = ctx.catalog.file.lessons.filter((l) => !draftIds.has(l.id) && !state.removedLessons.includes(l.id)).map((l) => ({ lesson: l, kind: "oficial", status: null }));
    const draftRows: Row[] = drafts.map((d) => ({ lesson: d.data, kind: "rascunho", status: d.status }));
    const demo: Row[] = ctx.catalog.demo.lessons.map((l) => ({ lesson: l, kind: "exemplo", status: null, replacedByDraft: draftIds.has(l.id) }));
    return [...draftRows, ...official, ...demo];
  }, [state.lessons, state.removedLessons, ctx]);

  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  const terms = norm(query).split(/\s+/).filter(Boolean);
  const shown = rows.filter(
    (r) =>
      (moduleFilter === "todos" || r.lesson.moduleId === moduleFilter) &&
      (origin === "todas" || (origin === "oficiais" && r.kind === "oficial") || (origin === "rascunhos" && r.kind === "rascunho") || (origin === "exemplo" && r.kind === "exemplo")) &&
      terms.every((t) => norm(`${r.lesson.title} ${r.lesson.id} ${modTitle(r.lesson.moduleId)}`).includes(t)),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem_12rem]">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar aula, ID ou módulo" label="Buscar aulas" />
        <SelectInput label="Módulo" value={moduleFilter} onChange={setModuleFilter} options={[{ value: "todos", label: "Todos os módulos" }, ...modules.map((m) => ({ value: m.id, label: m.title }))]} className="[&>label]:sr-only" />
        <SelectInput
          label="Origem"
          value={origin}
          onChange={setOrigin}
          options={[
            { value: "todas", label: "Todas as origens" },
            { value: "rascunhos", label: "Rascunhos da sessão" },
            { value: "oficiais", label: "Oficiais (arquivo)" },
            { value: "exemplo", label: "Exemplos" },
          ]}
          className="[&>label]:sr-only"
        />
      </div>
      <p className="text-xs text-muted">
        {ctx.catalog.file.lessons.length === 0 ? "O arquivo oficial ainda não tem aulas. " : ""}As aulas de exemplo ficam só para consulta; use “Substituir por aula oficial” para cadastrar a versão
        oficial com o MESMO ID (o progresso e as tarefas do plano continuam valendo).
      </p>
      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhuma aula encontrada" description="Tente outra busca ou outro filtro." />
      ) : (
        <ul className="space-y-2" aria-label="Aulas">
          {shown.map((r) => (
            <li key={`${r.kind}-${r.lesson.id}`}>
              <Card className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="text-sm font-semibold text-fg">{r.lesson.title || "(sem título)"}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {modTitle(r.lesson.moduleId)} · ordem {r.lesson.order} · <code>{r.lesson.id}</code>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.kind === "exemplo" ? <DemoBadge label={r.replacedByDraft ? "Exemplo · substituição em rascunho" : "Exemplo"} /> : <StatusBadge status={r.status} />}
                    <Badge tone="neutral">{AVAILABILITY_LABEL[r.lesson.availability]}</Badge>
                    {r.lesson.media.kind === "none" ? <Badge tone="neutral">Sem vídeo</Badge> : null}
                  </div>
                </div>
                {r.kind === "exemplo" ? (
                  <Button size="sm" variant="secondary" disabled={!canEdit || r.replacedByDraft} onClick={() => onReplace(r.lesson.id)} className="whitespace-normal! leading-tight">
                    <Replace aria-hidden className="size-4 shrink-0" /> Substituir por aula oficial
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => onEdit(r.lesson.id)}>
                    <Pencil aria-hidden className="size-4" /> {canEdit ? "Editar" : "Ver"}
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function mediaKey(m: MediaRef): "none" | "externo" | "proprio" {
  return m.kind;
}

function LessonEditor({ editing, onClose }: { editing: Exclude<Editing, null>; onClose: () => void }) {
  const { state, dispatch, ctx, validate } = useAdmin();
  const canEdit = profileCan(state.profile, "content:edit");
  const modules = applyModuleEdits(ctx.catalog.file.modules, state.moduleEdits);
  const taken = useMemo(
    () => new Set([...ctx.catalog.file.lessons.map((l) => l.id), ...ctx.catalog.demo.lessons.map((l) => l.id), ...Object.keys(state.lessons), ...Object.keys(ctx.catalog.file.lessonAliases)]),
    [ctx, state.lessons],
  );

  const initial: CatalogLesson = useMemo(() => {
    if (editing.mode === "edit") return state.lessons[editing.id]?.data ?? ctx.catalog.file.lessons.find((l) => l.id === editing.id)!;
    if (editing.mode === "replace") {
      const d = ctx.catalog.demo.lessons.find((l) => l.id === editing.demoId)!;
      // Substituição: mesmo ID e módulo; conteúdo em branco (nada é copiado do exemplo).
      return blankLesson(d.id, d.moduleId, d.order);
    }
    return blankLesson("", modules[0]?.id ?? "", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [form, setForm] = useState<CatalogLesson>(initial);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isNew = editing.mode === "new" && !state.lessons[form.id];
  const id = editing.mode === "new" && !form.id ? newLessonId(form.title, taken) : form.id;
  const lesson: CatalogLesson = { ...form, id };
  const current = state.lessons[id]?.data ?? ctx.catalog.file.lessons.find((l) => l.id === id) ?? null;
  const dirty = JSON.stringify(current ?? initial) !== JSON.stringify(lesson) || (editing.mode !== "edit" && !state.lessons[id]);
  const v = validate("aula", lesson);
  const set = <K extends keyof CatalogLesson>(k: K, val: CatalogLesson[K]) => {
    setForm((f) => ({ ...f, [k]: val }));
    setSavedMsg(null);
  };
  const officialMaterials = ctx.catalog.file.materials;
  const prereqOptions = [...ctx.catalog.file.lessons, ...Object.values(state.lessons).map((d) => d.data)].filter((l) => l.id !== id);
  const exists = Boolean(state.lessons[id]) || ctx.catalog.file.lessons.some((l) => l.id === id);
  const impact = exists ? lessonImpact(id, ctx.catalog, Object.values(state.lessons).map((d) => d.data)) : [];
  const mod = modules.find((m) => m.id === lesson.moduleId);
  const isReplacement = ctx.catalog.demo.lessons.some((d) => d.id === id);

  function save() {
    if (v.errors.length) return;
    dispatch({ type: "lesson/save", lesson });
    setForm(lesson);
    setSavedMsg("Salvo no rascunho desta sessão.");
  }

  return (
    <EditorSheet
      title={editing.mode === "replace" && !state.lessons[id] ? "Substituir aula de exemplo" : isNew ? "Nova aula" : lesson.title || "Aula"}
      eyebrow={`ID ${id || "(gerado pelo título)"}`}
      dirty={dirty && canEdit}
      onClose={onClose}
      footer={
        <>
          {exists && canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
              <Trash2 aria-hidden className="size-4" /> {ctx.catalog.file.lessons.some((l) => l.id === id) ? "Remover do arquivo" : "Descartar aula"}
            </Button>
          ) : null}
          <Button onClick={save} disabled={!canEdit || v.errors.length > 0 || !dirty}>
            Salvar rascunho
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isReplacement ? (
          <p className="rounded-xl bg-canvas p-3 text-xs text-muted">
            Esta aula oficial usa o mesmo ID da aula de exemplo <code>{id}</code>. Quando for importada, a oficial aparece no lugar do exemplo, e o progresso e as tarefas do plano continuam valendo.
            Nada do texto de exemplo foi copiado.
          </p>
        ) : null}
        {savedMsg ? (
          <p role="status" className="rounded-xl bg-success-soft p-3 text-sm font-medium text-success">
            {savedMsg}
          </p>
        ) : null}
        {confirmRemove ? (
          <div role="alertdialog" aria-labelledby="rm-title" className="space-y-2 rounded-xl border border-brand/30 bg-blush/40 p-3">
            <p id="rm-title" className="text-sm font-semibold text-fg">
              {impact.length ? "Esta aula é usada em outros lugares:" : "Remover esta aula?"}
            </p>
            {impact.length ? (
              <ul className="list-disc pl-5 text-sm text-fg">
                {impact.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setConfirmRemove(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  dispatch({ type: "lesson/remove", id, confirmed: true });
                  onClose();
                }}
              >
                {impact.length ? "Entendi o impacto, remover" : "Remover"}
              </Button>
            </div>
          </div>
        ) : null}

        <Issues errors={v.errors} missing={v.missing} warnings={"warnings" in v ? (v.warnings ?? []) : []} />

        <FormSection title="Identificação">
          <TextInput label="Título da aula" required value={form.title} onChange={(t) => set("title", t)} max={160} className="sm:col-span-2" />
          <SelectInput label="Módulo" value={form.moduleId} onChange={(m) => set("moduleId", m)} options={modules.map((m) => ({ value: m.id, label: m.title }))} />
          <TextInput label="Ordem no módulo" type="number" value={String(form.order)} onChange={(o) => set("order", Number(o) || 0)} hint="1 = primeira aula do módulo." />
          <SelectInput label="Nível" value={form.level} onChange={(l) => set("level", l)} options={LEVEL_OPTS} />
          <SelectInput label="Disponibilidade" value={form.availability} onChange={(a) => set("availability", a)} options={AVAIL_OPTS} />
        </FormSection>

        <FormSection title="Conteúdo">
          <TextArea label="Descrição (resumo)" value={form.summary} onChange={(t) => set("summary", t)} max={1000} rows={3} className="sm:col-span-2" />
          <TextArea label="Prática depois da aula" value={form.practice} onChange={(t) => set("practice", t)} max={600} rows={2} className="sm:col-span-2" />
          <TextInput
            label="Duração (minutos)"
            type="number"
            value={form.durationMinutes === null ? "" : String(form.durationMinutes)}
            onChange={(d) => set("durationMinutes", d.trim() === "" ? null : Number(d))}
            hint="Deixe vazio se ainda não souber."
          />
          <LinesInput label="Tags" value={form.tags} onChange={(t) => set("tags", t)} />
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold text-fg">Pré-requisitos (aulas oficiais)</legend>
            {prereqOptions.length ? (
              <div className="space-y-2">
                {prereqOptions.map((p) => (
                  <CheckboxInput key={p.id} label={p.title || p.id} checked={form.prerequisites.includes(p.id)} onChange={(on) => set("prerequisites", on ? [...form.prerequisites, p.id] : form.prerequisites.filter((x) => x !== p.id))} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">Nenhuma outra aula oficial para escolher.</p>
            )}
          </fieldset>
        </FormSection>

        <FormSection title="Vídeo (por referência)">
          <SelectInput
            label="Tipo"
            value={mediaKey(form.media)}
            onChange={(k) => set("media", k === "none" ? { kind: "none" } : k === "proprio" ? { kind: "proprio", assetId: "" } : { kind: "externo", provider: "kiwify", ref: "" })}
            options={[
              { value: "none", label: "Sem vídeo ainda" },
              { value: "externo", label: "Serviço externo (Kiwify, YouTube, Vimeo)" },
              { value: "proprio", label: "Arquivo próprio" },
            ]}
            hint="Nunca cole URL privada: só o identificador. A URL é resolvida no servidor, para quem tem acesso."
            className="sm:col-span-2"
          />
          {form.media.kind === "externo" ? (
            <>
              <SelectInput
                label="Serviço"
                value={form.media.provider}
                onChange={(p) => set("media", { kind: "externo", provider: p, ref: form.media.kind === "externo" ? form.media.ref : "" })}
                options={(Object.keys(MEDIA_PROVIDER_LABEL) as (keyof typeof MEDIA_PROVIDER_LABEL)[]).map((p) => ({ value: p, label: MEDIA_PROVIDER_LABEL[p] }))}
              />
              <TextInput label="Identificador do vídeo" value={form.media.ref} onChange={(r) => set("media", { ...(form.media as Extract<MediaRef, { kind: "externo" }>), ref: r })} placeholder="Ex.: ID da aula no serviço" />
            </>
          ) : null}
          {form.media.kind === "proprio" ? <TextInput label="Identificador do arquivo" value={form.media.assetId} onChange={(r) => set("media", { kind: "proprio", assetId: r })} className="sm:col-span-2" /> : null}
        </FormSection>

        <FormSection title="Materiais" defaultOpen={false}>
          {officialMaterials.length ? (
            officialMaterials.map((m) => (
              <CheckboxInput key={m.id} label={m.title} checked={form.materialIds.includes(m.id)} onChange={(on) => set("materialIds", on ? [...form.materialIds, m.id] : form.materialIds.filter((x) => x !== m.id))} />
            ))
          ) : (
            <p className="text-sm text-muted sm:col-span-2">Nenhum material oficial cadastrado ainda. Materiais de exemplo não podem ser vinculados a aulas oficiais.</p>
          )}
        </FormSection>

        <section aria-label="Fluxo editorial" className="rounded-2xl border border-line bg-card p-4">
          <StatusActions kind="aula" id={id} />
        </section>

        <PreviewFrame label="Como a aluna veria">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {mod ? (
                <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-blush">
                  <Image src={mod.cover} alt="" fill sizes="48px" className="object-cover" />
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="text-xs text-muted">{mod?.title}</p>
                <p className="font-serif text-lg font-semibold leading-tight text-fg">{lesson.title || "Título da aula"}</p>
                <p className="text-xs text-muted">
                  {lesson.durationMinutes ? `${lesson.durationMinutes} min` : "Duração a definir"} · {LEVEL_LABEL[lesson.level]}
                </p>
              </div>
            </div>
            <LessonPlayer media={lesson.media} availability={lesson.availability} cover={mod?.cover ?? "/area-membros/primeiros-passos.png"} title={lesson.title || "Aula"} />
            {lesson.summary ? <p className="text-sm text-fg">{lesson.summary}</p> : null}
          </div>
        </PreviewFrame>
      </div>
    </EditorSheet>
  );
}
