"use client";

/**
 * Store ÚNICO da sessão: perfil de onboarding, plano gerado e progresso.
 *
 * Dois modos de persistência:
 *  - "memory" (modo demo local, só em development): estado na aba, some ao recarregar.
 *  - "server" (Supabase): estado inicial carregado do banco no layout; cada
 *    mudança é aplicada de forma otimista e confirmada por Server Action; em
 *    erro, a mudança é desfeita e o erro aparece na interface.
 *
 * O plano é sempre derivado com o motor determinístico (buildPlan) a partir
 * do perfil. O progresso é indexado por ID estável e nunca é apagado ao
 * replanejar (inclusive de tarefas que saem do plano).
 */
import { createContext, useCallback, useContext, useMemo, useReducer, useState } from "react";
import type {
  OnboardingAnswers,
  OnboardingProfile,
  PersonalizedPlan,
  TaskStatus,
  TaskStatusEvent,
  TaskStatusMap,
} from "@/types";
import { DEMO_INITIAL_STATUS, EXAMPLE_PROFILE } from "@/demo/plan";
import { buildPlan } from "@/lib/personalization/engine";
import { getStatus } from "@/lib/plan";
import type { PersistedPlanState } from "@/lib/data/student-state";
import { applyProfileAction, saveOnboardingDraftAction, setTaskStatusAction } from "@/app/(app)/plan-actions";

/**
 * - example: trilha de exemplo (somente modo demo).
 * - first_access: sem onboarding concluído (sem plano).
 * - personalized: plano gerado a partir das respostas.
 */
export type PlanMode = "example" | "first_access" | "personalized";

export type Persistence = { kind: "memory" } | { kind: "server"; initial: PersistedPlanState };

export type ApplyResult =
  | { ok: true }
  | { ok: false; error: "conflict" | "unauthenticated" | "forbidden" | "network" | "invalid" | "server" };

export interface SyncState {
  pending: number;
  error: string | null;
  sessionExpired: boolean;
}

interface PlanState {
  mode: PlanMode;
  profile: OnboardingProfile | null;
  statusMap: TaskStatusMap;
  history: TaskStatusEvent[];
  /** Incrementa quando o plano é (re)gerado ou a sessão é reiniciada (UI). */
  revision: number;
  /** Revisão do plano no servidor (controle de concorrência entre dispositivos). */
  serverRevision: number;
}

type Action =
  | { type: "set-status"; taskId: string; status: TaskStatus }
  | { type: "restore-statuses"; entries: [string, TaskStatus][] }
  | { type: "apply-profile"; profile: OnboardingProfile; serverRevision?: number }
  | { type: "simulate-first-access" }
  | { type: "restore-example" }
  | { type: "reset-progress" }
  | { type: "load-scenario"; scenario: DemoScenarioPlan };

/** Cenário de demonstração (somente modo memória). */
export interface DemoScenarioPlan {
  mode: "example" | "first_access" | "personalized";
  profile: OnboardingProfile | null;
  statusMap: TaskStatusMap;
}

const EXAMPLE_STATE: PlanState = {
  mode: "example",
  profile: null,
  statusMap: DEMO_INITIAL_STATUS,
  history: [],
  revision: 0,
  serverRevision: 0,
};

function initialState(persistence: Persistence): PlanState {
  if (persistence.kind === "memory") return EXAMPLE_STATE;
  const { profile, statusMap, revision } = persistence.initial;
  return {
    mode: profile ? "personalized" : "first_access",
    profile,
    statusMap,
    history: [],
    revision: 0,
    serverRevision: revision,
  };
}

function withStatus(state: PlanState, taskId: string, to: TaskStatus): PlanState {
  const from = getStatus(state.statusMap, taskId);
  if (from === to) return state;
  const statusMap = { ...state.statusMap };
  const history = [...state.history];
  let seq = history.length;
  if (to === "in_progress") {
    for (const [id, s] of Object.entries(statusMap)) {
      if (s === "in_progress" && id !== taskId) {
        statusMap[id] = "pending";
        history.push({ seq: ++seq, taskId: id, from: "in_progress", to: "pending" });
      }
    }
  }
  statusMap[taskId] = to;
  history.push({ seq: ++seq, taskId, from, to });
  return { ...state, statusMap, history };
}

