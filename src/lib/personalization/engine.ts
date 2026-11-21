/**
 * Motor DETERMINÍSTICO de personalização: OnboardingProfile → PersonalizedPlan.
 *
 * Sem IA, sem rede, sem relógio: a mesma entrada gera sempre o mesmo plano.
 * Etapas:
 *   1. deriva o contexto (núcleos de formato, iniciante/experiente, pendências);
 *   2. seleciona atividades do catálogo pelas regras `include`;
 *   3. descarta pré-requisitos que não entraram no plano (sem dependência inválida);
 *   4. distribui `daySuggestion` pelo tempo diário (atividade maior que o dia vira continuação);
 *   5. monta 4–6 etapas, só com as que têm atividades.
 *
 * Módulo puro (roda em `node --test`).
 */
import type { OnboardingProfile, PersonalizedPlan, PlanStage, PlanTask } from "@/types";
import { ONBOARDING_VERSION } from "../../config/onboarding-questions.ts";
import { STAGE_TEMPLATES, TASK_CATALOG } from "../../demo/task-catalog.ts";
import {
  TRACK_LABEL,
  deriveContext,
  resolveText,
  type PlanContext,
  type StageTemplate,
  type TaskTemplate,
} from "./context.ts";

export const ENGINE_VERSION = "1.0.0";

export interface EngineSources {
  tasks: TaskTemplate[];
  stages: StageTemplate[];
}

const DEFAULT_SOURCES: EngineSources = { tasks: TASK_CATALOG, stages: STAGE_TEMPLATES };

/** Distribui dias sugeridos respeitando a ordem e o tempo diário. */
export function scheduleDays(
  durations: number[],
  minutesPerDay: number,
  startsNewDay: boolean[] = [],
): { start: number; end: number }[] {
  const cap = Math.max(1, minutesPerDay);
  let day = 1;
  let used = 0;
  return durations.map((duration, i) => {
    if (used > 0 && (used + duration > cap || startsNewDay[i])) {
      day += 1;
      used = 0;
    }
    if (duration > cap) {
      // Não fraciona a atividade: ela ocupa dias inteiros e indica continuação.
      const span = Math.ceil(duration / cap);
      const slot = { start: day, end: day + span - 1 };
      day = slot.end + 1;
      used = 0;
      return slot;
    }
    used += duration;
    return { start: day, end: day };
  });
}

function planTitle(ctx: PlanContext): string {
  switch (ctx.profile.goal) {
    case "consistencia":
      return "Rumo à consistência";
    case "melhorar_resultados":
      return "Evoluir seus resultados";
    case "preparar_conta":
      return "Conta pronta e primeiro vídeo";
    default:
      return "Rumo à primeira comissão";
  }
}

function profileLabel(ctx: PlanContext): string {
  const appear = { sim: "Aparecer", nao: "Não aparecer", talvez: "Talvez aparecer" }[ctx.profile.wantsToAppear];
  const formats = ctx.has("camera")
    ? null
    : ctx.tracks.map((t) => TRACK_LABEL[t].replace(/^./, (c) => c.toUpperCase())).join(" + ");
  const minutes = ctx.profile.dailyMinutes === "90_mais" ? "90+ min/dia" : `${ctx.profile.dailyMinutes} min/dia`;
  return [appear, formats, minutes].filter(Boolean).join(" · ");
}

function buildTips(ctx: PlanContext, totalDays: number): string[] {
  const tips: string[] = [];
  const minutesLabel = ctx.profile.dailyMinutes === "90_mais" ? "1h30 ou mais" : `${ctx.minutes} min`;
  tips.push(
    `Com ${minutesLabel} por dia, as atividades foram distribuídas em cerca de ${totalDays} dias sugeridos. É uma referência: siga no seu ritmo, sem culpa por pausas.`,
  );
  const records = ctx.has("camera") || ctx.has("maos");
  if (ctx.profile.device === "celular") {
    tips.push("Você vai usar principalmente o celular: as atividades de gravação e edição foram pensadas para ele.");
    if (ctx.has("avatar"))
      tips.push(
        "O Google Flow é uma ferramenta externa: confira na aula os requisitos de acesso e uso antes de começar. Se tiver um computador à mão, ele pode facilitar essa etapa.",
      );
  } else if (ctx.profile.device === "computador") {
    tips.push(
      records
        ? "Seu formato envolve gravação: o celular costuma ser o mais prático para gravar, e o computador ajuda em roteiro e edição."
        : "No computador, aproveite para roteiros, prompts e edição com mais conforto.",
    );
  } else {
    tips.push("Combine os dois: grave no celular e use o computador para roteiros, prompts e edição.");
  }
  if (ctx.tracks.length > 1)
    tips.push("Você escolheu dois formatos: o plano traz o núcleo de cada um, sem repetir as aulas em comum.");
  if (ctx.profile.wantsToAppear === "talvez" && !ctx.has("explorar"))
    tips.push("Você marcou “talvez” para aparecer: o plano começa sem aparecer. Se mudar de ideia, ajuste suas respostas.");
  return tips;
}

