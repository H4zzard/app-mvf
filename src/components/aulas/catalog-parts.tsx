"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, CirclePlay, Clock, Sparkles } from "lucide-react";
import type { CatalogLesson, LessonLevel } from "@/types/catalog";
import type { MemberModule } from "@/demo/member-area";
import { catalog } from "@/lib/catalog";
import { Sheet } from "@/components/ui/sheet";
import { DemoBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatMinutes } from "@/lib/plan";
import { cn } from "@/lib/cn";

export const LEVEL_LABEL: Record<LessonLevel, string> = { fundamento: "Fundamento", intermediario: "Intermediário", avancado: "Avançado" };

/** Duração conhecida ou “a definir” (o catálogo aceita `null`). */
export function formatDuration(minutes: number | null): string {
  return minutes === null ? "Duração a definir" : formatMinutes(minutes);
}

/** Aulas visíveis do módulo, na ordem do catálogo (oficiais ou de exemplo). */
export function lessonsOfModule(m: Pick<MemberModule, "id">): CatalogLesson[] {
  return catalog.lessonsOfModule(m.id);
}

/* --------------------------------- Trilho --------------------------------- */

/**
 * Trilho horizontal estilo streaming: rolagem lateral com snap no celular
 * (sangra até a borda da tela) e setas a partir de 768 px.
 */
