/**
 * Rascunhos das três ferramentas do Estúdio (estado da DEMO, em memória).
 * Guardam o formulário e o último resultado para a aluna ir e voltar entre as
 * telas sem perder nada enquanto a demo estiver aberta. Módulo puro (só tipos).
 */
import type { AnimationBrief, AnimationPromptOutput, CharacterBrief, CharacterPromptOutput, RecordingScript, RecordingScriptBrief } from "./contracts.ts";

export type StudioTool = "personagem" | "animar" | "roteiros";

export interface CharacterDraft {
  brief: CharacterBrief;
  advanced: boolean;
  output: CharacterPromptOutput | null;
  outputKey: string | null;
}

export interface AnimatorDraft {
  brief: AnimationBrief;
  characterId: string | null;
  source: "biblioteca" | "colar";
  libraryId: string | null;
  pasted: string;
  output: AnimationPromptOutput | null;
  outputKey: string | null;
}

export interface RecordingDraft {
  brief: RecordingScriptBrief;
  scripts: RecordingScript[] | null;
  warnings: string[];
  favorites: string[];
  resultKey: string | null;
}

export interface StudioDrafts {
  personagem?: CharacterDraft;
  animar?: AnimatorDraft;
  roteiros?: RecordingDraft;
}