function reducer(state: PlanState, action: Action): PlanState {
  switch (action.type) {
    case "set-status":
      return withStatus(state, action.taskId, action.status);
    case "restore-statuses": {
      const statusMap = { ...state.statusMap };
      for (const [id, s] of action.entries) statusMap[id] = s;
      return { ...state, statusMap };
    }
    case "apply-profile":
      return {
        ...state,
        mode: "personalized",
        profile: action.profile,
        // Só a trilha de EXEMPLO tem progresso fictício a descartar.
        statusMap: state.mode === "example" ? {} : state.statusMap,
        history: state.mode === "example" ? [] : state.history,
        revision: state.revision + 1,
        serverRevision: action.serverRevision ?? state.serverRevision,
      };
    case "simulate-first-access":
      return { ...state, mode: "first_access", profile: null, statusMap: {}, history: [], revision: state.revision + 1 };
    case "restore-example":
      return { ...EXAMPLE_STATE, revision: state.revision + 1 };
    case "reset-progress":
      return { ...state, statusMap: state.mode === "example" ? DEMO_INITIAL_STATUS : {}, history: [] };
    case "load-scenario": {
      const { scenario } = action;
      const personalized = scenario.mode === "personalized" && scenario.profile !== null;
      return {
        ...state,
        mode: scenario.mode === "example" ? "example" : personalized ? "personalized" : "first_access",
        profile: personalized ? scenario.profile : null,
        statusMap: { ...scenario.statusMap },
        history: [],
        revision: state.revision + 1,
      };
    }
  }
}

