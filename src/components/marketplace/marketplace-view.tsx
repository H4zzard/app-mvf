"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Handshake, Info, Lightbulb, SearchX, SlidersHorizontal, Wallet } from "lucide-react";
import { usePlan } from "@/components/plan/plan-provider";
import { ChipGroup, SearchField } from "@/components/ui/chips";
import { Badge, DemoBadge, SoonBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { productCatalog } from "@/lib/products";
import { AVAILABILITY_LABEL, CATEGORY_LABEL } from "@/lib/products/display";
import { DEFAULT_PRODUCT_FILTERS, activeProductFilterCount, filterProductList, type ProductFilters, type ProductList } from "@/lib/products/filters";
import { recommendProducts } from "@/lib/products/recommend";
import type { Availability, Product, ProductCategory, ProductOrigin } from "@/lib/products/types";
import { cn } from "@/lib/cn";
import { MyProducts } from "./my-products";
import { ProductCard, ProductVisual } from "./product-ui";
import { useProductActions } from "./use-product-actions";

const ALL = productCatalog.all();

/**
 * Marketplace (DEMONSTRAÇÃO + catálogo oficial). Produtos oficiais NUMI vêm de
 * src/content/produtos-oficiais.json; os demais são demonstrativos e rotulados.
 * Nada de preço, comissão ou afiliação sem dado verificado (“A confirmar”).
 */
export function MarketplaceView() {
  const { profile } = usePlan();
  const { saved, mine, toggleSave, toRecording } = useProductActions();
  const [tab, setTab] = useState<ProductList>("todos");
  const [f, setF] = useState<Omit<ProductFilters, "list" | "saved" | "mine">>({
    query: DEFAULT_PRODUCT_FILTERS.query,
    category: "todas",
    origin: "todas",
    availability: "todas",
  });
  const [showFilters, setShowFilters] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const filters: ProductFilters = { ...f, list: tab, saved, mine };
  const activeCount = activeProductFilterCount(filters);
  const browsing = tab === "todos" && !f.query.trim() && activeCount === 0;
  const results = filterProductList(ALL, filters);
  const recs = useMemo(() => recommendProducts(ALL, profile), [profile]);
  const news = productCatalog.news();
  const numi = productCatalog.numi();
  const demo = productCatalog.demo();
  const clear = () => setF({ query: "", category: "todas", origin: "todas", availability: "todas" });

  const grid = (items: Product[]) => (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {items.map((p) => (
        <li key={p.id} className="min-w-0">
          <ProductCard product={p} saved={saved.includes(p.id)} onToggleSave={() => toggleSave(p.id)} onCreateScript={() => toRecording(p)} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Demonstração" />}
        title="Produtos"
        description="Descubra produtos, consulte as informações e prepare seus vídeos no Estúdio IA."
        actions={
          <ButtonLink href="/minhas-vendas" variant="secondary">
            <Wallet aria-hidden className="size-4" />
            Minhas vendas
          </ButtonLink>
        }
      />

      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          <strong className="font-semibold text-fg">O catálogo oficial NUMI está em preenchimento.</strong> Preço, comissão e afiliação aparecem só depois de
          confirmados pela equipe; até lá, “A confirmar”. Os produtos marcados como demonstrativos servem só para treinar.
        </span>
      </p>

      <Segmented
        label="Seções do Marketplace"
        value={tab}
        onChange={setTab}
        options={[
          { value: "todos", label: "Explorar" },
          { value: "salvos", label: "Salvos", count: saved.length },
          { value: "meus", label: "Meus produtos", short: "Meus", count: mine.length },
        ]}
      />

      {tab === "meus" ? (
        <MyProducts onExplore={() => setTab("todos")} />
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <SearchField value={f.query} onChange={(v) => set("query", v)} placeholder="Buscar produto" label="Buscar produtos" />
              </div>
              <Button
                variant="secondary"
                className="shrink-0 px-3.5"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                aria-controls="filtros-produtos"
                aria-label={`Filtros${activeCount ? ` (${activeCount} ativos)` : ""}`}
              >
                <SlidersHorizontal aria-hidden className="size-4" />
                <span className="hidden min-[380px]:inline">Filtros</span>
                {activeCount ? <span className="grid size-5 place-items-center rounded-full bg-brand text-[0.7rem] text-paper">{activeCount}</span> : null}
              </Button>
            </div>
            <ChipGroup
              label="Categorias"
              value={f.category}
              onChange={(v) => set("category", v)}
              options={[
                { value: "todas" as const, label: "Todas" },
                ...productCatalog.categories().map((c) => ({ value: c as ProductCategory | "todas", label: CATEGORY_LABEL[c] })),
              ]}
            />
            {showFilters ? (
              <div id="filtros-produtos" className="space-y-3 rounded-2xl border border-line bg-card p-3.5">
                <div>
                  <p className="mb-2 text-xs font-semibold text-fg">Origem</p>
                  <ChipGroup
                    label="Origem"
                    wrap
                    value={f.origin}
                    onChange={(v) => set("origin", v)}
                    options={[
                      { value: "todas" as ProductOrigin | "todas", label: "Todas" },
                      { value: "oficial", label: "Oficiais" },
                      { value: "demonstrativo", label: "Demonstrativos" },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-fg">Disponibilidade</p>
                  <ChipGroup
                    label="Disponibilidade"
                    wrap
                    value={f.availability}
                    onChange={(v) => set("availability", v)}
                    options={[
                      { value: "todas" as Availability | "todas", label: "Todas" },
                      ...(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => ({ value: a as Availability | "todas", label: a === "a_confirmar" ? "A confirmar" : AVAILABILITY_LABEL[a] })),
                    ]}
                  />
                </div>
                {activeCount ? (
                  <Button variant="ghost" size="sm" onClick={clear}>
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {browsing ? (
            <div className="space-y-7">
              <Recommendations recs={recs} hasProfile={Boolean(profile)} />

              {news.length ? (
                <section aria-labelledby="mk-novidades" className="space-y-3">
                  <h2 id="mk-novidades" className="font-serif text-xl font-semibold text-fg">
                    Novidades
                  </h2>
                  <Rail items={news.map((p) => ({ product: p, note: p.shortDescription }))} />
                </section>
              ) : null}

              <section aria-labelledby="mk-numi" className="space-y-3">
                <div>
                  <h2 id="mk-numi" className="font-serif text-xl font-semibold text-fg">
                    Produtos NUMI
                  </h2>
                  <p className="text-sm text-muted">Catálogo oficial. Só aparece o que a equipe já cadastrou.</p>
                </div>
                {numi.length ? grid(numi) : <EmptyState icon={Info} title="Catálogo oficial em preparação" description="Os produtos NUMI aparecem aqui assim que a equipe cadastrar." />}
              </section>

              {demo.length ? (
                <section aria-labelledby="mk-demo" className="space-y-3">
                  <div>
                    <h2 id="mk-demo" className="flex flex-wrap items-center gap-2 font-serif text-xl font-semibold text-fg">
                      Para treinar <DemoBadge label="Demonstrativos" />
                    </h2>
                    <p className="text-sm text-muted">Produtos de exemplo, sem marca real, para praticar o caminho até o Estúdio IA.</p>
                  </div>
                  {grid(demo)}
                </section>
              ) : null}
            </div>
          ) : results.length ? (
            <section aria-label="Resultados" className="space-y-3">
              <p className="text-sm text-muted" aria-live="polite">
                {results.length === 1 ? "1 produto" : `${results.length} produtos`}
              </p>
              {grid(results)}
            </section>
          ) : (
            <EmptyState
              icon={SearchX}
              title={tab === "salvos" && saved.length === 0 ? "Você ainda não salvou produtos" : "Nenhum produto encontrado"}
              description={tab === "salvos" && saved.length === 0 ? "Toque no coração de um produto para guardar aqui." : "Tente outra busca, categoria ou filtro."}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    clear();
                    setTab("todos");
                  }}
                >
                  Ver todos
                </Button>
              }
            />
          )}

          <Card className="flex items-center gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas text-brand">
              <Handshake aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-fg">
                Marcas parceiras <SoonBadge />
              </p>
              <p className="text-sm text-muted">Novas marcas aparecem aqui só quando houver parcerias confirmadas.</p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Recommendations({ recs, hasProfile }: { recs: ReturnType<typeof recommendProducts>; hasProfile: boolean }) {
  if (!hasProfile) {
    return (
      <Link href="/onboarding" className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand/30">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush text-brand">
          <Lightbulb aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">Quer sugestões para o seu jeito de gravar?</span>
          <span className="block text-xs text-muted">Responda o onboarding e recomendamos produtos e formatos.</span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
      </Link>
    );
  }
  if (!recs.length) return null;
  return (
    <section aria-labelledby="mk-recomendados" className="space-y-3">
      <div>
        <h2 id="mk-recomendados" className="font-serif text-xl font-semibold text-fg">
          Recomendados para você
        </h2>
        <p className="text-sm text-muted">Pelo seu jeito de gravar e pelo seu momento. Não é previsão de vendas.</p>
      </div>
      <Rail items={recs.map((r) => ({ product: r.product, note: r.reasons[0], idea: r.idea }))} />
    </section>
  );
}

/** Trilho horizontal (rola no celular, quebra em grade no desktop). */
function Rail({ items }: { items: { product: Product; note?: string; idea?: string }[] }) {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
      {items.map(({ product: p, note, idea }) => (
        <li key={p.id} className="w-[15.5rem] shrink-0 snap-start sm:w-auto">
          <Link href={`/marketplace/${p.id}`} className="flex h-full gap-3 rounded-2xl border border-line bg-card p-3 shadow-card transition-colors hover:border-brand/30">
            <ProductVisual product={p} className="size-16 shrink-0 rounded-xl" sizes="64px" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">{p.name}</span>
              <span className="mt-0.5 flex flex-wrap gap-1">
                {p.origin === "demonstrativo" ? <DemoBadge label="Demonstrativo" /> : <Badge tone="brand">{p.brand}</Badge>}
              </span>
              {note ? <span className="mt-1 line-clamp-2 block text-xs text-muted">{note}</span> : null}
              {idea ? <span className={cn("mt-1 block text-xs font-medium text-brand")}>{idea}</span> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
