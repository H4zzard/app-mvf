/**
 * Contexto derivado do perfil — o vocabulário que as regras do catálogo usam.
 * Módulo puro: sem React, sem "@/" em imports de valor (roda em `node --test`).
 */
import type { OnboardingProfile, PlanTaskType } from "@/types";
import { minutesPerDay } from "../../config/onboarding-questions.ts";

/** Núcleos de formato que podem compor um plano. */
export type Track = "camera" | "avatar" | "maos" | "narracao" | "explorar";

export const TRACK_LABEL: Record<Track, string> = {
  camera: "aparecendo na câmera",
  avatar: "avatar de IA",
  maos: "mãos e produto",
  narracao: "narração e imagens",
  explorar: "explorando formatos",
};

export interface PlanContext {
  profile: OnboardingProfile;
  /** Núcleos na ordem escolhida (o primeiro é o principal). */
  tracks: Track[];
  has: (track: Track) => boolean;
  beginner: boolean;
  experienced: boolean;
  /** Conta “não” ou “não sei”: entra checagem antes de publicar. */
  accountNeedsWork: boolean;
  /** Acesso NUMI “não” ou “não sei”: entra orientação antes de divulgar. */
  numiNeedsWork: boolean;
  minutes: number;
}

export function deriveTracks(profile: OnboardingProfile): Track[] {
  if (profile.wantsToAppear === "sim") return ["camera"];
  const map = {
    avatar_ia: "avatar",
    maos_produto: "maos",
    narracao_imagens: "narracao",
    quero_explorar: "explorar",
  } as const;
  const tracks = [...new Set(profile.formats.map((f) => map[f]))];
  // Perfil incompleto (sem formato) cai no percurso exploratório, nunca em vazio.
  return tracks.length > 0 ? tracks : ["explorar"];
}

export function deriveContext(profile: OnboardingProfile): PlanContext {
  const tracks = deriveTracks(profile);
  return {
    profile,
    tracks,
    has: (t) => tracks.includes(t),
    beginner: profile.experience !== "ja_vendi",
    experienced: profile.experience === "ja_vendi",
    accountNeedsWork: profile.accountReady !== "sim",
    numiNeedsWork: profile.numiAccess !== "sim",
    minutes: minutesPerDay(profile.dailyMinutes),
  };
}

/* ------------------------------------------------------------------ */
/* Contrato do catálogo                                                */
/* ------------------------------------------------------------------ */

export type StageId =
  | "s-preparacao"
  | "s-perfil-produto"
  | "s-formato"
  | "s-producao"
  | "s-publicacao"
  | "s-analise";

type Text = string | ((ctx: PlanContext) => string);

/**
 * Modelo de atividade. A ORDEM no array do catálogo é a ordem global do plano;
 * pré-requisitos só podem apontar para atividades anteriores (garante grafo sem ciclos).
 */
export interface TaskTemplate {
  id: string;
  stageId: StageId;
  type: PlanTaskType;
  lessonId?: string;
  title: Text;
  durationMinutes: number;
  /** Começa em um novo dia (ex.: análise precisa de tempo após publicar). */
  startsNewDay?: boolean;
  /** Candidatos: os que não entrarem no plano são descartados. */
  prerequisites: string[];
  /** Público-alvo legível (documentação / futura curadoria). */
  audience: string;
  tags: string[];
  include: (ctx: PlanContext) => boolean;
  /** Pode ser pulada por este perfil. Conformidade/elegibilidade nunca. */
  optional?: (ctx: PlanContext) => boolean;
  description: Text;
  objective: string;
  completionCriteria: string;
  why: (ctx: PlanContext) => string;
}

export interface StageTemplate {
  id: StageId;
  title: Text;
  shortTitle: Text;
  description: Text;
}

export function resolveText(text: Text, ctx: PlanContext): string {
  return typeof text === "function" ? text(ctx) : text;
}
