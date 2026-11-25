import { ArrowRight, MessageCircleHeart, Route, Sparkles, SquarePen } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/** Chamada compacta exibida enquanto a aluna vê a trilha de EXEMPLO. */
export function PersonalizeBanner() {
  return (
    <section
      aria-labelledby="personalize-banner-title"
      className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blush text-brand">
          <MessageCircleHeart aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="personalize-banner-title" className="font-serif text-base font-semibold text-fg">
            Monte seu plano personalizado
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Você está vendo uma trilha de exemplo. Responda algumas perguntas rápidas e receba um plano feito para o seu
            formato e o seu tempo.
          </p>
        </div>
      </div>
      <ButtonLink href="/onboarding" variant="secondary" className="shrink-0 self-start sm:self-center">
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
    <section className="mvf-on-wine relative overflow-hidden rounded-2xl bg-wine-deep text-on-wine shadow-raised" aria-labelledby={titleId}>
      <div className="relative p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          <MessageCircleHeart aria-hidden className="size-4" />
          Primeiro passo
        </p>
        <h2 id={titleId} className="mt-3 max-w-xl font-serif text-2xl font-semibold leading-tight text-on-wine sm:text-3xl">
          Monte seu plano personalizado
        </h2>
        <p className="mt-2 max-w-xl text-sm text-on-wine-muted">
          Cerca de 2 minutos. O plano é montado por regras do método a partir das suas respostas — e a biblioteca
          completa de aulas continua disponível para você, independentemente do plano.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex gap-3 rounded-lg bg-wine-soft/60 p-3 text-sm text-on-wine">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-wine text-accent ring-1 ring-paper/10">
                <Icon aria-hidden className="size-4" />
                <span className="sr-only">Passo {i + 1}</span>
              </span>
              {text}
            </li>
          ))}
        </ol>
        <ButtonLink href="/onboarding" variant="inverse" size="lg" className="mt-6">
          Começar
          <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </div>
    </section>
  );
}
