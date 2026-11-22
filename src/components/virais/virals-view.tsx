"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Clock, Link2Off, PlugZap, SearchX, SlidersHorizontal, Sparkles } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { Chip, ChipGroup, SearchField } from "@/components/ui/chips";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import {
  CATEGORY_LABEL,
  COUNTRY_LABEL,
  DEMO_VIRALS,
  FORMAT_LABEL,
  KIND_LABEL,
  PLATFORM_LABEL,
  type ViralReference,
} from "@/demo/virals";
import { DEFAULT_VIRAL_FILTERS, activeViralFilterCount, filterVirals, type ViralFilters } from "@/lib/demo/filters";
import { cn } from "@/lib/cn";

/** Galeria de referências (DEMONSTRAÇÃO). Sem métricas: fonte de dados não conectada. */
export function ViralsView() {
  const { state, dispatch } = useDemo();
  const router = useRouter();
  const [filters, setFilters] = useState<ViralFilters>(DEFAULT_VIRAL_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useLayoutEffect(
    () => () => {
      setOpenId(null);
      setFiltersOpen(false);
    },
    [],
  );

  const favorites = state.favorites.virals;
  const visible = filterVirals(DEMO_VIRALS, filters, favorites);
  const open = DEMO_VIRALS.find((v) => v.id === openId);
  const extraFilters = activeViralFilterCount({ ...filters, platform: "todas", onlyFavorites: false });
  const set = <K extends keyof ViralFilters>(key: K, value: ViralFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  function sendToStudio(v: ViralReference) {
    dispatch({
      type: "studio/seed",
      // Só INSPIRAÇÃO: o gancho aparece como referência e nunca vira fala sozinho.
      seed: {
        from: v.title,
        target: v.format === "avatar_ia" ? "animar" : "roteiros",
        hook: v.country === "BR" ? v.hook : undefined,
        format: v.format === "avatar_ia" ? "avatar" : v.format === "maos_produto" ? "maos_produto" : undefined,
      },
    });
    setOpenId(null);
    router.push(v.format === "avatar_ia" ? "/estudio-ia/animar" : "/estudio-ia/roteiros");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Referências de exemplo" />}
        title="Vídeos Virais"
        description="Referências de ganchos e estruturas para inspirar seus próximos vídeos."
      />

      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <PlugZap aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          <strong className="font-semibold text-fg">Fonte de dados não conectada.</strong> Visualizações, vendas e faturamento
          não são exibidos. As referências são descrições de exemplo.
        </span>
      </p>

      <div className="space-y-3">
        <SearchField value={filters.query} onChange={(v) => set("query", v)} placeholder="Buscar gancho ou tema" label="Buscar referências" />
        <div className="flex items-center gap-2">
          <ChipGroup
            label="Plataforma"
            className="min-w-0 flex-1"
            value={filters.platform}
            onChange={(v) => set("platform", v)}
            options={[
              { value: "todas" as const, label: "Todas" },
              { value: "tiktok" as const, label: "TikTok" },
              { value: "instagram" as const, label: "Instagram" },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.onlyFavorites} onClick={() => set("onlyFavorites", !filters.onlyFavorites)}>
            <Bookmark aria-hidden className="size-4" />
            Salvos
            <span className={cn("text-xs", filters.onlyFavorites ? "text-white/80" : "text-subtle")}>{favorites.length}</span>
          </Chip>
          <Chip active={extraFilters > 0} onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal aria-hidden className="size-4" />
            Filtros{extraFilters > 0 ? ` · ${extraFilters}` : ""}
          </Chip>
        </div>
      </div>

      <p role="status" aria-live="polite" className="text-xs text-muted">
        {visible.length} {visible.length === 1 ? "referência" : "referências"}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={filters.onlyFavorites && favorites.length === 0 ? "Você ainda não salvou referências" : "Nenhuma referência encontrada"}
          description={filters.onlyFavorites && favorites.length === 0 ? "Toque no marcador de um card para salvar." : "Ajuste os filtros para ver mais referências."}
          action={
            <Button variant="secondary" onClick={() => setFilters(DEFAULT_VIRAL_FILTERS)}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((v) => (
            <ViralCard
              key={v.id}
              viral={v}
              saved={favorites.includes(v.id)}
              onOpen={() => setOpenId(v.id)}
              onToggleSave={() => dispatch({ type: "favorite/toggle", kind: "virals", id: v.id })}
            />
          ))}
        </ul>
      )}

      {open ? (
        <Sheet
          title={open.title}
          eyebrow={`${PLATFORM_LABEL[open.platform]} · ${KIND_LABEL[open.kind]} · ${COUNTRY_LABEL[open.country]}`}
          onClose={() => setOpenId(null)}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => dispatch({ type: "favorite/toggle", kind: "virals", id: open.id })}
                aria-pressed={favorites.includes(open.id)}
              >
                {favorites.includes(open.id) ? <BookmarkCheck aria-hidden className="size-4 text-brand" /> : <Bookmark aria-hidden className="size-4" />}
                {favorites.includes(open.id) ? "Salvo" : "Salvar"}
              </Button>
              <Button className="flex-1" onClick={() => sendToStudio(open)}>
                <Sparkles aria-hidden className="size-4" />
                Usar no Estúdio IA
              </Button>
            </>
          }
        >
          <ViralDetail viral={open} />
        </Sheet>
      ) : null}

      {filtersOpen ? (
        <Sheet
          title="Filtros"
          onClose={() => setFiltersOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setFilters((f) => ({ ...DEFAULT_VIRAL_FILTERS, query: f.query }))}>
                Limpar
              </Button>
              <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                Ver {visible.length} {visible.length === 1 ? "referência" : "referências"}
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <FilterBlock title="Tipo">
              <ChipGroup label="Tipo" wrap value={filters.kind} onChange={(v) => set("kind", v)} options={[{ value: "todos" as const, label: "Todos" }, { value: "organico" as const, label: "Orgânico" }, { value: "anuncio" as const, label: "Anúncio" }]} />
            </FilterBlock>
            <FilterBlock title="País">
              <ChipGroup label="País" wrap value={filters.country} onChange={(v) => set("country", v)} options={[{ value: "todos" as const, label: "Todos" }, { value: "BR" as const, label: "Brasil" }, { value: "US" as const, label: "EUA" }]} />
            </FilterBlock>
            <FilterBlock title="Categoria">
              <ChipGroup label="Categoria" wrap value={filters.category} onChange={(v) => set("category", v)} options={[{ value: "todas" as const, label: "Todas" }, { value: "fisicos" as const, label: "Produtos físicos" }, { value: "apps" as const, label: "Apps" }, { value: "infoprodutos" as const, label: "Infoprodutos" }]} />
            </FilterBlock>
            <FilterBlock title="Ordenar por">
              <ChipGroup label="Ordenar por" wrap value={filters.sort} onChange={(v) => set("sort", v)} options={[{ value: "curadoria" as const, label: "Recentes na curadoria" }, { value: "az" as const, label: "A–Z" }, { value: "duracao" as const, label: "Mais curtos" }]} />
            </FilterBlock>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-fg">{title}</h3>
      {children}
    </section>
  );
}

function ViralCard({ viral, saved, onOpen, onToggleSave }: { viral: ViralReference; saved: boolean; onOpen: () => void; onToggleSave: () => void }) {
  const dark = viral.platform === "tiktok";
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="group block w-full overflow-hidden rounded-2xl border border-line bg-card text-left shadow-card transition-colors hover:border-brand/30"
      >
        <span
          className={cn(
            "relative flex aspect-[9/14] flex-col justify-end p-3",
            dark ? "bg-ink text-white" : "bg-blush text-fg",
          )}
        >
          <span aria-hidden className={cn("absolute left-3 top-3 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", dark ? "bg-white/12 text-white/90" : "bg-white text-brand")}>
            {PLATFORM_LABEL[viral.platform]}
          </span>
          <span className="line-clamp-4 font-serif text-[0.95rem] font-semibold leading-snug sm:text-base">“{viral.hook}”</span>
          <span className={cn("mt-2 inline-flex items-center gap-1 text-[0.7rem]", dark ? "text-white/70" : "text-muted")}>
            <Clock aria-hidden className="size-3" />
            {viral.durationSec}s · {FORMAT_LABEL[viral.format]}
          </span>
        </span>
        <span className="block p-3">
          <span className="line-clamp-2 text-sm font-medium leading-snug text-fg">{viral.title}</span>
          <span className="mt-1.5 flex flex-wrap gap-1">
            <Badge tone={viral.kind === "anuncio" ? "warning" : "neutral"}>{KIND_LABEL[viral.kind]}</Badge>
            <Badge tone="neutral">{viral.country}</Badge>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={saved}
        aria-label={saved ? `Remover “${viral.title}” dos salvos` : `Salvar “${viral.title}”`}
        className={cn(
          "absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full transition-colors",
          saved ? "text-brand" : dark ? "text-white/85 hover:text-white" : "text-fg/70 hover:text-brand",
        )}
      >
        <span className={cn("grid size-8 place-items-center rounded-full", saved ? "bg-white" : dark ? "bg-white/12" : "bg-white/80")}>
          {saved ? <BookmarkCheck aria-hidden className="size-4" /> : <Bookmark aria-hidden className="size-4" />}
        </span>
      </button>
    </li>
  );
}

