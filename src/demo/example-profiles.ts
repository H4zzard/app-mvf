/**
 * DEMONSTRAÇÃO — os 5 perfis obrigatórios usados para validar o motor
 * (testes em src/lib/personalization/engine.test.ts e `npm run plans:examples`).
 * Campos não especificados no Prompt 02 receberam valores neutros.
 */
import type { OnboardingProfile } from "@/types";

export interface ExampleProfile {
  key: string;
  label: string;
  profile: OnboardingProfile;
}

export const EXAMPLE_PROFILES: ExampleProfile[] = [
  {
    key: "p1-avatar",
    label: "1 · Iniciante, não aparece + avatar de IA, 30 min, só celular, conta não preparada",
    profile: {
      experience: "nunca_vendi",
      accountReady: "nao",
      wantsToAppear: "nao",
      formats: ["avatar_ia"],
      aiExperience: "nunca_usei",
      dailyMinutes: "30",
      device: "celular",
      mainBlocker: "entender_tiktok_shop",
      goal: "primeiro_video",
      numiAccess: "sim",
    },
  },
  {
    key: "p2-maos",
    label: "2 · Iniciante, não aparece + mãos/produto, 15 min, já tem conta",
    profile: {
      experience: "tentando_comecar",
      accountReady: "sim",
      wantsToAppear: "nao",
      formats: ["maos_produto"],
      aiExperience: "uso_um_pouco",
      dailyMinutes: "15",
      device: "celular",
      mainBlocker: "gravar",
      goal: "primeiro_video",
      numiAccess: "sim",
    },
  },
  {
    key: "p3-camera-experiente",
    label: "3 · Aparece, já vendeu, 60 min, quer consistência",
    profile: {
      experience: "ja_vendi",
      accountReady: "sim",
      wantsToAppear: "sim",
      formats: [],
      aiExperience: "uso_um_pouco",
      dailyMinutes: "60",
      device: "ambos",
      mainBlocker: "organizacao",
      goal: "consistencia",
      numiAccess: "sim",
    },
  },
  {
    key: "p4-explorar",
    label: "4 · Indecisa, quer explorar, 30 min, não sabe se tem acesso à NUMI",
    profile: {
      experience: "tentando_comecar",
      accountReady: "nao_sei",
      wantsToAppear: "talvez",
      formats: ["quero_explorar"],
      aiExperience: "uso_um_pouco",
      dailyMinutes: "30",
      device: "celular",
      mainBlocker: "escolher_produto",
      goal: "primeira_comissao",
      numiAccess: "nao_sei",
    },
  },
  {
    key: "p5-avatar-maos",
    label: "5 · Não aparece, avatar + mãos/produto, 90+ min",
    profile: {
      experience: "nunca_vendi",
      accountReady: "sim",
      wantsToAppear: "nao",
      formats: ["avatar_ia", "maos_produto"],
      aiExperience: "uso_com_frequencia",
      dailyMinutes: "90_mais",
      device: "computador",
      mainBlocker: "roteiros",
      goal: "primeira_comissao",
      numiAccess: "sim",
    },
  },
];
