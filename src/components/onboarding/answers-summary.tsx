import { Pencil } from "lucide-react";
import type { OnboardingAnswers } from "@/types";
import type { QuestionId } from "@/config/onboarding-questions";
import { formatAnswer, getVisibleQuestions } from "@/config/onboarding-questions";

/**
 * Resumo das respostas. Com `onEdit`, cada linha ganha um botão “Editar”.
 * Mostra exatamente as perguntas visíveis para as respostas dadas.
 */
export function AnswersSummary({
  answers,
  onEdit,
}: {
  answers: OnboardingAnswers;
  onEdit?: (id: QuestionId) => void;
}) {
  const questions = getVisibleQuestions(answers);
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
      {questions.map((q) => (
        <div key={q.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-subtle">{q.summaryLabel}</dt>
            <dd className="mt-0.5 text-sm font-medium text-fg">{formatAnswer(q, answers)}</dd>
          </div>
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(q.id)}
              aria-label={`Editar: ${q.summaryLabel}`}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-blush"
            >
              <Pencil aria-hidden className="size-3.5" />
              Editar
            </button>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
