"use client";

import { ArrowRight, CircleCheckBig } from "lucide-react";
import { usePlan } from "@/components/plan/plan-provider";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/badge";
import { greetingName } from "@/lib/greeting";
import { formatMinutes, getNextTask, getStage } from "@/lib/plan";

/** Confirmação após criar/atualizar o plano, com o próximo passo real. */
export function OnboardingDone({
  headingRef,
  updated,
}: {
  headingRef: React.Ref<HTMLHeadingElement>;
  updated: boolean;
}) {
  const { plan, profile, statusMap, persistence } = usePlan();
  if (!plan) return null;
  const next = getNextTask(plan, statusMap);
  const stage = next ? getStage(plan, next.stageId) : undefined;

  return (
    <div className="mvf-step mx-auto max-w-2xl">
      <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-raised">
        <div className="bg-blush/60 px-6 py-8 text-center sm:px-10">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success text-white">
            <CircleCheckBig aria-hidden className="size-7" />
          </span>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 font-serif text-2xl font-semibold text-fg outline-none sm:text-3xl"
          >
            {updated ? "Plano atualizado" : `Seu plano está pronto, ${greetingName(profile)}!`}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {plan.title} · {plan.stages.length} etapas · {plan.tasks.length} atividades · cerca de{" "}
            {plan.totalDaysSuggested} dias sugeridos
          </p>
          <div className="mt-3 flex justify-center">
            <DemoBadge label={persistence === "server" ? "Salvo na sua conta" : "Guardado só nesta aba (modo demo)"} />
          </div>
        </div>

        {next && stage ? (
          <div className="px-6 py-6 sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Seu próximo passo</p>
            <p className="mt-1 font-serif text-xl font-semibold text-fg">{next.title}</p>
            <p className="mt-1 text-sm text-muted">
              Etapa {stage.order} · {stage.title} · {formatMinutes(next.durationMinutes)}
            </p>
            <p className="mt-3 rounded-xl bg-canvas p-3 text-sm text-fg">{next.whyInPlan}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-line px-6 py-5 sm:px-10">
          <ButtonLink href="/meu-plano" size="lg">
            Ver meu plano
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
          <ButtonLink href="/inicio" variant="secondary" size="lg">
            Ir para o Início
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
