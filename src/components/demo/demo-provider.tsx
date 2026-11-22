"use client";

/**
 * Store da DEMONSTRAÇÃO dos módulos (só existe no modo demo local).
 *
 * - Estado em memória (useReducer sobre o redutor puro `demoReducer`);
 *   some ao recarregar. Nada vai para localStorage nem para o Supabase.
 * - Aulas do plano: marcar na biblioteca também marca a tarefa no PlanProvider
 *   (store único do plano), mantendo Início, Meu Plano e Aulas coerentes.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { usePlan } from "@/components/plan/plan-provider";
import { demoReducer, initialDemoState, type DemoAction, type DemoState } from "@/lib/demo/store";
import { participationCounts } from "@/lib/community/rules";
import { computeXp, type DemoStats, type XpSummary } from "@/lib/demo/xp";
import { pointsBalance } from "@/lib/demo/economy";
import { DEMO_REWARDS } from "@/demo/rewards";
import { DEMO_PERSIST_KEY, DEMO_SNAPSHOT_KEY, parseSnapshot, serializeSnapshot } from "@/lib/demo/snapshot";
import { buildScenario, type ScenarioId } from "@/demo/scenarios";
import { getStatus } from "@/lib/plan";
import { catalog } from "@/lib/catalog";

interface DemoContextValue {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
  isLessonDone: (lessonId: string) => boolean;
  setLessonDone: (lessonId: string, done: boolean) => void;
  stats: DemoStats;
  xp: XpSummary;
  /** Pontos disponíveis para a loja: XP ganho − resgates (nunca negativo). */
  balance: number;
  scenario: ScenarioId | "padrao";
  applyScenario: (id: ScenarioId) => void;
  /** Volta ao estado inicial da demo (trilha de exemplo e módulos zerados). */
  resetAll: () => void;
  /** Restaurar a demo ao recarregar esta aba (sessionStorage, só desenvolvimento). */
  persist: boolean;
  setPersist: (on: boolean) => void;
}

