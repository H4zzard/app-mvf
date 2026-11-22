"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  ClipboardList,
  Clock,
  FileText,
  ListChecks,
  NotebookPen,
  Route,
  Signal,
} from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { usePlan } from "@/components/plan/plan-provider";
import { LEVEL_LABEL, ModuleCard, ModuleSheet, Rail, formatDuration, lessonsOfModule } from "@/components/aulas/catalog-parts";
import { LessonPlayer } from "@/components/aulas/lesson-player";
import { DemoBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MEMBER_ASSETS, getModule, moduleOfLesson, modulesOfRail } from "@/demo/member-area";
import { catalog } from "@/lib/catalog";
import type { MaterialKind } from "@/types/catalog";
import { getStatus } from "@/lib/plan";
import { cn } from "@/lib/cn";

const MATERIAL_ICON: Record<MaterialKind, typeof FileText> = {
  checklist: ListChecks,
  modelo: ClipboardList,
  guia: FileText,
};

/**
 * Página da aula (dados do CATÁLOGO: oficial ou de exemplo, sempre identificado).
 * O player decide o estado pela referência de mídia (sem URL privada); sem vídeo,
 * mostra estado profissional — nunca uma mídia fictícia.
 * Marcar como concluída também atualiza a tarefa correspondente do plano
 * (comparando IDs já resolvidos pelos aliases de compatibilidade).
 */