interface PlanContextValue {
  mode: PlanMode;
  plan: PersonalizedPlan | null;
  profile: OnboardingProfile | null;
  statusMap: TaskStatusMap;
  history: TaskStatusEvent[];
  revision: number;
  persistence: Persistence["kind"];
  /** true no modo demo (memória). */
  isDemo: boolean;
  sync: SyncState;
  /** Rascunho salvo do onboarding (modo servidor). */
  draft: OnboardingAnswers | null;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  toggleComplete: (taskId: string) => void;
  /** Gera (ou regenera) o plano a partir de um perfil já validado. */
  applyProfile: (profile: OnboardingProfile) => Promise<ApplyResult>;
  saveDraft: (answers: OnboardingAnswers) => void;
  simulateFirstAccess: () => void;
  restoreExample: () => void;
  resetDemo: () => void;
  /** Somente modo demo (memória): carrega um cenário pronto. No-op no modo servidor. */
  loadScenario: (scenario: DemoScenarioPlan) => void;
  dismissSyncError: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  children,
  persistence = { kind: "memory" },
}: {
  children: React.ReactNode;
  persistence?: Persistence;
}) {
  const [state, dispatch] = useReducer(reducer, persistence, initialState);
  const [sync, setSync] = useState<SyncState>({ pending: 0, error: null, sessionExpired: false });
  const server = persistence.kind === "server";
  const draft = persistence.kind === "server" ? persistence.initial.draft : null;

  const plan = useMemo<PersonalizedPlan | null>(() => {
    if (state.mode === "example") return buildPlan(EXAMPLE_PROFILE);
    if (state.mode === "personalized" && state.profile) return buildPlan(state.profile);
    return null;
  }, [state.mode, state.profile]);

  const track = useCallback(async <T,>(op: () => Promise<T>): Promise<T> => {
    setSync((s) => ({ ...s, pending: s.pending + 1 }));
    try {
      return await op();
    } finally {
      setSync((s) => ({ ...s, pending: Math.max(0, s.pending - 1) }));
    }
  }, []);

  const fail = useCallback((error: string) => {
    setSync((s) => ({
      ...s,
      sessionExpired: error === "unauthenticated" || error === "forbidden",
      error:
        error === "unauthenticated"
          ? "Sua sessão expirou. Entre novamente para continuar salvando."
          : error === "forbidden"
            ? "Seu acesso não está ativo. Fale com o suporte."
            : "Não foi possível salvar. Verifique sua conexão e tente de novo.",
    }));
  }, []);

  const setTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      // Guarda o que pode mudar (a tarefa e uma eventual "em andamento") para desfazer em erro.
      const previous: [string, TaskStatus][] = Object.entries(state.statusMap).filter(
        ([id, s]) => id === taskId || s === "in_progress",
      );
      if (!state.statusMap[taskId]) previous.push([taskId, "pending"]);
      dispatch({ type: "set-status", taskId, status });
      if (!server) return;
      void track(async () => {
        try {
          const r = await setTaskStatusAction(taskId, status);
          if (!r.ok) throw new Error(r.error);
        } catch (e) {
          dispatch({ type: "restore-statuses", entries: previous });
          fail(e instanceof Error ? e.message : "server");
        }
      });
    },
    [state.statusMap, server, track, fail],
  );

  const toggleComplete = useCallback(
    (taskId: string) => setTaskStatus(taskId, getStatus(state.statusMap, taskId) === "completed" ? "pending" : "completed"),
    [state.statusMap, setTaskStatus],
  );

  const applyProfile = useCallback(
    async (profile: OnboardingProfile): Promise<ApplyResult> => {
      if (!server) {
        dispatch({ type: "apply-profile", profile });
        return { ok: true };
      }
      return track(async () => {
        try {
          const r = await applyProfileAction(profile, state.serverRevision);
          if (!r.ok) {
            if (r.error === "unauthenticated" || r.error === "forbidden") fail(r.error);
            return { ok: false, error: r.error === "conflict" || r.error === "unauthenticated" || r.error === "forbidden" || r.error === "invalid" ? r.error : "server" };
          }
          dispatch({ type: "apply-profile", profile, serverRevision: r.revision });
          setSync((s) => ({ ...s, error: null }));
          return { ok: true };
        } catch {
          return { ok: false, error: "network" };
        }
      });
    },
    [server, state.serverRevision, track, fail],
  );

  const saveDraft = useCallback(
    (answers: OnboardingAnswers) => {
      if (!server) return;
      // Rascunho é “melhor esforço”: falha não bloqueia o onboarding.
      void saveOnboardingDraftAction(answers).catch(() => {});
    },
    [server],
  );

  const simulateFirstAccess = useCallback(() => {
    if (!server) dispatch({ type: "simulate-first-access" });
  }, [server]);
  const restoreExample = useCallback(() => {
    if (!server) dispatch({ type: "restore-example" });
  }, [server]);
  const resetDemo = useCallback(() => {
    if (!server) dispatch({ type: "reset-progress" });
  }, [server]);
  const loadScenario = useCallback(
    (scenario: DemoScenarioPlan) => {
      if (!server) dispatch({ type: "load-scenario", scenario });
    },
    [server],
  );
  const dismissSyncError = useCallback(() => setSync((s) => ({ ...s, error: null })), []);

  const value = useMemo<PlanContextValue>(
    () => ({
      mode: state.mode,
      plan,
      profile: state.mode === "personalized" ? state.profile : null,
      statusMap: state.statusMap,
      history: state.history,
      revision: state.revision,
      persistence: persistence.kind,
      isDemo: !server,
      sync,
      draft,
      setTaskStatus,
      toggleComplete,
      applyProfile,
      saveDraft,
      simulateFirstAccess,
      restoreExample,
      resetDemo,
      loadScenario,
      dismissSyncError,
    }),
    [state, plan, persistence.kind, server, sync, draft, setTaskStatus, toggleComplete, applyProfile, saveDraft, simulateFirstAccess, restoreExample, resetDemo, loadScenario, dismissSyncError],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan deve ser usado dentro de <PlanProvider>.");
  return ctx;
}

/** Para componentes que só são renderizados quando há plano. */
export function useActivePlan(): PlanContextValue & { plan: PersonalizedPlan } {
  const ctx = usePlan();
  if (!ctx.plan) throw new Error("Componente de plano renderizado sem plano ativo.");
  return ctx as PlanContextValue & { plan: PersonalizedPlan };
}