function ViralDetail({ viral }: { viral: ViralReference }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        <DemoBadge label="Referência de exemplo" />
        <Badge tone="neutral">{CATEGORY_LABEL[viral.category]}</Badge>
        <Badge tone="neutral">{FORMAT_LABEL[viral.format]}</Badge>
        <Badge tone="neutral">{viral.durationSec}s</Badge>
      </div>
      <section className="rounded-2xl bg-blush/70 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand">Gancho</h3>
        <p className="mt-1 font-serif text-lg font-semibold leading-snug text-fg">“{viral.hook}”</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-fg">Estrutura do roteiro</h3>
        <ol className="mt-2 space-y-2">
          {viral.structure.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-fg">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-canvas text-xs font-bold text-muted ring-1 ring-line">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-fg">Chamada para ação</h3>
        <p className="mt-1 text-sm text-muted">{viral.cta}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-fg">Por que funciona</h3>
        <p className="mt-1 text-sm text-muted">{viral.whyItWorks}</p>
      </section>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-line p-3">
          <dt className="text-muted">Métricas</dt>
          <dd className="mt-0.5 font-medium text-fg">Estimativa não disponível</dd>
        </div>
        <div className="rounded-xl border border-line p-3">
          <dt className="text-muted">GMV / vendas</dt>
          <dd className="mt-0.5 font-medium text-fg">Sem fonte de dados</dd>
        </div>
      </dl>
      {viral.sourceUrl ? (
        <a href={viral.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">
          Ver vídeo original
        </a>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Link2Off aria-hidden className="size-3.5" />
          Link original não disponível nesta demonstração.
        </p>
      )}
    </div>
  );
}