export function buildPlan(profile: OnboardingProfile, sources: EngineSources = DEFAULT_SOURCES): PersonalizedPlan {
  const ctx = deriveContext(profile);

  // 1–2. Seleção (a ordem do catálogo é a ordem global; IDs únicos por construção).
  const seen = new Set<string>();
  const selected = sources.tasks.filter((t) => {
    if (seen.has(t.id) || !t.include(ctx)) return false;
    seen.add(t.id);
    return true;
  });

  // 4. Dias sugeridos.
  const days = scheduleDays(
    selected.map((t) => t.durationMinutes),
    ctx.minutes,
    selected.map((t) => Boolean(t.startsNewDay)),
  );

  // 5. Etapas com atividades, numeradas na ordem dos modelos.
  const stageTemplates = sources.stages.filter((s) => selected.some((t) => t.stageId === s.id));
  const indexById = new Map(selected.map((t, i) => [t.id, i]));

  const tasks: PlanTask[] = selected.map((t, i) => {
    const stageTasks = selected.filter((x) => x.stageId === t.stageId);
    // 3. Só pré-requisitos presentes e ANTERIORES (evita ciclos e referências inválidas).
    const prerequisites = [...new Set(t.prerequisites)].filter(
      (id) => indexById.has(id) && (indexById.get(id) as number) < i,
    );
    const { start, end } = days[i];
    const task: PlanTask = {
      id: t.id,
      stageId: t.stageId,
      order: stageTasks.indexOf(t) + 1,
      title: resolveText(t.title, ctx),
      type: t.type,
      durationMinutes: t.durationMinutes,
      prerequisites,
      daySuggestion: start,
      description: resolveText(t.description, ctx),
      objective: t.objective,
      completionCriteria: t.completionCriteria,
      whyInPlan: t.why(ctx),
    };
    if (t.lessonId) task.lessonId = t.lessonId;
    if (end > start) task.dayEnd = end;
    if (t.optional?.(ctx)) task.optional = true;
    return task;
  });

  const stages: PlanStage[] = stageTemplates.map((s, i) => {
    const own = tasks.filter((t) => t.stageId === s.id);
    return {
      id: s.id,
      order: i + 1,
      title: resolveText(s.title, ctx),
      shortTitle: resolveText(s.shortTitle, ctx),
      description: resolveText(s.description, ctx),
      dayRange: {
        start: Math.min(...own.map((t) => t.daySuggestion)),
        end: Math.max(...own.map((t) => t.dayEnd ?? t.daySuggestion)),
      },
    };
  });

  const totalDaysSuggested = tasks.length ? Math.max(...tasks.map((t) => t.dayEnd ?? t.daySuggestion)) : 0;

  return {
    id: `plano-personalizado-v${ENGINE_VERSION}`,
    title: planTitle(ctx),
    subtitle:
      "Aulas e ações em sequência, montadas a partir das suas respostas. Os dias são sugestões: siga no seu ritmo. Nenhum plano garante vendas ou comissões.",
    profileLabel: profileLabel(ctx),
    totalDaysSuggested,
    stages,
    tasks,
    engineVersion: ENGINE_VERSION,
    onboardingVersion: ONBOARDING_VERSION,
    profile,
    dailyMinutes: ctx.minutes,
    tips: buildTips(ctx, totalDaysSuggested),
  };
}

/** Lista problemas estruturais de um plano (vazia = íntegro). Usada em testes. */
export function checkPlanIntegrity(plan: PersonalizedPlan): string[] {
  const problems: string[] = [];
  const ids = plan.tasks.map((t) => t.id);
  const position = new Map(ids.map((id, i) => [id, i]));
  if (new Set(ids).size !== ids.length) problems.push("IDs de atividade duplicados");
  if (plan.stages.length < 4 || plan.stages.length > 6) problems.push(`${plan.stages.length} etapas (esperado 4–6)`);
  for (const stage of plan.stages) {
    if (!plan.tasks.some((t) => t.stageId === stage.id)) problems.push(`Etapa vazia: ${stage.id}`);
  }
  let lastDay = 0;
  plan.tasks.forEach((t, i) => {
    if (!plan.stages.some((s) => s.id === t.stageId)) problems.push(`${t.id}: etapa inexistente`);
    for (const p of t.prerequisites) {
      if (!position.has(p)) problems.push(`${t.id}: pré-requisito ausente ${p}`);
      else if ((position.get(p) as number) >= i) problems.push(`${t.id}: pré-requisito fora de ordem ${p}`);
    }
    if (t.daySuggestion < lastDay) problems.push(`${t.id}: dia sugerido retrocede`);
    lastDay = t.dayEnd ?? t.daySuggestion;
    if (!t.whyInPlan || !t.completionCriteria) problems.push(`${t.id}: sem justificativa ou critério`);
  });
  return problems;
}
