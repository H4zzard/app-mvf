"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, FileClock, FileText, ListChecks, SearchX, Star } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { usePlan } from "@/components/plan/plan-provider";
import { Rail } from "@/components/aulas/catalog-parts";
import { Chip, ChipGroup, SearchField } from "@/components/ui/chips";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { LIBRARY_LESSONS } from "@/demo/library";
import { DEMO_MATERIALS, MATERIAL_CATEGORY_LABEL, type Material, type MaterialCategory } from "@/demo/materials";
import { matchesQuery } from "@/lib/demo/filters";
import { getStatus, orderedTasks } from "@/lib/plan";
import { cn } from "@/lib/cn";

const KIND: Record<Material["kind"], { label: string; icon: typeof FileText }> = {
  checklist: { label: "Checklist", icon: ListChecks },
  modelo: { label: "Modelo", icon: ClipboardList },
  guia: { label: "Guia", icon: FileText },
};

/**
 * Central de Materiais (DEMONSTRAÇÃO). Nenhum arquivo real existe ainda:
 * cada material informa “Arquivo ainda não disponível” (sem download falso).
 */
export function MaterialsView() {
  const { state, dispatch } = useDemo();
  const { plan, statusMap } = usePlan();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MaterialCategory | "todas">("todas");
  const [onlyFav, setOnlyFav] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  useLayoutEffect(() => () => setOpenId(null), []);

  const favs = state.favorites.materials;
  const toggleFav = (id: string) => dispatch({ type: "favorite/toggle", kind: "materials", id });

  // Recomendados: materiais das próximas aulas pendentes do plano.
  const recommended = useMemo(() => {
    if (!plan) return DEMO_MATERIALS.slice(0, 6);
    const upcoming = orderedTasks(plan)
      .filter((t) => t.lessonId && getStatus(statusMap, t.id) !== "completed")
      .map((t) => t.lessonId as string);
    const list = upcoming.flatMap((lid) => DEMO_MATERIALS.filter((m) => m.lessonId === lid));
    return (list.length ? list : DEMO_MATERIALS).slice(0, 8);
  }, [plan, statusMap]);

  const visible = DEMO_MATERIALS.filter(
    (m) => (category === "todas" || m.category === category) && (!onlyFav || favs.includes(m.id)) && matchesQuery(query, m.title, m.description, MATERIAL_CATEGORY_LABEL[m.category]),
  );
  const filtering = query.trim() !== "" || category !== "todas" || onlyFav;
  const open = DEMO_MATERIALS.find((m) => m.id === openId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiais"
        description="Checklists, modelos e guias que acompanham as aulas e os produtos NUMI."
      />

      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <FileClock aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          <strong className="font-semibold text-fg">Os arquivos ainda não foram adicionados.</strong> A central já está organizada; os
          downloads aparecem aqui quando a equipe enviar os materiais oficiais.
        </span>
      </p>

      <div className="space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar material" label="Buscar materiais" />
        <ChipGroup
          label="Categorias de material"
          value={category}
          onChange={setCategory}
          options={[{ value: "todas" as const, label: "Todas" }, ...(Object.keys(MATERIAL_CATEGORY_LABEL) as MaterialCategory[]).map((c) => ({ value: c, label: MATERIAL_CATEGORY_LABEL[c] }))]}
        />
        <Chip active={onlyFav} onClick={() => setOnlyFav((v) => !v)}>
          <Star aria-hidden className={cn("size-4", onlyFav && "fill-paper")} />
          Favoritos
          <span className={cn("text-xs", onlyFav ? "text-on-wine-muted" : "text-subtle")}>{favs.length}</span>
        </Chip>
      </div>

      {!filtering ? (
        <Rail id="mat-rec" title="Para a sua trilha" subtitle="Materiais das próximas aulas do seu plano">
          {recommended.map((m) => (
            <li key={m.id} className="w-[62vw] min-w-[220px] max-w-[260px] shrink-0 snap-start">
              <MaterialTile material={m} fav={favs.includes(m.id)} onOpen={() => setOpenId(m.id)} onFav={() => toggleFav(m.id)} />
            </li>
          ))}
        </Rail>
      ) : null}

      <section aria-labelledby="mat-all" className="space-y-3">
        <h2 id="mat-all" className="font-serif text-[1.35rem] font-semibold text-fg">
          {filtering ? `${visible.length} ${visible.length === 1 ? "material" : "materiais"}` : "Todos os materiais"}
        </h2>
        {visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={onlyFav && favs.length === 0 ? "Nenhum favorito ainda" : "Nenhum material encontrado"}
            description={onlyFav && favs.length === 0 ? "Toque na estrela de um material para salvar." : "Tente outra palavra ou categoria."}
            action={<Button variant="secondary" onClick={() => { setQuery(""); setCategory("todas"); setOnlyFav(false); }}>Limpar filtros</Button>}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((m) => (
              <li key={m.id}>
                <MaterialTile material={m} fav={favs.includes(m.id)} onOpen={() => setOpenId(m.id)} onFav={() => toggleFav(m.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? <MaterialSheet material={open} fav={favs.includes(open.id)} onFav={() => toggleFav(open.id)} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function MaterialTile({ material, fav, onOpen, onFav }: { material: Material; fav: boolean; onOpen: () => void; onFav: () => void }) {
  const K = KIND[material.kind];
  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="flex h-full w-full items-center gap-3 rounded-2xl border border-line bg-card p-2.5 pr-12 text-left shadow-card transition-colors hover:border-brand/30"
      >
        <span className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-xl bg-blush">
          {material.cover ? <Image src={material.cover} alt="" fill sizes="56px" className="object-cover" /> : null}
          <span className="absolute bottom-1 left-1 grid size-6 place-items-center rounded-md bg-paper/95 text-brand">
            <K.icon aria-hidden className="size-3.5" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-fg">{material.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span>{K.label}</span>
            <span>· {MATERIAL_CATEGORY_LABEL[material.category]}</span>
          </span>
          <span className="mt-1 block text-[0.7rem] font-medium text-subtle">Arquivo ainda não disponível</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onFav}
        aria-pressed={fav}
        aria-label={fav ? `Remover ${material.title} dos favoritos` : `Favoritar ${material.title}`}
        className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-brand"
      >
        <Star aria-hidden className={cn("size-[18px]", fav && "fill-brand text-brand")} />
      </button>
    </div>
  );
}

function MaterialSheet({ material, fav, onFav, onClose }: { material: Material; fav: boolean; onFav: () => void; onClose: () => void }) {
  const K = KIND[material.kind];
  const lesson = material.lessonId ? LIBRARY_LESSONS.find((l) => l.id === material.lessonId) : undefined;
  return (
    <Sheet
      title={material.title}
      eyebrow={`${K.label} · ${MATERIAL_CATEGORY_LABEL[material.category]}`}
      onClose={onClose}
      footer={
        <Button variant="secondary" className="flex-1" onClick={onFav} aria-pressed={fav}>
          <Star aria-hidden className={cn("size-4", fav && "fill-brand text-brand")} />
          {fav ? "Nos favoritos" : "Favoritar"}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-4">
          <span className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl bg-blush shadow-card">
            {material.cover ? <Image src={material.cover} alt="" fill sizes="96px" className="object-cover" /> : null}
          </span>
          <div className="min-w-0 space-y-2">
            <DemoBadge label="Material de exemplo" />
            <p className="text-sm text-fg">{material.description}</p>
          </div>
        </div>
        <div role="note" className="flex items-start gap-3 rounded-2xl border border-dashed border-line-strong bg-canvas p-4">
          <FileClock aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-semibold text-fg">Arquivo ainda não disponível</p>
            <p className="mt-0.5 text-xs text-muted">O download aparece aqui quando a equipe enviar o material oficial. Nenhum arquivo é baixado nesta demonstração.</p>
          </div>
        </div>
        {lesson ? (
          <Link href={`/aulas/${lesson.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 transition-colors hover:border-brand/30">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wider text-subtle">Aula relacionada</span>
              <span className="line-clamp-2 text-sm font-medium text-fg">{lesson.title}</span>
            </span>
            <ArrowRight aria-hidden className="size-4 shrink-0 text-brand" />
          </Link>
        ) : (
          <Badge tone="neutral">Material NUMI</Badge>
        )}
      </div>
    </Sheet>
  );
}
