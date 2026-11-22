"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Clapperboard, ExternalLink, FileText, ImageOff, ListPlus, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chips";
import { catalog } from "@/lib/catalog";
import { productCatalog } from "@/lib/products";
import { categoryLabel, commercialInfo, visibleBenefits } from "@/lib/products/display";
import { missingForRecording, studioProductSeed } from "@/lib/products/studio-bridge";
import type { Product } from "@/lib/products/types";
import type { RecordingStyle } from "@/lib/studio/contracts";
import { STYLE_LABEL } from "@/lib/studio/recording-scripts";
import { cn } from "@/lib/cn";
import { materialsOf } from "./my-products";
import { AvailabilityBadge, CommercialRow, OriginBadge, SaveButton } from "./product-ui";
import { useProductActions } from "./use-product-actions";

const STYLES = (Object.keys(STYLE_LABEL) as RecordingStyle[]).filter((s) => s !== "livre");

export function ProductDetail({ productId }: { productId: string }) {
  const product = productCatalog.get(productId);
  if (!product) return null; // a página já respondeu 404
  return <Detail product={product} />;
}

function Detail({ product: p }: { product: Product }) {
  const { saved, mine, toggleSave, setPromote, toRecording, toAnimator } = useProductActions();
  const [style, setStyle] = useState<RecordingStyle>("rotina");
  const isMine = mine.includes(p.id);
  const c = commercialInfo(p);
  const benefits = visibleBenefits(p);
  const mats = materialsOf(p);
  const lessons = p.lessonIds.map((id) => catalog.getLesson(id)).filter((l) => l !== undefined);
  const missing = missingForRecording(studioProductSeed(p));
  const unavailable = p.availability === "indisponivel";

  return (
    <div className="space-y-5">
      <Link href="/marketplace" className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft aria-hidden className="size-4" />
        Marketplace
      </Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
        <Gallery product={p} />

        <div className="min-w-0 space-y-5">
          <header>
            <div className="flex flex-wrap items-center gap-1.5">
              <OriginBadge product={p} />
              {p.isNew ? <Badge tone="brand">Novidade</Badge> : null}
              <AvailabilityBadge availability={p.availability} />
            </div>
            <div className="mt-2 flex items-start gap-2">
              <h1 className="min-w-0 flex-1 font-serif text-[1.75rem] font-semibold leading-tight tracking-tight text-fg sm:text-4xl">{p.name}</h1>
              <SaveButton product={p} saved={saved.includes(p.id)} onToggle={() => toggleSave(p.id)} className="-mr-1.5 -mt-0.5" />
            </div>
            <p className="mt-1 text-sm text-muted">
              {p.brand} · {categoryLabel(p.category)}
            </p>
            {p.shortDescription ? <p className="mt-2 text-[0.95rem] text-fg">{p.shortDescription}</p> : null}
          </header>

          <Button
            variant={isMine ? "secondary" : "primary"}
            className="w-full sm:w-auto"
            aria-pressed={isMine}
            onClick={() => setPromote(p.id, !isMine)}
          >
            {isMine ? <Check aria-hidden className="size-4" /> : <ListPlus aria-hidden className="size-4" />}
            {isMine ? "Em Meus produtos" : "Quero divulgar"}
          </Button>
          {isMine ? <p className="-mt-3 text-xs text-muted">Adicionado à sua lista no app. Isso não faz a afiliação no TikTok Shop.</p> : null}

          {/* Preparar divulgação no Estúdio IA */}
          <section aria-labelledby="pd-estudio" className="space-y-3 rounded-2xl border border-brand/20 bg-blush/50 p-4">
            <h2 id="pd-estudio" className="font-semibold text-fg">
              Preparar divulgação no Estúdio IA
            </h2>
            <div>
              <p className="mb-2 text-xs font-medium text-fg">Estilo do vídeo (dá para trocar no Estúdio)</p>
              <ChipGroup label="Estilo do vídeo" value={style} onChange={setStyle} options={STYLES.map((s) => ({ value: s, label: STYLE_LABEL[s] }))} />
            </div>
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              <Button onClick={() => toRecording(p, style)} disabled={unavailable} className="leading-tight whitespace-normal!">
                <Sparkles aria-hidden className="size-4 shrink-0" />
                Criar roteiro
              </Button>
              <Button variant="secondary" onClick={() => toAnimator(p)} disabled={unavailable} className="leading-tight whitespace-normal!">
                <Clapperboard aria-hidden className="size-4 shrink-0" />
                Enviar ao Animador
              </Button>
            </div>
            <p className="text-xs text-muted">
              {unavailable
                ? "Produto indisponível no momento: o envio ao Estúdio fica bloqueado."
                : missing.length
                  ? `O cadastro ainda não tem ${missing.join(" e ")}: você completa no Estúdio com as informações reais.`
                  : "O Estúdio recebe só o que está cadastrado aqui (sem preço nem comissão). Você revisa e edita antes de gerar."}
            </p>
          </section>

          <Block title="Descrição" show={Boolean(p.description)}>
            <p className="whitespace-pre-line text-sm text-fg">{p.description}</p>
          </Block>
          <Block title="Modo de uso" show={Boolean(p.howToUse)}>
            <p className="whitespace-pre-line text-sm text-fg">{p.howToUse}</p>
          </Block>
          <Block title="Características" show={p.characteristics.length > 0}>
            <Bullets items={p.characteristics} />
          </Block>
          <Block title="Benefícios aprovados pela marca" show={benefits.length > 0}>
            <Bullets items={benefits} />
          </Block>
          <Block title="Informações e restrições" show={p.restrictions.length > 0}>
            <ul className="space-y-1.5">
              {p.restrictions.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-fg">
                  <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                  {r}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Condições comerciais" show>
            <CommercialRow product={p} />
            <div className="mt-3 space-y-1.5 text-xs text-muted">
              {c.price.detail ? <p>Preço: {c.price.detail}</p> : null}
              {c.commission.detail ? <p>Comissão autorizada: {c.commission.detail}</p> : null}
              {c.conditions ? <p className="whitespace-pre-line text-sm text-fg">{c.conditions}</p> : <p>Condições de afiliação: a confirmar pela equipe.</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.affiliateUrl ? <ExternalButton href={c.affiliateUrl} label="Link oficial de afiliação" /> : null}
              {c.productUrl ? <ExternalButton href={c.productUrl} label="Página oficial do produto" /> : null}
              {!c.affiliateUrl && !c.productUrl ? <p className="text-xs text-muted">Link oficial ainda não cadastrado.</p> : null}
            </div>
          </Block>

          <Block title="Materiais de divulgação" show={mats.length > 0}>
            <ul className="space-y-2">
              {mats.map((m) => (
                <li key={m.id} className="flex items-start gap-2.5 text-sm">
                  <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="font-medium text-fg">{m.title}</span>
                    <span className="block text-xs text-muted">{m.file ? "Disponível na Central de Materiais" : "Arquivo ainda não disponível"}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/materiais" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">
              Abrir a Central de Materiais
            </Link>
          </Block>

          <Block title="Aulas relacionadas" show={lessons.length > 0}>
            <ul className="space-y-1">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/aulas/${l.id}`} className="flex min-h-10 items-center gap-2 text-sm font-medium text-fg hover:text-brand">
                    <BookOpen aria-hidden className="size-4 shrink-0 text-brand" />
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Block>

          {p.origin === "demonstrativo" ? (
            <p className="rounded-xl bg-canvas p-3 text-xs text-muted">
              Produto demonstrativo: textos de exemplo para treinar, sem marca real, preço, comissão ou benefício.
            </p>
          ) : p.approval !== "aprovado" ? (
            <p className="rounded-xl bg-canvas p-3 text-xs text-muted">
              Cadastro oficial em preenchimento: mostramos só o que a equipe já confirmou. Não use outras informações sobre o produto nos seus vídeos.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Gallery({ product: p }: { product: Product }) {
  const [i, setI] = useState(0);
  const img = p.images[Math.min(i, p.images.length - 1)];
  return (
    <div className="min-w-0 space-y-2 lg:sticky lg:top-24">
      <div className={cn("relative w-full overflow-hidden rounded-2xl bg-blush", img ? "aspect-[4/5] max-h-[28rem] sm:aspect-square" : "h-32 sm:h-44")}>
        {img ? (
          <Image src={img.src} alt={img.alt} fill priority sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-brand">
            <div className="text-center">
              <ImageOff aria-hidden className="mx-auto size-8" strokeWidth={1.4} />
              <p className="mt-1.5 text-sm font-medium text-muted">Sem foto cadastrada</p>
            </div>
          </div>
        )}
      </div>
      {img?.kind === "capa-oficial" ? <p className="text-xs text-muted">Arte oficial da área de membros (não é foto de catálogo).</p> : null}
      {p.images.length > 1 ? (
        <div role="group" aria-label="Fotos do produto" className="flex gap-2 overflow-x-auto pb-1">
          {p.images.map((im, k) => (
            <button
              key={im.src}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Foto ${k + 1} de ${p.images.length}`}
              aria-current={k === i}
              className={cn("relative size-16 shrink-0 overflow-hidden rounded-xl ring-2", k === i ? "ring-brand" : "ring-transparent")}
            >
              <Image src={im.src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Block({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <h2 className="mb-2 font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-sm text-fg">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
          {t}
        </li>
      ))}
    </ul>
  );
}

function ExternalButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold text-fg hover:border-brand/40 hover:bg-blush"
    >
      {label}
      <ExternalLink aria-hidden className="size-4" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}
