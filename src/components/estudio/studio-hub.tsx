"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Clapperboard, Flame, Library, Trash2, UserRound, Video, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/demo/demo-provider";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { PageHeader } from "@/components/ui/page-header";
import { localDemoTextGenerator } from "@/lib/studio/provider";

const TOOLS = [
  {
    href: "/estudio-ia/personagem",
    n: 1,
    icon: Wand2,
    title: "Criar Personagem",
    description: "Monte as características e receba um prompt para criar uma imagem no Google Flow.",
    tag: "Prompt de imagem · Google Flow",
  },
  {
    href: "/estudio-ia/animar",
    n: 2,
    icon: Clapperboard,
    title: "Animar Personagem",
    description: "Use o personagem criado, escolha a fala e gere prompts de animação por cena para colar no Google Flow.",
    tag: "Prompts de vídeo por take · Google Flow",
  },
  {
    href: "/estudio-ia/roteiros",
    n: 3,
    icon: Video,
    title: "Roteiros para Gravar Aparecendo",
    description: "Descreva seu produto e receba dez roteiros escritos para gravar com seu próprio rosto.",
    tag: "10 roteiros · você grava com o celular",
  },
] as const;

/** Entrada do Estúdio IA: exatamente três ferramentas independentes, todas de TEXTO. */
export function StudioHub() {
  const { state, dispatch } = useDemo();
  const router = useRouter();
  const sheets = state.studioCharacters;
  const saved = state.prompts.saved;

  function animate(id: string, name: string) {
    dispatch({ type: "studio/seed", seed: { from: name, target: "animar", characterId: id } });
    router.push("/estudio-ia/animar");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<DemoBadge label={localDemoTextGenerator.label} />}
        title="Estúdio IA"
        description="Três ferramentas que escrevem texto para você: prompts para criar imagem e vídeo no Google Flow, e roteiros para gravar aparecendo."
      />

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 shadow-card transition-shadow hover:border-line-strong hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-wine text-on-wine">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">Ferramenta {t.n}</span>
                </span>
                <span className="mt-4 block font-serif text-lg font-semibold leading-snug text-fg">{t.title}</span>
                <span className="mt-1.5 block flex-1 text-sm text-muted">{t.description}</span>
                <span className="mt-4 block text-xs text-subtle">{t.tag}</span>
                <span className="mt-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg bg-brand px-5 text-sm font-semibold text-white group-hover:bg-brand-hover">
                  Abrir
                  <ArrowRight aria-hidden className="size-4" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Acesso auxiliar: Virais → escolher referência → Estúdio → criar conteúdo. Não é um 4º gerador. */}
      <Link
        href="/videos-virais"
        data-tool="videos-virais"
        className="group flex min-h-16 items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-blush text-brand">
          <Flame className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">Explorar vídeos virais</span>
          <span className="block text-sm text-muted">Encontre referências e adapte ideias para seus conteúdos.</span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-subtle group-hover:text-brand" />
      </Link>

      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="font-serif text-lg font-semibold text-fg">Como funciona</h2>
        <ol className="grid gap-2 text-sm text-fg/90 sm:grid-cols-2">
          <li className="rounded-xl bg-canvas p-3">
            <strong className="font-semibold">Com personagem:</strong> Criar Personagem → copiar o prompt → gerar a imagem no Google Flow → voltar → Animar Personagem → copiar os prompts por take → gerar
            os vídeos no Google Flow.
          </li>
          <li className="rounded-xl bg-canvas p-3">
            <strong className="font-semibold">Aparecendo:</strong> Roteiros para Gravar Aparecendo → descrever o produto → escolher e editar um dos 10 roteiros → gravar com o seu celular.
          </li>
        </ol>
        <p className="text-xs text-muted">
          O Estúdio só escreve texto. Imagens e vídeos são feitos fora do app, no Google Flow, e o resultado depende de lá. Nesta demonstração os textos vêm de um modelo local, sem IA.
        </p>
      </Card>

      {sheets.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-fg">
            <UserRound aria-hidden className="size-5 text-brand" />
            Fichas de personagem
          </h2>
          <ul className="mt-3 space-y-2">
            {sheets.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">{s.name}</span>
                  <span className="block text-xs text-muted">{s.summaryPt}</span>
                </span>
                <Button variant="secondary" className="min-h-10 px-3 text-xs" onClick={() => animate(s.id, s.name)}>
                  <Clapperboard aria-hidden className="size-4" />
                  Usar no Animador
                </Button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "studio/character-remove", id: s.id })}
                  aria-label={`Remover a ficha “${s.name}”`}
                  className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-brand"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Somem ao recarregar a página (demonstração em memória).</p>
        </Card>
      ) : null}

      {saved.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-fg">
            <Library aria-hidden className="size-5 text-brand" />
            Roteiros salvos nesta sessão
          </h2>
          <ul className="mt-3 space-y-2">
            {saved.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
                <span className="min-w-0 flex-1 text-sm font-medium text-fg">{p.title}</span>
                <CopyButton text={p.text} variant="secondary" className="min-h-10 px-3 text-xs" onCopied={() => dispatch({ type: "prompt/copied" })} />
                <button
                  type="button"
                  onClick={() => dispatch({ type: "prompt/remove", id: p.id })}
                  aria-label={`Remover “${p.title}”`}
                  className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-brand"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Somem ao recarregar a página (demonstração em memória).</p>
        </Card>
      ) : null}
    </div>
  );
}
