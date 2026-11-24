"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleCheck, CirclePlay, ImageOff, Info, Lock, Map as MapIcon, Undo2, Zap } from "lucide-react";
import { rememberStep, useJourney } from "@/components/plan/use-journey";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { catalog } from "@/lib/catalog";
import { neighbors, viewOf } from "@/lib/journey/journey";
import { printsFor } from "@/lib/journey/prints";
import { JOURNEY_STEPS } from "@/demo/journey-catalog";
import type { StepPrint, StepView } from "@/lib/journey/types";
import { cn } from "@/lib/cn";

const STEP_IDS = new Set(JOURNEY_STEPS.map((s) => s.id));

/** Tela de execução: UMA ação por vez, com print, resultado esperado e aula de apoio. */
export function JourneyStepView({ stepId }: { stepId: string }) {
  const router = useRouter();
  const { journey, complete, undo, choose } = useJourney();
  const [justDone, setJustDone] = useState<{ next: StepView | null; phaseDone: string | null } | null>(null);
  const [zoom, setZoom] = useState<StepPrint | null>(null);
  useLayoutEffect(() => {
    rememberStep(stepId);
    return () => setZoom(null);
  }, [stepId]);
  const prints = useMemo(() => printsFor(stepId, STEP_IDS), [stepId]);

  if (!journey) {
    return <EmptyState icon={MapIcon} title="Você ainda não tem um plano" description="Monte seu plano para ver as etapas." action={<ButtonLink href="/onboarding">Montar meu plano</ButtonLink>} />;
  }
  const v = viewOf(journey, stepId);
  if (!v) return <EmptyState icon={MapIcon} title="Etapa não encontrada" action={<ButtonLink href="/meu-plano">Voltar ao mapa</ButtonLink>} />;
  const { prev, next } = neighbors(journey, stepId);
  const phase = journey.phases.find((p) => p.phase.id === v.step.phase);
  const s = v.step;
  const lessons = s.lessons.map((id) => catalog.getLesson(id)).filter((l) => l !== undefined);
  // Volta ao mapa já posicionado nesta etapa (rolagem por âncora, feita pelo roteador).
  const goMap = () => {
    rememberStep(stepId);
    router.push(`/meu-plano#no-${stepId}`);
  };
  const go = (id: string) => {
    setJustDone(null);
    router.push(`/meu-plano/etapa/${id}`);
  };

  function onComplete() {
    const after = complete(stepId);
    const phaseView = journey!.phases.find((p) => p.phase.id === s.phase);
    const remaining = phaseView ? phaseView.steps.filter((x) => x.applicable && !x.done && x.step.id !== stepId).length : 1;
    setJustDone({ next: after, phaseDone: remaining === 0 ? (phaseView?.phase.title ?? null) : null });
  }

  return (
    <article className="mx-auto max-w-2xl" aria-labelledby="etapa-titulo">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={goMap} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:text-brand">
          <ArrowLeft aria-hidden className="size-4" />
          Mapa
        </button>
        {phase ? (
          <span className="flex items-center gap-2 text-xs text-muted">
            <span aria-hidden className="block h-1 w-16 overflow-hidden rounded-full bg-blush-strong">
              <span className="block h-full bg-wine" style={{ width: `${phase.total ? Math.round((phase.done / phase.total) * 100) : 0}%` }} />
            </span>
            {phase.done}/{phase.total} nesta fase
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
        {v.phase.title}
        {v.applicable ? ` · Etapa ${v.number}` : ""}
      </p>
      <h1 id="etapa-titulo" className="mt-1.5 font-serif text-[1.7rem] font-semibold leading-[1.15] text-fg sm:text-[2.1rem]">
        {s.title}
      </h1>

      {/* Estados que impedem agir */}
      {!v.applicable ? (
        <Notice tone="neutral" icon={Info} title="Esta etapa não se aplica a você">
          {v.reason}
        </Notice>
      ) : v.state === "bloqueada" ? (
        <Notice tone="neutral" icon={Lock} title="Ainda bloqueada">
          Conclua antes:
          <ul className="mt-1 space-y-1">
            {v.missing.map((m) => (
              <li key={m.id}>
                <Link href={`/meu-plano/etapa/${m.id}`} className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand hover:underline">
                  {m.title}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </Notice>
      ) : v.done && !justDone ? (
        <Notice tone="success" icon={CircleCheck} title="Etapa concluída">
          Você pode rever as instruções quando quiser.
        </Notice>
      ) : null}

      <p className="mt-4 text-[1.0625rem] leading-relaxed text-fg sm:text-lg">{v.instruction}</p>

      {/* Decisão: escolher o caminho */}
      {s.kind === "decisao" && v.applicable ? (
        <div role="group" aria-label={s.title} className="mt-5 grid gap-3">
          {(s.options ?? []).map((o) => {
            const on = (o.id === "tenho" && journey.flags.hasAccount === true) || (o.id === "nao-tenho" && journey.flags.hasAccount === false);
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const after = choose(stepId, o.id);
                  setJustDone({ next: after, phaseDone: null });
                }}
                className={cn("flex min-h-16 items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors", on ? "border-brand bg-blush/70" : "border-line bg-card hover:border-line-strong")}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", on ? "border-brand bg-brand text-white" : "border-line-strong")}>{on ? <Check aria-hidden className="size-4" /> : null}</span>
                <span>
                  <span className="block font-semibold text-fg">{o.label}</span>
                  {o.hint ? <span className="block text-sm text-muted">{o.hint}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Prints (só ações) */}
      {s.kind === "acao" ? <Prints prints={prints} onZoom={setZoom} /> : null}

      {/* Resultado esperado */}
      {s.kind !== "decisao" ? (
        <div className="mt-5 flex gap-3 rounded-xl border border-line border-l-[3px] border-l-success bg-card p-4">
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold text-success">Resultado esperado</p>
            <p className="text-sm text-muted">{v.expected}</p>
          </div>
        </div>
      ) : null}

      {s.procedureReview ? <p className="mt-3 text-xs text-muted">Os passos do TikTok podem mudar. Este procedimento ainda será confirmado pela equipe.</p> : null}

      {v.shortcut ? (
        <ButtonLink href={v.shortcut.href} variant="secondary" className="mt-4 w-full sm:w-auto">
          <Zap aria-hidden className="size-4" />
          {v.shortcut.label}
        </ButtonLink>
      ) : null}

      {/* Aula de apoio */}
      {s.kind !== "decisao" && s.kind !== "confirmacao" ? (
        <section aria-labelledby="apoio" className="mt-6">
          <h2 id="apoio" className="text-xs font-semibold uppercase tracking-[0.1em] text-subtle">
            {s.kind === "aula" ? "Aula desta etapa" : "Precisa de ajuda?"}
          </h2>
          {lessons.length ? (
            <ul className="mt-2 space-y-2">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/aulas/${l.id}?etapa=${stepId}`}
                    onClick={() => rememberStep(stepId)}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition-colors hover:border-brand/30"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-wine text-on-wine">
                      <CirclePlay aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">{s.kind === "aula" ? "Assistir à aula" : "Assistir aula de apoio"}</span>
                      <span className="block truncate text-sm text-muted">{l.title}</span>
                    </span>
                    {l.origin === "demonstrativo" ? <DemoBadge label="Aula de exemplo" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 flex items-center gap-2 rounded-2xl border border-dashed border-line p-3 text-sm text-muted">
              <BookOpen aria-hidden className="size-4" />
              Aula de apoio ainda não cadastrada.
            </p>
          )}
          {s.kind === "aula" ? <p className="mt-2 text-xs text-muted">Depois de assistir, volte aqui e marque a etapa. Aulas de apoio de outras etapas não marcam ações práticas como feitas.</p> : null}
        </section>
      ) : null}

      {/* Anterior / próxima */}
      <nav aria-label="Navegação entre etapas" className="mt-8 grid grid-cols-2 gap-2">
        {prev ? (
          <Link href={`/meu-plano/etapa/${prev.step.id}`} className="flex min-h-12 flex-col justify-center rounded-2xl border border-line px-3 text-left hover:border-brand/30">
            <span className="text-xs text-muted">Anterior</span>
            <span className="truncate text-sm font-medium text-fg">{prev.step.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/meu-plano/etapa/${next.step.id}`} className="flex min-h-12 flex-col justify-center rounded-2xl border border-line px-3 text-right hover:border-brand/30">
            <span className="text-xs text-muted">Seguinte</span>
            <span className="truncate text-sm font-medium text-fg">{next.step.title}</span>
          </Link>
        ) : null}
      </nav>

      {/* Ação principal, sempre ao alcance do polegar (acima da barra inferior) */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mt-6 lg:bottom-4">
        <div className="rounded-2xl border border-line-strong/60 bg-card/95 p-3 shadow-raised backdrop-blur supports-[backdrop-filter]:bg-card/90">
          {justDone ? (
            // Empilhado: a mensagem tem a linha inteira (nunca fica sob os botões) e as ações vêm abaixo.
            <div role="status" className="space-y-3">
              <p className="flex items-center gap-2.5 text-sm font-semibold leading-snug text-success">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success text-white motion-safe:animate-[mvf-pop_240ms_ease-out]">
                  <Check aria-hidden className="size-4" />
                </span>
                <span className="min-w-0">{justDone.phaseDone ? `Fase concluída: ${justDone.phaseDone}` : s.kind === "decisao" ? "Resposta registrada" : "Etapa concluída"}</span>
              </p>
              <div className="flex gap-2">
                {justDone.next ? (
                  <Button onClick={() => go(justDone.next!.step.id)} className="flex-1">
                    Próxima etapa
                    <ArrowRight aria-hidden className="size-4" />
                  </Button>
                ) : (
                  <Button onClick={goMap} className="flex-1">
                    Ver mapa
                  </Button>
                )}
                {justDone.next ? (
                  <Button variant="secondary" onClick={goMap} className="shrink-0">
                    Mapa
                  </Button>
                ) : null}
              </div>
            </div>
          ) : v.applicable && v.done && s.kind !== "decisao" ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-fg">
                <CircleCheck aria-hidden className="size-5 shrink-0 text-success" /> Concluída
              </p>
              <div className="flex gap-2">
                {journey.current ? (
                  <Button onClick={() => go(journey.current!.step.id)} className="min-w-0 flex-1 whitespace-normal! leading-tight">
                    Ir para a etapa atual
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => undo(stepId)} className={journey.current ? "shrink-0" : "flex-1"}>
                  <Undo2 aria-hidden className="size-4" />
                  Desfazer
                </Button>
              </div>
            </div>
          ) : s.kind === "decisao" ? (
            <p className="text-center text-sm text-muted">{v.done ? "Você já respondeu. Pode mudar a resposta acima." : "Escolha uma opção acima para continuar."}</p>
          ) : v.applicable && v.state !== "bloqueada" ? (
            <Button size="lg" className="w-full" onClick={onComplete}>
              <Check aria-hidden className="size-5" />
              {s.kind === "confirmacao" ? "Confirmo" : "Concluí esta etapa"}
            </Button>
          ) : (
            <Button size="lg" variant="secondary" className="w-full" onClick={() => (journey.current ? go(journey.current.step.id) : goMap())}>
              {journey.current ? "Ir para a etapa atual" : "Voltar ao mapa"}
            </Button>
          )}
        </div>
      </div>

      {zoom ? (
        <Sheet title={zoom.caption || "Print da etapa"} eyebrow={zoom.screen} size="lg" onClose={() => setZoom(null)}>
          <PrintImage print={zoom} large />
        </Sheet>
      ) : null}
    </article>
  );
}

function Notice({ tone, icon: Icon, title, children }: { tone: "neutral" | "success"; icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <div className={cn("mt-4 flex gap-3 rounded-2xl p-4 text-sm", tone === "success" ? "bg-success-soft text-success" : "bg-canvas text-muted")}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0">
        <p className={cn("font-semibold", tone === "success" ? "text-success" : "text-fg")}>{title}</p>
        <div>{children}</div>
      </div>
    </div>
  );
}

function Prints({ prints, onZoom }: { prints: StepPrint[]; onZoom: (p: StepPrint) => void }) {
  if (!prints.length) {
    return (
      <figure className="mt-5 flex items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface p-4">
        <span aria-hidden className="grid h-24 w-14 shrink-0 place-items-center rounded-xl border-2 border-line-strong bg-card text-subtle">
          <ImageOff className="size-5" />
        </span>
        <figcaption className="text-sm text-muted">
          <span className="block font-semibold text-fg">Print desta etapa pendente de cadastro</span>
          A equipe vai adicionar a captura real mostrando onde tocar.
        </figcaption>
      </figure>
    );
  }
  return (
    <ol className="mt-5 space-y-4" aria-label="Prints da etapa">
      {prints.map((p, i) => (
        <li key={p.src}>
          <figure>
            <button type="button" onClick={() => onZoom(p)} aria-label={`Ampliar print ${i + 1}: ${p.alt}`} className="block w-full overflow-hidden rounded-2xl border border-line bg-card">
              <PrintImage print={p} />
            </button>
            <figcaption className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              {prints.length > 1 ? <Badge tone="neutral">{i + 1}</Badge> : null}
              {p.caption}
              <span className="text-subtle">· {p.screen} · {p.capturedAt.split("-").reverse().join("/")}</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ol>
  );
}

function PrintImage({ print, large }: { print: StepPrint; large?: boolean }) {
  return (
    <span className={cn("relative mx-auto block aspect-[9/19.5] w-full", large ? "max-w-sm" : "max-h-[70vh] max-w-[18rem]")}>
      <Image src={print.src} alt={print.alt} fill sizes={large ? "384px" : "288px"} className="object-contain" />
      {print.tapHint ? (
        <span
          aria-hidden
          className="absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-brand bg-brand/20 motion-safe:animate-pulse"
          style={{ left: `${print.tapHint.x}%`, top: `${print.tapHint.y}%` }}
        />
      ) : null}
    </span>
  );
}
