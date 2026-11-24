/**
 * Contratos da JORNADA INTERATIVA (Meu Plano 2.0).
 *
 * A jornada é uma camada SOBRE o motor de personalização existente
 * (`buildPlan`): o motor decide quais atividades entram no plano da aluna; a
 * jornada expande cada atividade em MICROETAPAS (uma ação por tela), organiza em
 * fases e calcula estados. Não há segundo motor nem segunda fonte de respostas.
 *
 * Estado: o MESMO `statusMap` do PlanProvider (IDs `t-…`, compatível com a tabela
 * `user_task_progress`). Microetapas usam IDs `t-j-…`; atividades antigas que
 * viram uma única etapa mantêm o próprio ID.
 */
import type { PlanContext } from "../personalization/context.ts";

export const JOURNEY_VERSION = "2.0.0";

export type PhaseId = "f-conta" | "f-presenca" | "f-produtos" | "f-conteudo" | "f-publicar" | "f-rotina";

export interface JourneyPhase {
  id: PhaseId;
  title: string;
  /** Frase do cabeçalho quando esta é a fase atual (“Vamos preparar sua conta”). */
  headline: string;
  description: string;
}

/**
 * - acao: algo que a aluna FAZ fora ou dentro do app (conta como execução).
 * - aula: assistir a uma aula do plano (conta como aprendizado).
 * - decisao: escolher entre opções (ex.: já tenho conta?) — muda o caminho.
 * - confirmacao: confirmar uma informação já conhecida (ex.: formato escolhido).
 */
export type StepKind = "acao" | "aula" | "decisao" | "confirmacao";

/** Sinalizadores de decisão gravados no statusMap (completed = escolhido). */
export interface JourneyFlags {
  /** null = ainda não respondeu na jornada. */
  hasAccount: boolean | null;
}

export interface StepOption {
  id: string;
  label: string;
  hint?: string;
  /** ID gravado como “completed” quando esta opção é escolhida. */
  flagId: string;
}

export interface StepShortcut {
  label: string;
  href: string;
}

export interface JourneyStep {
  /** Estável, formato `t-…` (compatível com o banco). Nunca renomear. */
  id: string;
  phase: PhaseId;
  /**
   * Atividade do motor (TASK_CATALOG) à qual a etapa pertence. Ela só se aplica
   * se a atividade entrou no plano. Quando TODAS as etapas aplicáveis de uma
   * atividade terminam, a atividade é marcada concluída (XP da regra existente,
   * uma vez). `null` = etapa da jornada sem atividade (decisões/confirmações).
   */
  owner: string | null;
  kind: StepKind;
  title: string;
  /** Uma instrução direta (até ~200 caracteres). */
  instruction: string | ((ctx: PlanContext) => string);
  /** Como a aluna sabe que terminou. */
  expected: string | ((ctx: PlanContext) => string);
  /** Aulas de apoio (IDs estáveis do catálogo). A de uma etapa “aula” é a própria aula. */
  lessons: string[];
  /** Etapas que precisam estar concluídas (ou não se aplicar) antes. Só anteriores. */
  prerequisites: string[];
  /** Condição extra além da atividade estar no plano. */
  appliesWhen?: (ctx: PlanContext, flags: JourneyFlags) => boolean;
  /** Por que não se aplica (mostrado no mapa, nunca como “concluída”). */
  notApplicableReason?: (ctx: PlanContext, flags: JourneyFlags) => string;
  /** Atalho contextual (Estúdio, Marketplace, onboarding…). */
  shortcut?: StepShortcut | ((ctx: PlanContext) => StepShortcut | undefined);
  /** Etapa de decisão: opções. */
  options?: StepOption[];
  /** Tempo estimado, só quando ajuda a planejar. */
  minutes?: number;
  /** Procedimento de app externo (ex.: TikTok) que a equipe precisa confirmar. */
  procedureReview?: boolean;
}

/** Imagem de instrução (print) cadastrada pela equipe. */
export interface StepPrint {
  stepId: string;
  order: number;
  /** Caminho local em /public/jornada/ (nunca URL externa). */
  src: string;
  alt: string;
  caption: string;
  /** Onde tocar, em % da imagem (opcional). */
  tapHint?: { x: number; y: number; label?: string };
  /** App/tela mostrada (ex.: "TikTok · Editar perfil"). */
  screen: string;
  /** AAAA-MM-DD da captura (procedimentos mudam). */
  capturedAt: string;
}

export type StepState = "concluida" | "atual" | "disponivel" | "bloqueada" | "nao_aplicavel";

export interface StepView {
  step: JourneyStep;
  phase: JourneyPhase;
  /** Posição na jornada inteira (0…). */
  index: number;
  /** Número dentro da fase, contando só as aplicáveis (1…); 0 quando não se aplica. */
  number: number;
  state: StepState;
  done: boolean;
  applicable: boolean;
  instruction: string;
  expected: string;
  shortcut?: StepShortcut;
  /** Pré-requisitos ainda pendentes (quando bloqueada). */
  missing: { id: string; title: string }[];
  reason?: string;
}

export interface PhaseView {
  phase: JourneyPhase;
  steps: StepView[];
  done: number;
  total: number;
  complete: boolean;
}

export interface Journey {
  version: string;
  phases: PhaseView[];
  steps: StepView[];
  current: StepView | null;
  currentPhase: PhaseView | null;
  /** Execução (ações, decisões, confirmações) × aprendizado (aulas), só aplicáveis. */
  progress: { execution: { done: number; total: number }; learning: { done: number; total: number }; done: number; total: number; percent: number };
  flags: JourneyFlags;
}
