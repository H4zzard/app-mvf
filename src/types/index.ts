/**
 * Contratos de dados do App MVF.
 *
 * Estes tipos são a fronteira entre a UI e a futura camada de dados
 * (banco/Supabase, webhooks Kiwify, motor de personalização). As fixtures em
 * `src/demo/` implementam estes contratos apenas para demonstração.
 */
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Usuária e papéis                                                    */
/* ------------------------------------------------------------------ */

/** Cargos previstos no brief. Permissões finas ainda serão especificadas. */
export type UserRole =
  | "owner"
  | "admin"
  | "expert"
  | "support"
  | "moderator"
  | "partner"
  | "student";

export interface User {
  id: string;
  /** Nome preferido exibido na interface. */
  displayName: string;
  /** Iniciais para o avatar quando não há foto. */
  initials: string;
  role: UserRole;
  /** Plano/sala de acesso (ex.: Elite+, Icon). Regras ainda em aberto. */
  accessTier?: string;
  /** Verdadeiro quando o registro vem de fixtures de demonstração. */
  isDemo: boolean;
}

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

/** Valores estáveis das respostas. Rótulos ficam em src/config/onboarding-questions.ts. */
export type ExperienceLevel = "nunca_vendi" | "tentando_comecar" | "ja_vendi";
export type TriState = "sim" | "nao" | "nao_sei";
export type AppearChoice = "sim" | "nao" | "talvez";
export type ContentFormat = "avatar_ia" | "maos_produto" | "narracao_imagens" | "quero_explorar";
export type AiExperience = "nunca_usei" | "uso_um_pouco" | "uso_com_frequencia";
export type DailyMinutes = "15" | "30" | "60" | "90_mais";
export type Device = "celular" | "computador" | "ambos";
export type MainBlocker =
  | "entender_tiktok_shop"
  | "escolher_produto"
  | "gravar"
  | "editar"
  | "roteiros"
  | "organizacao";
export type ImmediateGoal =
  | "preparar_conta"
  | "primeiro_video"
  | "primeira_comissao"
  | "consistencia"
  | "melhorar_resultados";

/** Perfil completo e validado — entrada do motor de personalização. */
export interface OnboardingProfile {
  /** Opcional. Sem nome, a interface usa o nome da conta ou “parceira”. */
  preferredName?: string;
  experience: ExperienceLevel;
  accountReady: TriState;
  wantsToAppear: AppearChoice;
  /**
   * Vazio quando `wantsToAppear = "sim"`. Caso contrário, 1–2 formatos, ou
   * somente `quero_explorar` (exclusivo).
   */
  formats: ContentFormat[];
  aiExperience: AiExperience;
  dailyMinutes: DailyMinutes;
  device: Device;
  mainBlocker: MainBlocker;
  goal: ImmediateGoal;
  numiAccess: TriState;
}

/** Rascunho durante o onboarding: tudo opcional até a validação. */
export type OnboardingAnswers = Partial<OnboardingProfile>;

/* ------------------------------------------------------------------ */
/* Aulas e plano                                                       */
/* ------------------------------------------------------------------ */

export type LessonLevel = "fundamento" | "intermediario" | "avancado";

export interface Lesson {
  id: string;
  title: string;
  module: string;
  durationMinutes: number;
  level: LessonLevel;
  /** Tags usadas pelo futuro motor determinístico de plano. */
  tags: string[];
  /**
   * Onde a aula está disponível hoje. Os vídeos atuais estão na Kiwify e
   * ainda não há decisão sobre migração — por isso nenhuma URL é presumida.
   */
  availability: "kiwify_externa" | "app" | "pendente";
}

export type PlanTaskType = "lesson" | "action";
export type TaskStatus = "pending" | "in_progress" | "completed";

export interface PlanStage {
  id: string;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  /** Dias sugeridos (andamento livre). */
  dayRange: { start: number; end: number };
}

