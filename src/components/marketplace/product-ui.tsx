"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ImageOff, Sparkles } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AVAILABILITY_LABEL, categoryLabel, commercialInfo, coverOf, originLabel } from "@/lib/products/display";
import type { Availability, Product } from "@/lib/products/types";
import { cn } from "@/lib/cn";

/** Foto do produto ou fallback visual (nunca imagem inventada). */
export function ProductVisual({ product, className, sizes = "(max-width: 640px) 40vw, 280px", priority }: { product: Product; className?: string; sizes?: string; priority?: boolean }) {
  const img = coverOf(product);
  return (
    <span className={cn("relative grid place-items-center overflow-hidden bg-blush text-brand", className)}>
      {img ? (
        <Image src={img.src} alt={img.alt} fill sizes={sizes} priority={priority} className="object-cover object-center" />
      ) : (
        <span className="px-2 text-center">
          <ImageOff aria-hidden className="mx-auto size-7" strokeWidth={1.5} />
          <span className="mt-1 block text-[0.65rem] font-medium leading-tight text-muted">Sem foto cadastrada</span>
        </span>
      )}
    </span>
  );
}

const AVAILABILITY_TONE: Record<Availability, "success" | "warning" | "neutral"> = {
  disponivel: "success",
  em_breve: "neutral",
  indisponivel: "warning",
  a_confirmar: "neutral",
};

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  return <Badge tone={AVAILABILITY_TONE[availability]}>{AVAILABILITY_LABEL[availability]}</Badge>;
}

export function OriginBadge({ product }: { product: Product }) {
  const o = originLabel(product);
  return o.demo ? <DemoBadge label={o.label} /> : <Badge tone="brand">{o.label}</Badge>;
}

export function SaveButton({ product, saved, onToggle, className }: { product: Product; saved: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remover ${product.name} dos salvos` : `Salvar ${product.name}`}
      className={cn("grid size-11 shrink-0 place-items-center rounded-full", className)}
    >
      <span className={cn("grid size-8 place-items-center rounded-full bg-paper shadow-card ring-1 ring-line", saved ? "text-brand" : "text-muted")}>
        <Heart aria-hidden className={cn("size-4", saved && "fill-brand")} />
      </span>
    </button>
  );
}

/** Preço · comissão · afiliação, com “A confirmar” para tudo que não foi verificado. */
export function CommercialRow({ product, compact }: { product: Product; compact?: boolean }) {
  const c = commercialInfo(product);
  const items = [
    { k: "Preço", v: c.price },
    { k: "Comissão", v: c.commission },
    { k: "Afiliação", v: c.affiliation },
  ];
  return (
    <dl className={cn("grid gap-1.5", compact ? "grid-cols-1 text-[0.7rem]" : "grid-cols-1 text-xs min-[380px]:grid-cols-3")}>
      {items.map(({ k, v }) => (
        <div key={k} className={cn("flex min-w-0 items-baseline justify-between gap-2", !compact && "min-[380px]:block min-[380px]:rounded-xl min-[380px]:border min-[380px]:border-line min-[380px]:p-2.5")}>
          <dt className="text-muted">{k}</dt>
          <dd className={cn("truncate font-medium", v.confirmed ? "text-fg" : "text-subtle")}>{v.label}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Card de produto (grade do Marketplace). */
export function ProductCard({
  product,
  saved,
  onToggleSave,
  onCreateScript,
}: {
  product: Product;
  saved: boolean;
  onToggleSave: () => void;
  onCreateScript: () => void;
}) {
  const href = `/marketplace/${product.id}`;
  const unavailable = product.availability === "indisponivel";
  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      <div className="flex min-w-0 gap-3 p-3 sm:flex-col sm:p-0">
        <Link href={href} tabIndex={-1} aria-label={`Foto de ${product.name}`} className="block shrink-0">
          <ProductVisual product={product} className="size-24 rounded-xl sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-none" />
        </Link>
        <div className="min-w-0 flex-1 sm:px-3.5 sm:pt-1">
          <div className="flex flex-wrap items-center gap-1.5 pr-9 sm:pr-0">
            <OriginBadge product={product} />
            {product.isNew ? <Badge tone="brand">Novidade</Badge> : null}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-[0.95rem] font-semibold leading-snug text-fg">{product.name}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {product.brand} · {categoryLabel(product.category)}
          </p>
          {product.shortDescription ? <p className="mt-1.5 line-clamp-2 text-xs text-muted">{product.shortDescription}</p> : null}
          <div className="mt-2">
            <AvailabilityBadge availability={product.availability} />
          </div>
        </div>
      </div>
      <div className="mt-auto space-y-3 px-3 pb-3 sm:px-3.5 sm:pb-3.5 sm:pt-3">
        <CommercialRow product={product} compact />
        <div className="grid grid-cols-2 gap-2">
          <Link href={href} aria-label={`Ver detalhes de ${product.name}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line-strong bg-card px-3 text-center text-sm font-semibold leading-tight text-fg transition-colors hover:border-brand/40 hover:bg-blush">
            Ver detalhes
          </Link>
          <Button size="sm" onClick={onCreateScript} disabled={unavailable} className="px-3 leading-tight whitespace-normal!" aria-label={`Criar roteiro para ${product.name}`}>
            <Sparkles aria-hidden className="size-4 shrink-0" />
            Criar roteiro
          </Button>
        </div>
      </div>
      <SaveButton product={product} saved={saved} onToggle={onToggleSave} className="absolute right-1 top-1 sm:right-1.5 sm:top-1.5" />
    </article>
  );
}