/** sessionStorage pode faltar ou lançar erro (aba privada, bloqueio): sempre protegido. */
function storage(): Storage | null {
  try {
    return process.env.NODE_ENV === "development" && typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(demoReducer, undefined, () => initialDemoState());
  const [scenario, setScenario] = useState<ScenarioId | "padrao">("padrao");
  const { plan, statusMap, setTaskStatus, loadScenario, restoreExample, mode, profile } = usePlan();
  // Desligado por padrão (CLAUDE.md, proibição 4: a demo vive em memória). Só o operador liga.
  const [persist, setPersistState] = useState(false);
  // Estado (não ref): a gravação só começa depois que o estado restaurado foi renderizado.
  // Com ref, o StrictMode do dev regravava o padrão antes da 2ª montagem ler o snapshot.
  const [hydrated, setHydrated] = useState(false);

  // Restaura a demo depois da hidratação (o servidor sempre renderiza o estado padrão).
  useEffect(() => {
    const store = storage();
    if (store) {
      try {
        const keep = store.getItem(DEMO_PERSIST_KEY) === "1";
        const snap = keep ? parseSnapshot(store.getItem(DEMO_SNAPSHOT_KEY)) : null;
        if (!snap) store.removeItem(DEMO_SNAPSHOT_KEY);
        // Atualizações em lote após montar: restauração única, não um ciclo de render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPersistState(keep);
        if (snap) {
          loadScenario(snap.plan);
          dispatch({ type: "reset", state: snap.demo });
          setScenario(snap.scenario);
        }
      } catch {
        /* armazenamento indisponível: segue em memória */
      }
    }
    setHydrated(true);
    // Só na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tarefas do plano com aula, já com o ID da aula RESOLVIDO no catálogo (aliases de compatibilidade).
  const planLessonTasks = useMemo(
    () =>
      (plan?.tasks ?? [])
        .filter((t) => t.lessonId)
        .map((t) => ({ ...t, lessonId: catalog.resolveLessonId(t.lessonId as string) })),
    [plan],
  );
  const planLessonIds = useMemo(() => new Set(planLessonTasks.map((t) => t.lessonId)), [planLessonTasks]);

  const isLessonDone = useCallback(
    (lessonId: string) =>
      state.lessonsDone.includes(lessonId) ||
      planLessonTasks.some((t) => t.lessonId === catalog.resolveLessonId(lessonId) && getStatus(statusMap, t.id) === "completed"),
    [state.lessonsDone, planLessonTasks, statusMap],
  );

  const setLessonDone = useCallback(
    (lessonId: string, done: boolean) => {
      dispatch({ type: "lesson/set", lessonId: catalog.resolveLessonId(lessonId), done });
      for (const t of planLessonTasks) {
        if (t.lessonId === catalog.resolveLessonId(lessonId)) setTaskStatus(t.id, done ? "completed" : "pending");
      }
    },
    [planLessonTasks, setTaskStatus],
  );

  const stats = useMemo<DemoStats>(() => {
    const tasks = plan?.tasks ?? [];
    const completed = tasks.filter((t) => getStatus(statusMap, t.id) === "completed");
    const lessonsTotal = new Set([
      ...state.lessonsDone,
      ...completed.filter((t) => t.lessonId).map((t) => catalog.resolveLessonId(t.lessonId as string)),
    ]).size;
    // Participação que vale XP/missões: sem textos repetidos, curtos ou ocultos (regra única).
    const participation = participationCounts(state.posts);
    return {
      planLessons: completed.filter((t) => t.type === "lesson").length,
      planActions: completed.filter((t) => t.type === "action").length,
      extraLessons: state.lessonsDone.filter((id) => !planLessonIds.has(id)).length,
      lessonsTotal,
      posts: participation.posts,
      comments: participation.comments,
      promptsCopied: state.prompts.copied,
      favorites: state.favorites.virals.length + state.favorites.products.length + state.favorites.templates.length + state.favorites.materials.length,
      rsvps: state.rsvps.length,
      challengesClaimed: state.challengesClaimed,
    };
  }, [plan, statusMap, state, planLessonIds]);

  const xp = useMemo(() => computeXp(stats), [stats]);

  // Grava a cada mudança (depois da restauração inicial).
  useEffect(() => {
    const store = storage();
    if (!store || !hydrated) return;
    try {
      if (!persist) {
        store.removeItem(DEMO_SNAPSHOT_KEY);
        return;
      }
      store.setItem(DEMO_SNAPSHOT_KEY, serializeSnapshot({ scenario, plan: { mode, profile, statusMap }, demo: state }));
    } catch {
      /* cota cheia ou bloqueio: ignora (demo continua em memória) */
    }
  }, [state, scenario, mode, profile, statusMap, persist, hydrated]);

  const setPersist = useCallback((on: boolean) => {
    setPersistState(on);
    try {
      storage()?.setItem(DEMO_PERSIST_KEY, on ? "1" : "0");
    } catch {
      /* ignora */
    }
  }, []);
  const balance = pointsBalance(xp.xp, state.rewardsRedeemed, DEMO_REWARDS);

  const applyScenario = useCallback(
    (id: ScenarioId) => {
      const s = buildScenario(id);
      loadScenario(s.plan);
      dispatch({ type: "reset", state: s.demo });
      setScenario(id);
    },
    [loadScenario],
  );

  const resetAll = useCallback(() => {
    restoreExample();
    dispatch({ type: "reset", state: initialDemoState() });
    setScenario("padrao");
  }, [restoreExample]);

  const value = useMemo<DemoContextValue>(
    () => ({ state, dispatch, isLessonDone, setLessonDone, stats, xp, balance, scenario, applyScenario, resetAll, persist, setPersist }),
    [state, isLessonDone, setLessonDone, stats, xp, balance, scenario, applyScenario, resetAll, persist, setPersist],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo deve ser usado dentro de <DemoProvider> (somente modo demo).");
  return ctx;
}

/** Para componentes compartilhados com o modo real: `null` fora da demo. */
export function useOptionalDemo(): DemoContextValue | null {
  return useContext(DemoContext);
}
