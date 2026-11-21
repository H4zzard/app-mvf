"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Clock, Info, ListChecks, MessageCircleHeart, SkipForward } from "lucide-react";
import type { OnboardingAnswers } from "@/types";
import type { QuestionId } from "@/config/onboarding-questions";
import {
  ONBOARDING_GREETING,
  formatAnswer,
  getQuestion,
  getVisibleQuestions,
  sanitizeAnswers,
  validateProfile,
  validateQuestion,
} from "@/config/onboarding-questions";
import { usePlan } from "@/components/plan/plan-provider";
import { AssistantMessage, UserReply } from "@/components/onboarding/assistant-message";
import { QuestionField } from "@/components/onboarding/question-field";
import { AnswersSummary } from "@/components/onboarding/answers-summary";
import { PlanChangeDialog } from "@/components/onboarding/plan-change-dialog";
import { OnboardingDone } from "@/components/onboarding/onboarding-done";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { buildPlan } from "@/lib/personalization/engine";
import { diffPlans, type PlanDiff } from "@/lib/personalization/diff";

type Step =
  | { kind: "intro" }
  | { kind: "question"; id: QuestionId; fromReview: boolean }
  | { kind: "review" }
  | { kind: "done" };

interface FlowState {
  /** Revisão do store em que este fluxo começou; se mudar, o fluxo reinicia. */
  baseRevision: number;
  step: Step;
  answers: OnboardingAnswers;
  /** Ajuste de um plano existente (pede confirmação com prévia). */
  editing: boolean;
}

const SAVE_ERRORS: Record<string, string> = {
  conflict:
    "Seu plano foi alterado em outro dispositivo ou aba. Recarregue a página para ver a versão mais recente antes de ajustar.",
  unauthenticated: "Sua sessão expirou. Entre novamente — suas respostas desta tela não foram salvas.",
  forbidden: "Seu acesso não está ativo no momento. Fale com o suporte do MVF.",
  network: "Não foi possível salvar agora. Verifique sua conexão e tente de novo.",
  invalid: "Algumas respostas não são válidas. Revise e tente de novo.",
  server: "Não foi possível salvar agora. Tente de novo em instantes.",
};

/** Sem plano: começa na intro ou retoma o rascunho salvo na primeira pergunta pendente. */
function initialFromDraft(revision: number, draft: OnboardingAnswers | null): FlowState {
  const answers = draft ?? {};
  if (Object.keys(answers).length === 0) return { baseRevision: revision, step: { kind: "intro" }, answers: {}, editing: false };
  const pending = getVisibleQuestions(answers).find((q) => validateQuestion(q, answers) !== null);
  return {
    baseRevision: revision,
    step: pending ? { kind: "question", id: pending.id, fromReview: false } : { kind: "review" },
    answers,
    editing: false,
  };
}

function stepKey(step: Step): string {
  return step.kind === "question" ? `q-${step.id}` : step.kind;
}