export function Rail({
  id,
  title,
  subtitle,
  badge,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <section aria-labelledby={`rail-${id}`} className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`rail-${id}`} className="font-serif text-[1.35rem] font-semibold leading-tight text-fg sm:text-2xl">
            {title}
          </h2>
          {subtitle || badge ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              {/* Com selo, o subtítulo fica só a partir de 640 px (no celular o selo já explica). */}
              {subtitle ? <span className={badge ? "hidden sm:inline" : undefined}>{subtitle}</span> : null}
              {badge}
            </div>
          ) : null}
        </div>
        <div className="hidden shrink-0 gap-1.5 md:flex">
          <button type="button" onClick={() => scroll(-1)} aria-label={`Voltar em ${title}`} className="grid size-10 place-items-center rounded-full border border-line bg-card text-fg transition-colors hover:border-brand/40 hover:text-brand">
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Avançar em ${title}`} className="grid size-10 place-items-center rounded-full border border-line bg-card text-fg transition-colors hover:border-brand/40 hover:text-brand">
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>
      <ul
        ref={ref}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 pt-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </section>
  );
}

/* ------------------------------ Capa do módulo ------------------------------ */

export function ModuleCard({
  module,
  done,
  total,
  recommended,
  onOpen,
}: {
  module: MemberModule;
  done: number;
  total: number;
  recommended?: boolean;
  onOpen: (id: string) => void;
}) {
  const complete = total > 0 && done === total;
  const meta = total === 0 ? (module.href ? "Abrir área" : "Na área de membros atual") : complete ? "Concluído" : `${total} ${total === 1 ? "aula" : "aulas"}${done > 0 ? ` · ${done} feita${done > 1 ? "s" : ""}` : ""}`;
  return (
    <li className="w-[38vw] min-w-[128px] max-w-[176px] shrink-0 snap-start sm:w-[172px] sm:max-w-none lg:w-[188px]">
      <button
        type="button"
        onClick={() => onOpen(module.id)}
        aria-haspopup="dialog"
        className="group block w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <span className="relative block aspect-[2/3] overflow-hidden rounded-2xl bg-ink shadow-[0_10px_24px_-12px_rgb(43_29_34/0.55)] ring-1 ring-black/5 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_32px_-14px_rgb(198_41_64/0.45)]">
          <Image
            src={module.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 40vw, 190px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          {recommended || complete ? (
            <span className="absolute left-2 top-2 flex flex-wrap gap-1">
              {complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[0.65rem] font-semibold text-success shadow-sm">
                  <Check aria-hidden className="size-3" /> Concluído
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[0.65rem] font-semibold text-brand shadow-sm">
                  <Sparkles aria-hidden className="size-3" /> Para você
                </span>
              )}
            </span>
          ) : null}
          {total > 0 && !complete ? (
            <span aria-hidden className="absolute inset-x-2.5 bottom-2.5 h-1 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full rounded-full bg-white" style={{ width: `${Math.round((done / total) * 100)}%` }} />
            </span>
          ) : null}
        </span>
        <span className="mt-2 block px-0.5">
          <span className="line-clamp-2 text-[0.85rem] font-semibold leading-snug text-fg">{module.title}</span>
          <span className={cn("mt-0.5 block text-xs", complete ? "text-success" : "text-muted")}>{meta}</span>
        </span>
      </button>
    </li>
  );
}

/* ------------------------------ Sheet do módulo ------------------------------ */

export function ModuleSheet({
  module,
  isLessonDone,
  onClose,
}: {
  module: MemberModule;
  isLessonDone: (id: string) => boolean;
  onClose: () => void;
}) {
  const lessons = lessonsOfModule(module);
  const playable = lessons.filter((l) => l.availability === "disponivel");
  const next = playable.find((l) => !isLessonDone(l.id)) ?? playable[0];
  const doneCount = lessons.filter((l) => isLessonDone(l.id)).length;
  const official = lessons.length > 0 && lessons.every((l) => l.origin === "oficial");

  return (
    <Sheet
      title={module.title}
      eyebrow={module.tagline}
      onClose={onClose}
      footer={
        next ? (
          <ButtonLink href={`/aulas/${next.id}`} className="flex-1" size="lg">
            <CirclePlay aria-hidden className="size-4" />
            {doneCount === 0 ? "Começar módulo" : doneCount === lessons.length ? "Rever módulo" : "Continuar módulo"}
          </ButtonLink>
        ) : module.href ? (
          <ButtonLink href={module.href} className="flex-1" size="lg">
            Abrir {module.title.toLowerCase()}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        ) : undefined
      }
    >
      <div className="flex gap-4">
        <span className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-xl bg-ink shadow-card">
          <Image src={module.cover} alt={`Capa do módulo ${module.title}`} fill sizes="112px" className="object-cover" />
        </span>
        <div className="min-w-0 space-y-2">
          {official ? null : <DemoBadge label={lessons.length > 0 ? "Aulas de exemplo" : "Organização de exemplo"} />}
          {lessons.length > 0 ? (
            <p className="text-sm text-muted">
              {lessons.length} {lessons.length === 1 ? "aula" : "aulas"} · {doneCount} concluída{doneCount === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="text-sm text-muted">
              {module.href
                ? "Este conteúdo fica em outra área do app."
                : "As aulas deste módulo chegam em breve à nova área. Hoje elas estão na área de membros atual."}
            </p>
          )}
        </div>
      </div>
      {lessons.length > 0 ? (
        <ol className="mt-5 space-y-2">
          {lessons.map((l, i) => {
            const done = isLessonDone(l.id);
            if (l.availability !== "disponivel") {
              return (
                <li key={l.id} className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-3 opacity-80">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-canvas text-xs font-bold text-subtle ring-1 ring-line">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium text-fg">{l.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">Em breve</span>
                  </span>
                </li>
              );
            }
            return (
              <li key={l.id}>
                <Link href={`/aulas/${l.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-brand/30 hover:bg-blush/40">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold", done ? "bg-success-soft text-success" : "bg-canvas text-muted ring-1 ring-line")}>
                    {done ? <Check aria-hidden className="size-4" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium text-fg">{l.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <Clock aria-hidden className="size-3" />
                      {formatDuration(l.durationMinutes)} · {LEVEL_LABEL[l.level]}
                      {done ? <span className="sr-only"> · concluída</span> : null}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
                </Link>
              </li>
            );
          })}
        </ol>
      ) : null}
      <p className="mt-5 text-xs text-muted">
        {official
          ? "Capa, nome e aulas oficiais do MVF."
          : "Capa e nome do módulo são oficiais. As aulas listadas são exemplos da demonstração."}
      </p>
    </Sheet>
  );
}