export function LessonDetail({ lessonId }: { lessonId: string }) {
  const { isLessonDone, setLessonDone } = useDemo();
  const { plan, statusMap } = usePlan();
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  useLayoutEffect(() => () => setOpenModuleId(null), []);

  const lesson = catalog.getLesson(lessonId);
  if (!lesson) return null;

  const done = isLessonDone(lesson.id);
  const planTask = plan?.tasks.find((t) => t.lessonId && catalog.resolveLessonId(t.lessonId) === lesson.id);
  const mod = moduleOfLesson(lesson.id);
  const cover = mod?.cover ?? MEMBER_ASSETS.banner;
  const trail = mod ? lessonsOfModule(mod) : [lesson];
  const index = trail.findIndex((l) => l.id === lesson.id);
  const materials = catalog.materials().filter((m) => lesson.materialIds.includes(m.id));
  const isDemo = lesson.origin === "demonstrativo";
  const canComplete = lesson.availability === "disponivel";

  // Próxima aula: a seguinte na ordem do catálogo (no módulo, depois no próximo módulo com aulas).
  const next = catalog.nextInTrail(lesson.id);

  const related = mod ? modulesOfRail(mod.railId).filter((m) => m.id !== mod.id) : [];
  const progressOf = (id: string) => {
    const m = getModule(id);
    return { total: m?.lessonIds.length ?? 0, done: m ? m.lessonIds.filter((x) => isLessonDone(x)).length : 0 };
  };
  const openModule = openModuleId ? getModule(openModuleId) : undefined;

  return (
    <div className="space-y-7 sm:space-y-9">
      {/* Cabeçalho com a capa do módulo */}
      <section className="relative -mx-4 -mt-5 overflow-hidden bg-ink text-white sm:-mx-6 sm:-mt-8 lg:mx-0 lg:mt-0 lg:rounded-3xl">
        <Image src={cover} alt="" fill priority sizes="100vw" className="scale-125 object-cover opacity-45 blur-2xl" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(23_15_25/0.35),rgb(23_15_25/0.92))]" />
        <div className="relative px-4 pb-6 pt-3 sm:px-8 sm:pb-8 sm:pt-6">
          <Link href="/aulas" className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-white/80 hover:text-white">
            <ArrowLeft aria-hidden className="size-4" />
            Área de membros
          </Link>
          <div className="mt-3 flex items-end gap-4 sm:gap-6">
            <span className="relative aspect-[2/3] w-[104px] shrink-0 overflow-hidden rounded-2xl shadow-[0_16px_32px_-12px_rgb(0_0_0/0.7)] ring-1 ring-white/15 sm:w-36">
              <Image src={cover} alt={mod ? `Capa do módulo ${mod.title}` : ""} fill sizes="144px" className="object-cover" />
            </span>
            <div className="min-w-0 pb-1">
              {mod ? <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/70">{mod.title}</p> : null}
              <h1 className="mt-1.5 font-serif text-[1.6rem] font-semibold leading-[1.1] sm:text-4xl">{lesson.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75 sm:text-sm">
                <span className="inline-flex items-center gap-1">
                  <Clock aria-hidden className="size-3.5" />
                  {formatDuration(lesson.durationMinutes)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Signal aria-hidden className="size-3.5" />
                  {LEVEL_LABEL[lesson.level]}
                </span>
                {mod ? <span>Aula {index + 1} de {trail.length}</span> : null}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          {/* Vídeo: estado decidido pela referência de mídia do catálogo */}
          <LessonPlayer media={lesson.media} availability={lesson.availability} cover={cover} title={lesson.title} />

          <div className="flex flex-wrap items-center gap-2">
            {isDemo ? <DemoBadge label="Aula de exemplo" /> : null}
            {done ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                <CircleCheck aria-hidden className="size-3" /> Concluída
              </span>
            ) : null}
          </div>

          {lesson.summary ? <p className="text-[0.95rem] leading-relaxed text-fg sm:text-base">{lesson.summary}</p> : null}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button size="lg" variant={done ? "secondary" : "primary"} onClick={() => setLessonDone(lesson.id, !done)} aria-pressed={done} disabled={!canComplete}>
              <Check aria-hidden className="size-4" />
              {done ? "Concluída · desmarcar" : "Marcar como concluída"}
            </Button>
            {next ? (
              <ButtonLink href={`/aulas/${next.id}`} size="lg" variant={done ? "primary" : "secondary"}>
                Próxima aula
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            ) : (
              <ButtonLink href="/aulas" size="lg" variant="secondary">
                Voltar à área de membros
              </ButtonLink>
            )}
          </div>

          {planTask ? (
            <section aria-labelledby="in-plan-title" className="rounded-2xl border border-brand/20 bg-blush/60 p-4 sm:p-5">
              <h2 id="in-plan-title" className="flex items-center gap-2 text-sm font-semibold text-brand">
                <Route aria-hidden className="size-4" />
                Essa aula faz parte do seu plano
              </h2>
              <p className="mt-1.5 text-sm text-fg">{planTask.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {getStatus(statusMap, planTask.id) === "completed"
                  ? "Concluída no plano."
                  : "Ao marcar a aula como concluída, a tarefa do plano também é concluída."}
              </p>
              <ButtonLink href={`/meu-plano#task-${planTask.id}`} variant="ghost" size="sm" className="-ml-3 mt-1">
                Ver no Meu Plano
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            </section>
          ) : null}

          <Card className="space-y-5 p-5 sm:p-6">
            <section className="rounded-xl bg-canvas p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <NotebookPen aria-hidden className="size-4 text-brand" />
                Pratique depois da aula
              </h2>
              <p className="mt-1 text-sm text-muted">{lesson.practice || "Atividade prática em preparação."}</p>
            </section>
            {materials.length > 0 ? (
              <section>
                <h2 className="text-sm font-semibold text-fg">Materiais</h2>
                <ul className="mt-2 space-y-2">
                  {materials.map((m) => {
                    const Icon = MATERIAL_ICON[m.kind];
                    return (
                      <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                        <Icon aria-hidden className="size-4 shrink-0 text-brand" />
                        <span className="min-w-0 flex-1 text-sm text-fg">{m.title}</span>
                        <span className="shrink-0 text-xs text-subtle">{m.file.kind === "none" ? "Arquivo em breve" : "Integração pendente"}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </Card>
        </div>

        {/* Nesta trilha */}
        <section aria-labelledby="trail-title" className="space-y-3 lg:sticky lg:top-24">
          <h2 id="trail-title" className="font-serif text-[1.35rem] font-semibold text-fg">
            Nesta trilha
          </h2>
          <ol className="space-y-2">
            {trail.map((l, i) => {
              const current = l.id === lesson.id;
              const ldone = isLessonDone(l.id);
              return (
                <li key={l.id}>
                  <Link
                    href={`/aulas/${l.id}`}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                      current ? "border-brand/40 bg-blush/70" : "border-line bg-card hover:border-brand/30",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                        ldone ? "bg-success-soft text-success" : current ? "bg-brand text-white" : "bg-canvas text-muted ring-1 ring-line",
                      )}
                    >
                      {ldone ? <Check aria-hidden className="size-4" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-fg">{l.title}</span>
                      <span className="text-xs text-muted">
                        {formatDuration(l.durationMinutes)}
                        {current ? " · você está aqui" : ldone ? " · concluída" : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {related.length > 0 ? (
        <Rail id="relacionadas" title="Aulas relacionadas" subtitle="Outros módulos desta trilha">
          {related.map((m) => (
            <ModuleCard key={m.id} module={m} {...progressOf(m.id)} onOpen={setOpenModuleId} />
          ))}
        </Rail>
      ) : null}

      {openModule ? <ModuleSheet module={openModule} isLessonDone={isLessonDone} onClose={() => setOpenModuleId(null)} /> : null}
    </div>
  );
}
