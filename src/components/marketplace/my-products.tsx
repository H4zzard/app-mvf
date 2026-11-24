"use client";

import Link from "next/link";
import { Clapperboard, FileText, Info, ListChecks, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DEMO_MATERIALS } from "@/demo/materials";
import { productCatalog } from "@/lib/products";
import { pickInOrder } from "@/lib/products/filters";
import type { Product } from "@/lib/products/types";
import { AvailabilityBadge, OriginBadge, ProductVisual } from "./product-ui";
import { useProductActions } from "./use-product-actions";

export const materialsOf = (p: Product) => DEMO_MATERIALS.filter((m) => p.materialIds.includes(m.id));

/** “Meus produtos”: lista pessoal de quem a aluna quer divulgar (demo, em memória). */
export function MyProducts({ onExplore }: { onExplore: () => void }) {
  const { mine, setPromote, toRecording, toAnimator } = useProductActions();
  const items = pickInOrder(productCatalog.all(), mine);

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          Esta é a sua lista de trabalho no app. <strong className="font-semibold text-fg">Ela não faz a afiliação no TikTok Shop</strong>: isso acontece
          na plataforma, seguindo as aulas oficiais. Na demonstração, a lista some ao recarregar a página.
        </span>
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sua lista está vazia"
          description="Abra um produto e toque em “Quero divulgar” para trazê-lo para cá."
          action={
            <Button variant="secondary" onClick={onExplore}>
              Explorar produtos
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((p) => {
            const mats = materialsOf(p);
            const unavailable = p.availability === "indisponivel";
            return (
              <li key={p.id} className="rounded-2xl border border-line bg-card p-3 shadow-card sm:p-4">
                <div className="flex min-w-0 gap-3">
                  <Link href={`/marketplace/${p.id}`} tabIndex={-1} aria-label={`Foto de ${p.name}`} className="shrink-0">
                    <ProductVisual product={p} className="size-16 rounded-xl sm:size-20" sizes="80px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[0.95rem] font-semibold leading-snug text-fg">{p.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <OriginBadge product={p} />
                      <AvailabilityBadge availability={p.availability} />
                    </div>
                  </div>
                </div>

                <details className="group mt-3 rounded-xl bg-canvas px-3 py-2 text-sm">
                  <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 font-medium text-fg [&::-webkit-details-marker]:hidden">
                    <FileText aria-hidden className="size-4 text-brand" />
                    Materiais ({mats.length})
                  </summary>
                  {mats.length ? (
                    <ul className="mt-1 space-y-1.5 pb-1">
                      {mats.map((m) => (
                        <li key={m.id} className="text-xs text-muted">
                          <span className="font-medium text-fg">{m.title}</span> · {m.file ? "disponível" : "arquivo ainda não disponível"}
                        </li>
                      ))}
                      <li>
                        <Link href="/materiais" className="text-xs font-semibold text-brand hover:underline">
                          Abrir a Central de Materiais
                        </Link>
                      </li>
                    </ul>
                  ) : (
                    <p className="mt-1 pb-1 text-xs text-muted">Nenhum material cadastrado para este produto.</p>
                  )}
                </details>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button size="sm" onClick={() => toRecording(p)} disabled={unavailable} className="px-3 leading-tight whitespace-normal!">
                    <Sparkles aria-hidden className="size-4 shrink-0" />
                    Criar roteiro
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toAnimator(p)} disabled={unavailable} className="px-3 leading-tight whitespace-normal!">
                    <Clapperboard aria-hidden className="size-4 shrink-0" />
                    Animar
                  </Button>
                  <Link
                    href={`/marketplace/${p.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line-strong bg-card px-3 text-sm font-semibold text-fg hover:border-brand/40 hover:bg-blush"
                  >
                    Ver detalhes
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setPromote(p.id, false)} className="px-3" aria-label={`Remover ${p.name} de Meus produtos`}>
                    <Trash2 aria-hidden className="size-4" />
                    Remover da lista
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
