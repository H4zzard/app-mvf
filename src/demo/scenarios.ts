/**
 * DEMONSTRAÇÃO — cenários prontos para gravação (somente modo demo local).
 *
 * - nova: primeiro acesso, sem plano.
 * - com-plano: plano personalizado recém-criado, primeiros passos feitos.
 * - evolucao: boa parte do plano concluída e uso dos módulos.
 * O plano é sempre gerado pelo motor determinístico; nomes são fictícios.
 */
import type { OnboardingProfile, TaskStatusMap } from "@/types";
import { buildPlan } from "../lib/personalization/engine.ts";
import { orderedTasks } from "../lib/plan.ts";
import { initialDemoState, type DemoState } from "../lib/demo/store.ts";
import { EXAMPLE_PROFILE } from "./plan.ts";

export type ScenarioId = "nova" | "com-plano" | "evolucao";

export interface ScenarioPlan {
  mode: "first_access" | "personalized";
  profile: OnboardingProfile | null;
  statusMap: TaskStatusMap;
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  plan: ScenarioPlan;
  demo: DemoState;
}

export const SCENARIO_OPTIONS: { id: ScenarioId; label: string; description: string }[] = [
  { id: "nova", label: "Nova aluna", description: "Primeiro acesso, ainda sem plano." },
  { id: "com-plano", label: "Aluna com plano", description: "Plano criado, primeiros passos feitos." },
  { id: "evolucao", label: "Aluna em evolução", description: "Boa parte do plano concluída." },
];

/** Nome fictício da persona da demonstração. */
export const DEMO_PERSONA_NAME = "Marina";

const PROFILE: OnboardingProfile = { ...EXAMPLE_PROFILE, preferredName: DEMO_PERSONA_NAME };

function progressFor(fraction: number): TaskStatusMap {
  const tasks = orderedTasks(buildPlan(PROFILE));
  const doneCount = Math.round(tasks.length * fraction);
  const map: TaskStatusMap = {};
  tasks.forEach((t, i) => {
    if (i < doneCount) map[t.id] = "completed";
    else if (i === doneCount) map[t.id] = "in_progress";
  });
  return map;
}

export function buildScenario(id: ScenarioId): Scenario {
  const meta = SCENARIO_OPTIONS.find((s) => s.id === id) ?? SCENARIO_OPTIONS[1];
  if (id === "nova") {
    return { ...meta, plan: { mode: "first_access", profile: null, statusMap: {} }, demo: initialDemoState() };
  }
  if (id === "com-plano") {
    return { ...meta, plan: { mode: "personalized", profile: PROFILE, statusMap: progressFor(0.15) }, demo: initialDemoState() };
  }
  const base = initialDemoState();
  return {
    ...meta,
    plan: { mode: "personalized", profile: PROFILE, statusMap: progressFor(0.6) },
    demo: {
      ...base,
      lessonsDone: ["l-narracao", "l-edicao-simples"],
      favorites: { virals: ["v-rotina-3-passos", "v-textura-close"], products: ["p-hidratante"], templates: [], materials: [] },
      prompts: { generated: 2, copied: 1, saved: [] },
      rsvps: ["ev-roteiros-avatar"],
    },
  };
}
