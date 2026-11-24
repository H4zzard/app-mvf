"use client";

import Image from "next/image";
import Link from "next/link";
import { HelpFooter } from "@/components/layout/help-footer";
import { useLayoutEffect, useMemo, useState } from "react";
import { ArrowDown, CircleCheck, CirclePlay, Clock, Play, Search, SearchX, Sparkles, X } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { usePlan } from "@/components/plan/plan-provider";
import { LEVEL_LABEL, ModuleCard, ModuleSheet, Rail, formatDuration } from "@/components/aulas/catalog-parts";
import { ChipGroup, SearchField } from "@/components/ui/chips";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MEMBER_ASSETS, MEMBER_RAILS, getModule, moduleOfLesson, modulesOfRail, recommendModules } from "@/demo/member-area";
import { normalizeSearch, type LessonStatusFilter } from "@/lib/demo/filters";
import { catalog } from "@/lib/catalog";
import type { CatalogLesson } from "@/types/catalog";
import { getStatus, orderedTasks } from "@/lib/plan";

/**
 * Área de membros (DEMONSTRAÇÃO) em formato de catálogo de streaming:
 * hero com o banner oficial, “Continue assistindo”, seleção personalizada e
 * trilhos horizontais com as capas oficiais dos módulos. A busca fica recolhida.
 */
