"use client";

import { useCallback, useMemo } from "react";
import { usePlan } from "@/components/plan/plan-provider";
import { applyUpdates, buildJourney, chooseUpdates, completeUpdates, undoUpdates, type StatusUpdate } from "@/lib/journey/journey";
import type { StepView } from "@/lib/journey/types";

/**
 * Jornada derivada do PLANO e do statusMap do PlanProvider (fonte única).
 * As ações só aplicam atualizações via `setTaskStatus` — memória na demo,
 * Server Action + RLS no app real. Nenhum estado paralelo de progresso.
 */
export function useJourney() {
  const { plan, statusMap, setTaskStatus } = usePlan();
  const journey = useMemo(() => (plan ? buildJourney(plan, statusMap) : null), [plan, statusMap]);

  const apply = useCallback(
    (updates: StatusUpdate[]): StepView | null => {
      if (!plan || updates.length === 0) return null;
      for (const [id, s] of updates) setTaskStatus(id, s);
      // Próxima etapa já com o progresso novo (sem esperar o re-render).
      return buildJourney(plan, applyUpdates(statusMap, updates)).current;
    },
    [plan, statusMap, setTaskStatus],
  );

  const complete = useCallback((stepId: string) => (journey ? apply(completeUpdates(journey, statusMap, stepId)) : null), [journey, statusMap, apply]);
  const undo = useCallback((stepId: string) => (journey ? apply(undoUpdates(journey, statusMap, stepId)) : null), [journey, statusMap, apply]);
  const choose = useCallback((stepId: string, optionId: string) => (journey ? apply(chooseUpdates(journey, statusMap, stepId, optionId)) : null), [journey, statusMap, apply]);

  return { plan, journey, complete, undo, choose };
}


