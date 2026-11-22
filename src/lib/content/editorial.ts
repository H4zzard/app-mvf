/**
 * Fluxo editorial do painel (aulas, produtos e roteiros). Módulo PURO.
 *
 * Semântica (mostrada na interface):
 * - rascunho: em edição; nada sai daqui.
 * - em_revisao: pronto para alguém revisar; os campos obrigatórios estão válidos.
 * - aprovado: NA DEMONSTRAÇÃO, marcado como aprovado por um perfil simulado.
 *   Não significa que a equipe real aprovou.
 * - publicado_local: visível só na prévia deste navegador. Não vai para a Vercel
 *   nem para alunas reais; a publicação real é: exportar → revisar → importar pelo CLI.
 * - arquivado: fora das listas e das exportações (pode voltar a rascunho).
 */
import type { Permission } from "../auth/permissions.ts";

export type EditorialStatus = "rascunho" | "em_revisao" | "aprovado" | "publicado_local" | "arquivado";

export const STATUS_LABEL: Record<EditorialStatus, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  aprovado: "Aprovado (demonstração)",
  publicado_local: "Publicado localmente",
  arquivado: "Arquivado",
};

export const STATUS_MEANING: Record<EditorialStatus, string> = {
  rascunho: "Em edição. Ainda não foi enviado para revisão.",
  em_revisao: "Aguardando revisão. Os campos obrigatórios estão válidos.",
  aprovado: "Aprovado nesta demonstração por um perfil simulado. Não é aprovação real da equipe.",
  publicado_local: "Aparece só nas prévias deste navegador. Não foi publicado na Vercel nem para alunas.",
  arquivado: "Fora das listas e das exportações. Pode voltar a rascunho.",
};

export interface TransitionRule {
  to: EditorialStatus;
  label: string;
  permission: Permission;
  /** Exige validação completa (pronto para ser oficial), não só a estrutural. */
  requiresComplete: boolean;
}

const RULES: Record<EditorialStatus, TransitionRule[]> = {
  rascunho: [
    { to: "em_revisao", label: "Enviar para revisão", permission: "content:edit", requiresComplete: false },
    { to: "arquivado", label: "Arquivar", permission: "content:edit", requiresComplete: false },
  ],
  em_revisao: [
    { to: "aprovado", label: "Aprovar (demonstração)", permission: "content:review", requiresComplete: true },
    { to: "rascunho", label: "Devolver para rascunho", permission: "content:review", requiresComplete: false },
    { to: "arquivado", label: "Arquivar", permission: "content:edit", requiresComplete: false },
  ],
  aprovado: [
    { to: "publicado_local", label: "Publicar localmente", permission: "content:publish", requiresComplete: true },
    { to: "em_revisao", label: "Reabrir revisão", permission: "content:review", requiresComplete: false },
    { to: "arquivado", label: "Arquivar", permission: "content:edit", requiresComplete: false },
  ],
  publicado_local: [
    { to: "aprovado", label: "Despublicar (voltar a aprovado)", permission: "content:publish", requiresComplete: false },
    { to: "arquivado", label: "Arquivar", permission: "content:publish", requiresComplete: false },
  ],
  arquivado: [{ to: "rascunho", label: "Restaurar como rascunho", permission: "content:edit", requiresComplete: false }],
};

export const transitionsFrom = (s: EditorialStatus): TransitionRule[] => RULES[s];

export interface TransitionContext {
  /** O perfil tem a permissão? (na demo, perfil SIMULADO; no real, verificado no servidor) */
  can: (p: Permission) => boolean;
  /** Erros que impedem salvar (estrutura). */
  errors: string[];
  /** O que falta para virar conteúdo oficial pronto. */
  missing: string[];
}

export type TransitionResult = { ok: true } | { ok: false; reason: string };

export function checkTransition(from: EditorialStatus, to: EditorialStatus, ctx: TransitionContext): TransitionResult {
  const rule = RULES[from].find((r) => r.to === to);
  if (!rule) return { ok: false, reason: `Não é possível ir de “${STATUS_LABEL[from]}” para “${STATUS_LABEL[to]}”.` };
  if (!ctx.can(rule.permission)) return { ok: false, reason: "O perfil escolhido não tem permissão para esta ação." };
  // Entrar em revisão exige estrutura válida; aprovar/publicar exige o conteúdo completo.
  if (to !== "rascunho" && to !== "arquivado" && ctx.errors.length) return { ok: false, reason: `Corrija antes: ${ctx.errors[0]}` };
  if (rule.requiresComplete && ctx.missing.length) return { ok: false, reason: `Falta preencher: ${ctx.missing.join(", ")}.` };
  return { ok: true };
}

/** Entra na exportação OFICIAL (arquivo para importar pelo CLI). */
export const isExportable = (s: EditorialStatus) => s === "aprovado" || s === "publicado_local";
/** Aparece nas prévias locais. */
export const isLocallyPublished = (s: EditorialStatus) => s === "publicado_local";