export function CatalogView() {
  const { isLessonDone } = useDemo();
  const { plan, statusMap } = usePlan();
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LessonStatusFilter>("todas");
  useLayoutEffect(() => () => setOpenModuleId(null), []);

  const progressOf = (moduleId: string) => catalog.moduleProgress(moduleId, isLessonDone);

  const allLessons = catalog.lessons();
  const doneCount = allLessons.filter((l) => isLessonDone(l.id)).length;
  const started = doneCount > 0;

  // Próxima aula: a do próximo passo do plano (ordem do plano); senão, a primeira pendente do catálogo.
  const nextLesson = useMemo(() => {
    const preferred = plan
      ? orderedTasks(plan)
          .filter((t) => t.lessonId && getStatus(statusMap, t.id) !== "completed")
          .map((t) => t.lessonId as string)
      : [];
    return catalog.nextLesson({ preferred, isDone: isLessonDone });
  }, [plan, statusMap, isLessonDone]);
  const nextModule = nextLesson ? moduleOfLesson(nextLesson.id) : undefined;

  const recommendation = recommendModules(plan?.profile ?? null);
  const recommendedIds = new Set(recommendation.modules.map((m) => m.id));
  const searching = searchOpen && (query.trim() !== "" || status !== "todas");
  const results = catalog
    .searchLessons(query, normalizeSearch)
    .filter((l) => status === "todas" || (status === "concluidas") === isLessonDone(l.id));
  const openModule = openModuleId ? getModule(openModuleId) : undefined;
  const toggleSearch = () => {
    if (searchOpen) {
      setQuery("");
      setStatus("todas");
    }
    const opening = !searchOpen;
    setSearchOpen(opening);
    if (opening) {
      // Leva até o campo e abre o teclado (o painel aparece abaixo do hero).
      requestAnimationFrame(() => {
        const panel = document.getElementById("catalog-search");
        panel?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        panel?.querySelector("input")?.focus({ preventScroll: true });
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Hero */}
      <section
        aria-labelledby="catalog-hero-title"
        className="relative -mx-4 -mt-5 overflow-hidden bg-wine-deep text-white sm:-mx-6 sm:-mt-8 lg:mx-0 lg:mt-0 lg:rounded-3xl"
      >
        <div className="relative flex min-h-[clamp(260px,70vw,320px)] flex-col justify-end sm:min-h-[400px] lg:block lg:aspect-[2000/700] lg:min-h-0">
          <Image
            src={MEMBER_ASSETS.banner}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1200px"
            className="object-cover object-[70%_20%] lg:object-center"
          />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(52_11_24/0.96)_8%,rgb(74_19_35/0.62)_48%,rgb(52_11_24/0.05)_80%)] lg:bg-[linear-gradient(to_right,rgb(52_11_24/0.92)_10%,rgb(74_19_35/0.55)_45%,transparent_72%)]" />
          <button
            type="button"
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            aria-controls="catalog-search"
            className="absolute right-3 top-3 z-10 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-black/30 px-3.5 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/45 sm:right-5 sm:top-5"
          >
            {searchOpen ? <X aria-hidden className="size-4" /> : <Search aria-hidden className="size-4" />}
            {searchOpen ? "Fechar busca" : "Buscar"}
          </button>
          <div className="relative px-5 pb-5 pt-14 sm:p-8 sm:pt-20 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:max-w-xl lg:flex-col lg:justify-center lg:p-12">
            <div className="flex items-center gap-2.5">
              <Image src={MEMBER_ASSETS.logo} alt="NUMI" width={64} height={64} className="size-8 rounded-full ring-2 ring-white/20" />
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/80">Área de membros</span>
            </div>
            <h1 id="catalog-hero-title" className="mt-2.5 font-serif text-[2.25rem] font-semibold leading-[1.02] tracking-tight sm:mt-3 sm:text-5xl lg:text-6xl">
              {catalog.course.title}
            </h1>
            <p className="mt-1.5 max-w-md text-[0.95rem] leading-relaxed text-white/80 sm:mt-2 sm:text-base">
              {catalog.course.subtitle}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5 sm:mt-5">
              {nextLesson ? (
                <Link
                  href={`/aulas/${nextLesson.id}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-paper px-5 text-sm font-semibold text-wine-deep shadow-lg transition-colors hover:bg-blush min-[360px]:px-6"
                >
                  <Play aria-hidden className="size-4 fill-ink" />
                  {started ? "Continuar" : "Começar agora"}
                </Link>
              ) : null}
              <a
                href="#modulos"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white/12 px-4 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20 min-[360px]:px-5"
              >
                Ver módulos
                <ArrowDown aria-hidden className="size-4" />
              </a>
            </div>
            <div className="mt-3 sm:mt-4">
              <DemoBadge inverse label="Demonstração · aulas de exemplo" />
            </div>
          </div>
        </div>
      </section>

      {/* Continue assistindo */}
      {nextLesson && nextModule ? (
        <ContinueCard
          lessonId={nextLesson.id}
          title={nextLesson.title}
          minutes={nextLesson.durationMinutes}
          moduleTitle={nextModule.title}
          cover={nextModule.cover}
          progress={progressOf(nextModule.id)}
          started={started}
          inPlan={!!plan?.tasks.some((t) => t.lessonId && catalog.resolveLessonId(t.lessonId) === nextLesson.id)}
          overall={{ done: doneCount, total: allLessons.length }}
        />
      ) : (
        <p className="flex items-center gap-2 rounded-2xl bg-success-soft p-4 text-sm font-medium text-success">
          <CircleCheck aria-hidden className="size-4" /> Você concluiu todas as aulas de exemplo disponíveis.
        </p>
      )}

      {/* Busca recolhida (abre pelo botão do hero) */}
      {searchOpen ? (
          <div id="catalog-search" className="scroll-mt-20 space-y-3">
            <SearchField value={query} onChange={setQuery} placeholder="Buscar aula, tema ou módulo" label="Buscar aulas" />
            <ChipGroup
              label="Status das aulas"
              wrap
              value={status}
              onChange={setStatus}
              options={[
                { value: "todas", label: "Todas" },
                { value: "pendentes", label: "Pendentes" },
                { value: "concluidas", label: "Concluídas", count: doneCount },
              ]}
            />
          </div>
        ) : null}

      {searching ? (
        <SearchResults results={results} isLessonDone={isLessonDone} onClear={() => { setQuery(""); setStatus("todas"); }} />
      ) : (
        <div id="modulos" className="scroll-mt-20 space-y-6 sm:space-y-10">
          <Rail
            id="recomendado"
            title="Recomendado para você"
            subtitle={recommendation.reason}
            badge={<Badge tone="brand"><Sparkles aria-hidden className="size-3" />Seleção pelo seu plano</Badge>}
          >
            {recommendation.modules.map((m) => (
              <ModuleCard key={m.id} module={m} {...progressOf(m.id)} recommended onOpen={setOpenModuleId} />
            ))}
          </Rail>
          {MEMBER_RAILS.map((rail) => (
            <Rail key={rail.id} id={rail.id} title={rail.title} subtitle={rail.subtitle}>
              {modulesOfRail(rail.id).map((m) => (
                <ModuleCard key={m.id} module={m} {...progressOf(m.id)} recommended={recommendedIds.has(m.id)} onOpen={setOpenModuleId} />
              ))}
            </Rail>
          ))}
          <p className="text-center text-xs text-muted">
            Capas e nomes dos módulos são oficiais. As aulas dentro de cada módulo são exemplos desta demonstração.
          </p>
        </div>
      )}

      {/* Rodapé de ajuda: discreto, depois de todos os trilhos (não interfere no estilo de streaming). */}
      <div className="space-y-3">
        <HelpFooter title="Dúvidas para começar?" />
        <p className="text-sm text-muted">
          Procurando arquivos de apoio?{" "}
          <Link href="/materiais" className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">
            Ver materiais
          </Link>
        </p>
      </div>

      {openModule ? <ModuleSheet module={openModule} isLessonDone={isLessonDone} onClose={() => setOpenModuleId(null)} /> : null}
    </div>
  );
}

function ContinueCard({
  lessonId,
  title,
  minutes,
  moduleTitle,
  cover,
  progress,
  started,
  inPlan,
  overall,
}: {
  lessonId: string;
  title: string;
  minutes: number | null;
  moduleTitle: string;
  cover: string;
  progress: { done: number; total: number };
  started: boolean;
  inPlan: boolean;
  overall: { done: number; total: number };
}) {
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <section aria-labelledby="continue-heading" className="space-y-2.5 sm:space-y-3 lg:max-w-3xl">
      <h2 id="continue-heading" className="font-serif text-xl font-semibold leading-tight text-fg sm:text-2xl">
        {started ? "Continue assistindo" : "Seu próximo passo"}
      </h2>
      <Link
        href={`/aulas/${lessonId}`}
        className="group relative flex overflow-hidden rounded-3xl bg-wine-deep text-white shadow-raised outline-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <span className="relative min-h-[132px] w-[25%] max-w-[180px] shrink-0 self-stretch sm:min-h-0 sm:w-[34%]">
          <Image src={cover} alt="" fill sizes="180px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,transparent_55%,rgb(52_11_24))]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-3.5 sm:gap-2 sm:p-6">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-white/12 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/90">{moduleTitle}</span>
            {inPlan ? <span className="rounded-md bg-paper px-2 py-0.5 text-[0.65rem] font-semibold text-brand">No seu plano</span> : null}
          </span>
          <span id="continue-title" className="line-clamp-2 font-serif text-[1.05rem] font-semibold leading-snug sm:line-clamp-none sm:text-2xl">
            {title}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/70">
            <Clock aria-hidden className="size-3.5" />
            {formatDuration(minutes)} · módulo {progress.done}/{progress.total}
          </span>
          <span aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-white/20">
            <span className="block h-full rounded-full bg-paper" style={{ width: `${pct}%` }} />
          </span>
          <span className="mt-1 hidden min-h-10 w-fit items-center gap-2 rounded-lg bg-paper px-4 text-sm font-semibold text-wine-deep transition-colors group-hover:bg-blush sm:inline-flex">
            <CirclePlay aria-hidden className="size-4" />
            {started ? "Continuar aula" : "Assistir agora"}
          </span>
        </span>
        <span aria-hidden className="grid w-10 shrink-0 place-items-center sm:hidden">
          <span className="grid size-8 place-items-center rounded-full bg-paper text-wine-deep">
            <Play className="size-3.5 fill-ink" />
          </span>
        </span>
        <span className="sr-only sm:hidden">{started ? "Continuar aula" : "Assistir agora"}</span>
      </Link>
      <p className="hidden text-xs text-muted sm:block">
        {overall.done} de {overall.total} aulas concluídas na biblioteca
      </p>
    </section>
  );
}

function SearchResults({
  results,
  isLessonDone,
  onClear,
}: {
  results: CatalogLesson[];
  isLessonDone: (id: string) => boolean;
  onClear: () => void;
}) {
  return (
    <section aria-label="Resultados da busca" className="space-y-3">
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {results.length} {results.length === 1 ? "aula encontrada" : "aulas encontradas"}
      </p>
      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhuma aula encontrada" description="Tente outra palavra ou limpe os filtros." action={<Button variant="secondary" onClick={onClear}>Limpar busca</Button>} />
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {results.map((l) => {
            const m = moduleOfLesson(l.id);
            const done = isLessonDone(l.id);
            return (
              <li key={l.id}>
                <Link href={`/aulas/${l.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2.5 pr-3 shadow-card transition-colors hover:border-brand/30">
                  <span className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-lg bg-ink">
                    {m ? <Image src={m.cover} alt="" fill sizes="56px" className="object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[0.95rem] font-medium leading-snug text-fg">{l.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span>{m?.title ?? ""}</span>
                      <span>· {formatDuration(l.durationMinutes)}</span>
                      <span>· {LEVEL_LABEL[l.level]}</span>
                      {done ? <Badge tone="success"><CircleCheck aria-hidden className="size-3" />Concluída</Badge> : null}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