export interface PlanTask {
  id: string;
  stageId: string;
  order: number;
  title: string;
  type: PlanTaskType;
  lessonId?: string;
  durationMinutes: number;
  /** IDs de tarefas que idealmente vêm antes. Não bloqueiam a aluna. */
  prerequisites: string[];
  daySuggestion: number;
  description: string;
  objective: string;
  completionCriteria: string;
  /** Fim da sugestão quando a atividade passa do tempo diário (continuação). */
  dayEnd?: number;
  /** Fundamento que a aluna pode pular (perfil experiente). Nunca vale para conformidade. */
  optional?: boolean;
  /** Texto "por que isto está no seu plano" (reason). */
  whyInPlan: string;
}

export interface LearningPlan {
  id: string;
  title: string;
  subtitle: string;
  /** Descrição curta do perfil que gerou o plano (ex.: avatar de IA). */
  profileLabel: string;
  totalDaysSuggested: number;
  stages: PlanStage[];
  tasks: PlanTask[];
}

/** Mapa de status por tarefa — futuramente persistido no servidor. */
export type TaskStatusMap = Record<string, TaskStatus>;

/** Plano gerado pelo motor determinístico a partir de um perfil. */
export interface PersonalizedPlan extends LearningPlan {
  engineVersion: string;
  onboardingVersion: number;
  /** Perfil exato usado na geração (para o resumo e para regenerar). */
  profile: OnboardingProfile;
  /** Minutos/dia usados para distribuir os dias sugeridos. */
  dailyMinutes: number;
  /** Dicas gerais (equipamento, ritmo). Não são regras da plataforma. */
  tips: string[];
}

/** Registro de mudança de status na sessão (histórico preservado ao replanejar). */
export interface TaskStatusEvent {
  seq: number;
  taskId: string;
  from: TaskStatus;
  to: TaskStatus;
}

/* ------------------------------------------------------------------ */
/* Contratos de persistência FUTURA (ainda não implementados)          */
/* ------------------------------------------------------------------ */

/** Respostas do onboarding como serão gravadas no servidor. */
export interface OnboardingSubmissionRecord {
  userId: string;
  onboardingVersion: number;
  answers: OnboardingProfile;
  submittedAt: string; // ISO
}

/** Progresso do plano como será gravado no servidor (por usuária). */
export interface PlanProgressRecord {
  userId: string;
  onboardingVersion: number;
  engineVersion: string;
  /** Status por ID estável — inclui atividades fora do plano atual. */
  taskStatus: TaskStatusMap;
  completedTaskIds: string[];
  updatedAt: string; // ISO
}

/* ------------------------------------------------------------------ */
/* Gamificação                                                         */
/* ------------------------------------------------------------------ */

export interface GamificationSummary {
  points: number;
  levelName: string;
  levelNumber: number;
  pointsToNextLevel: number;
  streakDays: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  /** "verified" só quando vier de evento verificável no servidor. */
  source: "demo" | "self_reported" | "verified";
}

/* ------------------------------------------------------------------ */
/* Navegação                                                           */
/* ------------------------------------------------------------------ */

export type NavGroupId = "aprender" | "criar" | "comunidade" | "conta" | "gestao";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: NavGroupId;
  /** "available" = tela implementada; "soon" = placeholder "Em breve". */
  status: "available" | "soon";
  /** Descrição curta usada nas páginas "Em breve" e no acesso rápido. */
  description: string;
  /** Rótulo curto (barra inferior do celular). */
  shortLabel?: string;
  /**
   * Tem tela interativa no MODO DEMO local (dados de exemplo). Fora da demo,
   * continua "Em breve" até existir dado real.
   */
  demoReady?: boolean;
  /**
   * Papéis que veem o item no menu. ATENÇÃO: isto é apenas visual.
   * Autorização real deve ser checada no servidor em cada rota restrita.
   */
  visibleTo?: UserRole[];
}

export interface NavigationGroup {
  id: NavGroupId;
  label: string;
}

/* ------------------------------------------------------------------ */
/* Comunicados                                                         */
/* ------------------------------------------------------------------ */

export interface Announcement {
  id: string;
  title: string;
  body: string;
  kind: "sistema" | "numi" | "live";
  isDemo: boolean;
}
