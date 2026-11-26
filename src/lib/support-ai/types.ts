/**
 * Suporte inteligente (Assistente MVF) — contratos de dados.
 * Módulo puro: sem React, sem rede, sem `server-only`.
 */

export type ConversationStatus = "open" | "closing" | "closed";
export type Sender = "student" | "assistant" | "system";

export interface SupportMessage {
  id: string;
  conversationId: string;
  sender: Sender;
  content: string;
  /** ISO 8601 em UTC. */
  createdAt: string;
  /** Ordem estável dentro da conversa (1, 2, 3…). */
  seq: number;
  /** Fontes usadas na resposta (só do assistente). Nunca inventadas: vêm da recuperação. */
  sources?: SourceRef[];
}

export interface SupportConversation {
  id: string;
  /** Dono: id da aluna (Auth) ou `demo:<aba>` no modo demonstração. */
  ownerId: string;
  /** Nome autorizado para a transcrição (display name; nunca e-mail/CPF). */
  ownerLabel: string;
  status: ConversationStatus;
  origin: "central_de_ajuda";
  category: string | null;
  /** Resumo controlado do contexto anterior (memória de longo prazo DENTRO do atendimento). */
  summary: string | null;
  summaryUpToSeq: number;
  /** Encaminhamento humano solicitado pela aluna (não significa atendimento iniciado). */
  handoffRequestedAt: string | null;
  handoffTopic: string | null;
  startedAt: string;
  closedAt: string | null;
  /** Resposta do assistente em andamento (bloqueia mensagens simultâneas). */
  pendingSince: string | null;
  transcript: string | null;
  transcriptGeneratedAt: string | null;
  /** Retenção: null = política ainda não definida (não apaga automaticamente). */
  retentionUntil: string | null;
}

export interface SourceRef {
  docId: string;
  title: string;
  /** Aula do catálogo, quando o trecho pertence a uma aula existente. */
  lessonId?: string;
  /** Link interno validado no servidor (ex.: /aulas/l-roteiro). */
  href?: string;
  /** Documento ainda não aprovado (só aparece no modo demonstração). */
  draft?: boolean;
}

/* ------------------------- Base de conhecimento ------------------------- */

export type KnowledgeType =
  | "transcricao"
  | "pdf"
  | "material"
  | "faq"
  | "documento_interno"
  | "tutorial_app"
  | "guia_tiktok_shop"
  | "regras"
  | "produto"
  | "procedimento_atendimento";

export type ApprovalStatus = "rascunho" | "em_revisao" | "aprovado" | "arquivado";

/** Quem pode ser atendida com o documento (o assistente só usa o que a aluna pode ver). */
export type KnowledgeAccess = "alunas" | "equipe";

export interface KnowledgeDocument {
  id: string;
  title: string;
  /** De onde veio (arquivo, aula, equipe). Nunca URL de vídeo. */
  origin: string;
  type: KnowledgeType;
  moduleId?: string;
  lessonId?: string;
  version: number;
  /** AAAA-MM-DD */
  updatedAt: string;
  status: ApprovalStatus;
  access: KnowledgeAccess;
  /** Texto já processado (extraído e normalizado). */
  text: string;
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  ord: number;
  text: string;
  /** Hash do texto (detecção de duplicatas e reindexação). */
  hash: string;
}

/* ------------------------------ Modelo (LLM) ------------------------------ */

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ProviderErrorCode = "disabled" | "timeout" | "rate_limited" | "unavailable" | "auth" | "budget" | "invalid" | "unknown";

export type ProviderResult = { ok: true; text: string; usage?: { input: number; output: number } } | { ok: false; error: ProviderErrorCode };

export interface SupportProvider {
  /** Rótulo honesto mostrado na interface (ex.: “modelo local (sem IA)”). */
  readonly label: string;
  readonly kind: "deepseek" | "local";
  complete(turns: ChatTurn[], opts: { userKey: string; signal?: AbortSignal }): Promise<ProviderResult>;
}
