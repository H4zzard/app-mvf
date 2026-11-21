/**
 * DEMONSTRAÇÃO — simulação local de pontos, calculada a partir das tarefas
 * concluídas na sessão. Regras provisórias apenas para ilustrar o card.
 * As faixas reais de pontos, níveis e recompensas ainda estão em aberto
 * (ver docs/DECISOES.md) e deverão ser calculadas no servidor a partir de
 * eventos verificáveis.
 */
import type { GamificationSummary, PlanTask, TaskStatusMap } from "@/types";
import { getStatus } from "@/lib/plan";

const DEMO_POINTS = { lesson: 10, action: 15 } as const;
const DEMO_LEVELS = [
  { number: 1, name: "Começando", minPoints: 0 },
  { number: 2, name: "Em movimento", minPoints: 60 },
  { number: 3, name: "Criadora", minPoints: 150 },
  { number: 4, name: "Constante", minPoints: 260 },
];

export function computeDemoGamification(tasks: PlanTask[], map: TaskStatusMap): GamificationSummary {
  const points = tasks
    .filter((t) => getStatus(map, t.id) === "completed")
    .reduce((sum, t) => sum + DEMO_POINTS[t.type], 0);

  const current = [...DEMO_LEVELS].reverse().find((l) => points >= l.minPoints) ?? DEMO_LEVELS[0];
  const next = DEMO_LEVELS.find((l) => l.minPoints > points);

  return {
    points,
    levelName: current.name,
    levelNumber: current.number,
    pointsToNextLevel: next ? next.minPoints - points : 0,
    streakDays: 0,
    achievementsUnlocked: 0,
    achievementsTotal: 0,
    source: "demo",
  };
}
