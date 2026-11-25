"use client";

import { Check } from "lucide-react";
import type { MultiQuestion, Question, SingleQuestion, TextQuestion } from "@/config/onboarding-questions";
import { toggleMultiValue } from "@/config/onboarding-questions";
import type { OnboardingAnswers } from "@/types";
import { cn } from "@/lib/cn";

/**
 * Campo de resposta. Usa inputs nativos (radio/checkbox/text) dentro de
 * cartões: setas do teclado, leitores de tela e toque funcionam por padrão.
 */
export function QuestionField({
  question,
  answers,
  onChange,
  labelledBy,
}: {
  question: Question;
  answers: OnboardingAnswers;
  onChange: (value: unknown) => void;
  labelledBy: string;
}) {
  if (question.kind === "text") return <TextField question={question} answers={answers} onChange={onChange} labelledBy={labelledBy} />;
  if (question.kind === "multi")
    return <MultiField question={question} answers={answers} onChange={onChange} labelledBy={labelledBy} />;
  return <SingleField question={question} answers={answers} onChange={onChange} labelledBy={labelledBy} />;
}

const cardBase =
  "group relative flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-line bg-card p-4 text-left shadow-card transition-colors hover:border-brand/40 has-checked:border-brand has-checked:bg-blush has-focus-visible:ring-2 has-focus-visible:ring-brand has-focus-visible:ring-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:border-line";

function Indicator({ shape }: { shape: "radio" | "checkbox" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 grid size-5 shrink-0 place-items-center border-2 border-line-strong bg-paper text-transparent transition-colors group-has-checked:border-brand group-has-checked:bg-brand group-has-checked:text-paper",
        shape === "radio" ? "rounded-full" : "rounded-md",
      )}
    >
      <Check className="size-3" strokeWidth={3.5} />
    </span>
  );
}

function OptionText({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="min-w-0">
      <span className="block font-medium text-fg">{label}</span>
      {hint ? <span className="mt-0.5 block text-sm text-muted">{hint}</span> : null}
    </span>
  );
}

function SingleField({
  question,
  answers,
  onChange,
  labelledBy,
}: {
  question: SingleQuestion;
  answers: OnboardingAnswers;
  onChange: (value: unknown) => void;
  labelledBy: string;
}) {
  const value = answers[question.field];
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-3 sm:grid-cols-2">
      {question.options.map((opt) => (
        <label key={opt.value} className={cardBase}>
          <input
            type="radio"
            name={question.id}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          <Indicator shape="radio" />
          <OptionText label={opt.label} hint={opt.hint} />
        </label>
      ))}
    </div>
  );
}

function MultiField({
  question,
  answers,
  onChange,
  labelledBy,
}: {
  question: MultiQuestion;
  answers: OnboardingAnswers;
  onChange: (value: unknown) => void;
  labelledBy: string;
}) {
  const raw = answers[question.field];
  const selected: string[] = Array.isArray(raw) ? raw : [];
  const regular = selected.filter((v) => !question.exclusive.includes(v));
  const atMax = regular.length >= question.max;
  const noteId = `${question.id}-limit`;

  return (
    <div>
      <div role="group" aria-labelledby={labelledBy} aria-describedby={noteId} className="grid gap-3 sm:grid-cols-2">
        {question.options.map((opt) => {
          const checked = selected.includes(opt.value);
          // Ao atingir o máximo, só bloqueia formatos comuns ainda não marcados.
          const disabled = !checked && atMax && !question.exclusive.includes(opt.value);
          return (
            <label key={opt.value} className={cardBase}>
              <input
                type="checkbox"
                name={question.id}
                value={opt.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(toggleMultiValue(question, selected, opt.value))}
                className="sr-only"
              />
              <Indicator shape="checkbox" />
              <OptionText label={opt.label} hint={opt.hint} />
            </label>
          );
        })}
      </div>
      <p id={noteId} aria-live="polite" className="mt-3 text-sm text-muted">
        {atMax
          ? `Você escolheu ${question.max} formatos. Para trocar, desmarque um deles.`
          : selected.includes("quero_explorar")
            ? "“Quero explorar” não se combina com outros formatos — escolher outro desmarca esta opção."
            : `Selecionados: ${selected.length} de até ${question.max}.`}
      </p>
    </div>
  );
}

function TextField({
  question,
  answers,
  onChange,
  labelledBy,
}: {
  question: TextQuestion;
  answers: OnboardingAnswers;
  onChange: (value: unknown) => void;
  labelledBy: string;
}) {
  const value = answers[question.field];
  return (
    <div>
      <input
        type="text"
        aria-labelledby={labelledBy}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        maxLength={question.maxLength}
        placeholder={question.placeholder}
        autoComplete="given-name"
        className="min-h-12 w-full rounded-2xl border border-line-strong bg-card px-4 text-base text-fg shadow-card placeholder:text-subtle focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      />
      <p className="mt-2 text-xs text-muted">Até {question.maxLength} caracteres. Não pedimos outros dados pessoais.</p>
    </div>
  );
}
