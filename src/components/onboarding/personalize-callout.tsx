import { ArrowRight, MessageCircleHeart, Route, Sparkles, SquarePen } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Chamada compacta exibida enquanto a aluna vê a trilha de EXEMPLO. */
export function PersonalizeBanner() {
  return (
    <section
      aria-labelledby="personalize-banner-title"
      className="flex flex-col gap-4 rounded-2xl border border-brand/25 bg-blush p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-brand shadow-card">
          <MessageCircleHeart aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="personalize-banner-title" className="font-serif text-lg font-semibold text-fg">
            Monte seu plano personalizado
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Você está vendo uma trilha de exemplo. Responda algumas perguntas rápidas e receba um plano feito para o seu
            formato e o seu tempo.
          </p>
        </div>
      </div>
      <ButtonLink href="/onboarding" className="shrink-0 self-start sm:self-center">
        Começar
        <ArrowRight aria-hidden className="size-4" />
      </ButtonLink>
    </section>
  );
}

/** Destaque principal no primeiro acesso (sem plano). */
export function PersonalizeHero({ titleId = "personalize-hero-title" }: { titleId?: string }) {
  const steps = [
    { icon: SquarePen, text: "Responda perguntas rápidas sobre seu momento, formato e tempo." },
    { icon: Route, text: "Receba etapas e atividades na ordem certa para você." },
    { icon: Sparkles, text: "Ajuste suas respostas quando quiser, sem perder o que já fez." },
  ];
  return (
    <Card className="relative overflow-hidden" aria-labelledby={titleId}>
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-blush" />
      <div className="relative p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          <MessageCircleHeart aria-hidden className="size-4" />
          Primeiro passo
        </p>
        <h2 id={titleId} className="mt-3 max-w-xl font-serif text-2xl font-semibold leading-tight text-fg sm:text-3xl">
          Monte seu plano personalizado
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Cerca de 2 minutos. O plano é montado por regras do método a partir das suas respostas — e a biblioteca
          completa de aulas continua disponível para você, independentemente do plano.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex gap-3 rounded-xl bg-canvas/80 p-3 text-sm text-fg">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-brand ring-1 ring-line">
                <Icon aria-hidden className="size-4" />
                <span className="sr-only">Passo {i + 1}</span>
              </span>
              {text}
            </li>
          ))}
        </ol>
        <ButtonLink href="/onboarding" size="lg" className="mt-6">
          Começar
          <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </div>
    </Card>
  );
}
