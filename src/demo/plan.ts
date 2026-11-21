/**
 * DEMONSTRAÇÃO — perfil de exemplo exibido antes de a aluna fazer o onboarding.
 *
 * A trilha de exemplo NÃO é mais uma lista fixa: é gerada pelo motor
 * (src/lib/personalization/engine.ts) a partir deste perfil, igual ao plano de
 * qualquer aluna. Corresponde ao perfil 1 dos exemplos obrigatórios:
 * iniciante, não aparece + avatar de IA, 30 min/dia, só celular, conta não preparada.
 */
import type { OnboardingProfile, TaskStatusMap } from "@/types";

export const EXAMPLE_PROFILE: OnboardingProfile = {
  experience: "nunca_vendi",
  accountReady: "nao",
  wantsToAppear: "nao",
  formats: ["avatar_ia"],
  aiExperience: "uso_um_pouco",
  dailyMinutes: "30",
  device: "celular",
  mainBlocker: "escolher_produto",
  goal: "primeiro_video",
  numiAccess: "nao_sei",
};

/**
 * Estado inicial do exemplo: algumas atividades concluídas e uma em andamento,
 * referenciadas por ID estável. Volta a este estado ao recarregar a página.
 */
export const DEMO_INITIAL_STATUS: TaskStatusMap = {
  "t-boas-vindas": "completed",
  "t-fundamentos": "completed",
  "t-elegibilidade": "completed",
  "t-conta-pronta": "completed",
  "t-acesso-numi": "completed",
  "t-aula-produto": "in_progress",
};
