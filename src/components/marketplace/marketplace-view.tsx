"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Heart, Info, Package, SearchX, Sparkles } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { Chip, ChipGroup, SearchField } from "@/components/ui/chips";
import { Badge, DemoBadge, SoonBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { DEMO_PRODUCTS, PRODUCT_CATEGORY_LABEL, type DemoProduct, type ProductCategory } from "@/demo/products";
import { filterProducts } from "@/lib/demo/filters";
import { cn } from "@/lib/cn";

const FORMAT_LABEL = { avatar_ia: "Avatar IA", maos_produto: "Mãos e produto", narracao: "Narração" } as const;

/**
 * Marketplace (DEMONSTRAÇÃO). Sem catálogo oficial: itens demonstrativos,
 * sem preço, sem comissão e sem imagem real.
 */
export function MarketplaceView() {
  const { state, dispatch } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "todas">("todas");
  const [onlyMine, setOnlyMine] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  useLayoutEffect(() => () => setOpenId(null), []);

  const mine = state.favorites.products;
  const visible = filterProducts(DEMO_PRODUCTS, { query, category, onlyMine, mine });
  const open = DEMO_PRODUCTS.find((p) => p.id === openId);
  const toggleMine = (id: string) => dispatch({ type: "favorite/toggle", kind: "products", id });

  function createScript(p: DemoProduct) {
    dispatch({
      type: "studio/seed",
      seed: { from: p.name, target: "roteiros", productName: p.name.replace(" (demonstrativo)", ""), productCategory: PRODUCT_CATEGORY_LABEL[p.category] },
    });
    setOpenId(null);
    router.push("/estudio-ia/roteiros");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Produtos demonstrativos" />}
        title="Marketplace"
        description="Escolha produtos para criar conteúdo e guarde os seus favoritos."
      />

      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          <strong className="font-semibold text-fg">Catálogo oficial NUMI ainda não conectado.</strong> Os itens abaixo são
          demonstrativos, sem preço, sem comissão e sem fotos reais.
        </span>
      </p>

      <div className="space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar produto" label="Buscar produtos" />
        <ChipGroup
          label="Categorias"
          value={category}
          onChange={setCategory}
          options={[{ value: "todas" as const, label: "Todas" }, ...Object.entries(PRODUCT_CATEGORY_LABEL).map(([value, label]) => ({ value: value as ProductCategory, label }))]}
        />
        <Chip active={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
          <Heart aria-hidden className={cn("size-4", onlyMine && "fill-white")} />
          Meus produtos
          <span className={cn("text-xs", onlyMine ? "text-white/80" : "text-subtle")}>{mine.length}</span>
        </Chip>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={onlyMine && mine.length === 0 ? "Você ainda não salvou produtos" : "Nenhum produto encontrado"}
          description={onlyMine && mine.length === 0 ? "Toque no coração de um produto para guardar em Meus produtos." : "Tente outra busca ou categoria."}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setCategory("todas");
                setOnlyMine(false);
              }}
            >
              Ver todos
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => {
            const saved = mine.includes(p.id);
            return (
              <li key={p.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenId(p.id)}
                  aria-haspopup="dialog"
                  className="block w-full overflow-hidden rounded-2xl border border-line bg-card text-left shadow-card transition-colors hover:border-brand/30"
                >
                  <span className="grid aspect-square place-items-center bg-blush text-brand">
                    <span className="text-center">
                      <Package aria-hidden className="mx-auto size-8" strokeWidth={1.5} />
                      <span className="mt-1 block text-[0.65rem] font-medium text-muted">Imagem em breve</span>
                    </span>
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 text-sm font-medium leading-snug text-fg">{p.name}</span>
                    <span className="mt-1 block text-xs text-muted">{PRODUCT_CATEGORY_LABEL[p.category]}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleMine(p.id)}
                  aria-pressed={saved}
                  aria-label={saved ? `Remover ${p.name} de Meus produtos` : `Adicionar ${p.name} a Meus produtos`}
                  className="absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full"
                >
                  <span className={cn("grid size-8 place-items-center rounded-full bg-white shadow-card", saved ? "text-brand" : "text-muted")}>
                    <Heart aria-hidden className={cn("size-4", saved && "fill-brand")} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="flex items-center gap-4 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas text-brand">
          <Handshake aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-fg">
            Marcas parceiras <SoonBadge />
          </p>
          <p className="text-sm text-muted">Novas marcas aparecem aqui quando houver parcerias confirmadas.</p>
        </div>
      </Card>

      {open ? (
        <Sheet
          title={open.name}
          eyebrow={PRODUCT_CATEGORY_LABEL[open.category]}
          onClose={() => setOpenId(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => toggleMine(open.id)} aria-pressed={mine.includes(open.id)}>
                <Heart aria-hidden className={cn("size-4", mine.includes(open.id) && "fill-brand text-brand")} />
                {mine.includes(open.id) ? "Em Meus produtos" : "Meus produtos"}
              </Button>
              <Button className="flex-1" onClick={() => createScript(open)}>
                <Sparkles aria-hidden className="size-4" />
                Criar roteiro
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <DemoBadge label="Produto demonstrativo" />
            <p className="text-sm text-muted">{open.description}</p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-line p-3">
                <dt className="text-muted">Preço</dt>
                <dd className="mt-0.5 font-medium text-fg">Não informado</dd>
              </div>
              <div className="rounded-xl border border-line p-3">
                <dt className="text-muted">Comissão</dt>
                <dd className="mt-0.5 font-medium text-fg">Consulte as regras oficiais</dd>
              </div>
            </dl>
            <section>
              <h3 className="text-sm font-semibold text-fg">Por que é bom para conteúdo</h3>
              <ul className="mt-2 space-y-1.5">
                {open.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm text-fg">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                    {h}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-fg">Ideias de vídeo</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {open.contentAngles.map((a) => (
                  <Badge key={a} tone="brand">
                    {a}
                  </Badge>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-fg">Formatos sugeridos</h3>
              <p className="mt-1 text-sm text-muted">{open.suggestedFormats.map((f) => FORMAT_LABEL[f]).join(" · ")}</p>
            </section>
            <p className="rounded-xl bg-canvas p-3 text-xs text-muted">
              Fotos, materiais oficiais e regras de comissão entram aqui quando o catálogo da NUMI for conectado.
            </p>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