export function OnboardingFlow() {
  const { profile, revision, plan, mode, statusMap, applyProfile, draft, saveDraft, persistence } = usePlan();
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [pendingDiff, setPendingDiff] = useState<PlanDiff | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusOnStepChange = useRef(false);

  // Estado efetivo: se o store mudou (novo plano, “simular primeiro acesso”),
  // o rascunho antigo é descartado e o fluxo recomeça a partir do store.
  const current: FlowState =
    flow && flow.baseRevision === revision
      ? flow
      : profile
        ? { baseRevision: revision, step: { kind: "review" }, answers: profile, editing: true }
        : initialFromDraft(revision, draft);

  const { step, answers, editing } = current;
  const visible = getVisibleQuestions(answers);

  // Ao sair da tela (Activity a esconde), a confirmação “pronto” não deve reaparecer.
  useLayoutEffect(
    () => () => {
      setFlow((f) => (f?.step.kind === "done" ? null : f));
      setPendingDiff(null);
      setSaveError(null);
    },
    [],
  );

  // Leva o foco ao título de cada nova etapa (leitores de tela e teclado).
  const key = stepKey(step);
  useEffect(() => {
    if (focusOnStepChange.current) {
      focusOnStepChange.current = false;
      headingRef.current?.focus();
    }
  }, [key]);

  function go(next: Partial<FlowState>) {
    focusOnStepChange.current = true;
    setFlow({ ...current, ...next });
  }

  function setAnswer(value: unknown) {
    if (step.kind !== "question") return;
    const field = getQuestion(step.id).field;
    setFlow({ ...current, answers: { ...answers, [field]: value } });
  }

  function firstInvalid(a: OnboardingAnswers) {
    return getVisibleQuestions(a).find((q) => validateQuestion(q, a) !== null);
  }

  function advance(fromAnswers: OnboardingAnswers) {
    if (step.kind !== "question") return;
    const clean = sanitizeAnswers(fromAnswers);
    const list = getVisibleQuestions(clean);
    if (step.fromReview) {
      // Editando a partir do resumo: só passa por perguntas que ficaram pendentes
      // (ex.: mudou “aparecer” para “não” → precisa escolher formatos).
      const missing = firstInvalid(clean);
      go({
        answers: clean,
        step: missing ? { kind: "question", id: missing.id, fromReview: true } : { kind: "review" },
      });
      return;
    }
    const index = list.findIndex((q) => q.id === step.id);
    const nextQ = list[index + 1];
    if (!editing) saveDraft(clean); // retomar depois, inclusive em outro dispositivo (modo real)
    go({ answers: clean, step: nextQ ? { kind: "question", id: nextQ.id, fromReview: false } : { kind: "review" } });
  }

  function back() {
    if (step.kind === "review") {
      const last = visible[visible.length - 1];
      go({ step: { kind: "question", id: last.id, fromReview: false } });
      return;
    }
    if (step.kind !== "question") return;
    if (step.fromReview) return go({ step: { kind: "review" } });
    const index = visible.findIndex((q) => q.id === step.id);
    if (index > 0) go({ step: { kind: "question", id: visible[index - 1].id, fromReview: false } });
    else go({ step: editing ? { kind: "review" } : { kind: "intro" } });
  }

  /** Grava no servidor (modo real) e só então mostra a confirmação. */
  async function commit(wasEditing: boolean) {
    const result = validateProfile(answers);
    if (!result.ok || saving) return;
    setSaving(true);
    setSaveError(null);
    const r = await applyProfile(result.profile);
    setSaving(false);
    if (!r.ok) {
      setPendingDiff(null);
      setSaveError(SAVE_ERRORS[r.error]);
      return;
    }
    setPendingDiff(null);
    focusOnStepChange.current = true;
    setFlow({ baseRevision: revision + 1, step: { kind: "done" }, answers: result.profile, editing: wasEditing });
  }

  function submit() {
    const result = validateProfile(answers);
    if (!result.ok) {
      go({ step: { kind: "question", id: result.errors[0].questionId, fromReview: true } });
      return;
    }
    if (editing) {
      setPendingDiff(diffPlans(plan, buildPlan(result.profile), statusMap));
      return;
    }
    void commit(false);
  }

  function confirmChange() {
    void commit(true);
  }

  /* ----------------------------- Render ----------------------------- */

  if (step.kind === "done") {
    return <OnboardingDone headingRef={headingRef} updated={editing} />;
  }

  const questionIndex = step.kind === "question" ? visible.findIndex((q) => q.id === step.id) : -1;
  const progress =
    step.kind === "review" ? 100 : step.kind === "question" ? Math.round((questionIndex / visible.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Cabeçalho do onboarding */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand">
          <MessageCircleHeart aria-hidden className="size-4" />
          {editing ? "Ajustar minhas respostas" : "Monte seu plano personalizado"}
        </p>
        <DemoBadge label={persistence === "server" ? "Salvo na sua conta" : "Modo demo · some ao recarregar"} />
      </div>

      {step.kind !== "intro" ? (
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm text-muted">
            <span aria-live="polite">
              {step.kind === "question"
                ? `Pergunta ${questionIndex + 1} de ${visible.length}`
                : "Revisão das respostas"}
            </span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} label="Progresso do onboarding" size="sm" />
        </div>
      ) : null}

      <div key={stepKey(step)} className="mvf-step space-y-6">
        {step.kind === "intro" ? (
          <>
            <AssistantMessage ref={headingRef} title={ONBOARDING_GREETING} compact />
            <ul className="ml-12 grid gap-2 text-sm text-muted sm:grid-cols-3">
              <li className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-line">
                <ListChecks aria-hidden className="size-4 text-brand" />
                Até 11 perguntas rápidas
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-line">
                <Clock aria-hidden className="size-4 text-brand" />
                Cerca de 2 minutos
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-line">
                <ArrowLeft aria-hidden className="size-4 text-brand" />
                Dá para voltar e ajustar
              </li>
            </ul>
            <p className="ml-12 flex gap-2 rounded-xl bg-canvas p-3 text-xs text-muted ring-1 ring-line">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Esta conversa é roteirizada: o plano é montado por regras definidas a partir do método, sem IA generativa
                nesta versão.{" "}
                {persistence === "server"
                  ? "Suas respostas ficam salvas na sua conta, e você pode retomar de onde parou."
                  : "Modo demo: respostas e progresso ficam só nesta aba e somem ao recarregar."}
                {mode === "example" ? " Ao criar seu plano, a trilha de exemplo é substituída." : ""}
              </span>
            </p>
            <div className="ml-12">
              <Button size="lg" onClick={() => go({ step: { kind: "question", id: visible[0].id, fromReview: false } })}>
                Começar
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            </div>
          </>
        ) : null}

        {step.kind === "question" ? (
          <QuestionStep
            key={step.id}
            questionId={step.id}
            answers={answers}
            previousAnswer={
              !step.fromReview && questionIndex > 0
                ? formatAnswer(visible[questionIndex - 1], answers)
                : undefined
            }
            headingRef={headingRef}
            fromReview={step.fromReview}
            onChange={setAnswer}
            onBack={back}
            onNext={() => advance(answers)}
            onSkip={() => {
              const field = getQuestion(step.id).field;
              const next = { ...answers };
              delete next[field];
              advance(next);
            }}
          />
        ) : null}

        {step.kind === "review" ? (
          <>
            <AssistantMessage
              ref={headingRef}
              title={editing ? "Estas são as suas respostas atuais." : "Pronto! Confira suas respostas."}
              helper={
                editing
                  ? "Edite o que quiser. Antes de atualizar, você vê uma prévia do que muda no plano — nada se perde do que já concluiu."
                  : "Você pode editar qualquer resposta antes de criar o plano, e ajustar depois em Meu Plano."
              }
            />
            <AnswersSummary
              answers={answers}
              onEdit={(id) => go({ step: { kind: "question", id, fromReview: true } })}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="secondary" onClick={back}>
                <ArrowLeft aria-hidden className="size-4" />
                Voltar
              </Button>
              <Button size="lg" onClick={submit} disabled={saving}>
                {saving ? "Salvando seu plano…" : editing ? "Revisar e atualizar meu plano" : "Criar meu plano"}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {saveError ? (
        <p role="alert" className="mt-4 rounded-xl bg-blush px-4 py-3 text-sm text-brand">
          {saveError}
        </p>
      ) : null}

      {pendingDiff ? (
        <PlanChangeDialog diff={pendingDiff} onConfirm={confirmChange} onClose={() => setPendingDiff(null)} />
      ) : null}
    </div>
  );
}

function QuestionStep({
  questionId,
  answers,
  previousAnswer,
  headingRef,
  fromReview,
  onChange,
  onBack,
  onNext,
  onSkip,
}: {
  questionId: QuestionId;
  answers: OnboardingAnswers;
  previousAnswer?: string;
  headingRef: React.Ref<HTMLHeadingElement>;
  fromReview: boolean;
  onChange: (value: unknown) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const question = getQuestion(questionId);
  const error = validateQuestion(question, answers);
  const titleId = `question-${question.id}`;
  const empty =
    answers[question.field] === undefined ||
    answers[question.field] === "" ||
    (Array.isArray(answers[question.field]) && (answers[question.field] as unknown[]).length === 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!error) onNext();
      }}
      className="space-y-6"
    >
      {previousAnswer ? <UserReply>{previousAnswer}</UserReply> : null}
      <AssistantMessage
        ref={headingRef}
        titleId={titleId}
        lead={question.lead?.(answers)}
        title={question.prompt}
        helper={question.helper}
      />
      <div className="sm:ml-12">
        <QuestionField question={question} answers={answers} onChange={onChange} labelledBy={titleId} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:ml-12">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden className="size-4" />
          {fromReview ? "Voltar ao resumo" : "Voltar"}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {question.optional ? (
            <Button variant="ghost" onClick={onSkip}>
              <SkipForward aria-hidden className="size-4" />
              Pular
            </Button>
          ) : null}
          <Button type="submit" disabled={Boolean(error) || (question.optional ? false : empty)}>
            {fromReview ? "Salvar resposta" : "Continuar"}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      {error && !empty ? (
        <p role="alert" className="text-sm text-brand sm:ml-12">
          {error}
        </p>
      ) : !question.optional && empty ? (
        <p className="text-sm text-muted sm:ml-12">Escolha uma opção para continuar.</p>
      ) : null}
    </form>
  );
}
