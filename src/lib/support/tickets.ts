/**
 * Solicitações de suporte (tickets). Módulo PURO.
 *
 * Na demonstração, um ticket só pode ficar como RASCUNHO ou SIMULADO: nada é
 * enviado, e a interface nunca diz que a equipe recebeu. Os demais estados e a
 * atribuição existem para o futuro backend (permissão `support:assign`).
 */

export type TicketCategory = "acesso" | "aulas" | "tiktok-shop" | "conteudo" | "estudio" | "outro";

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  acesso: "Acesso e login",
  aulas: "Aulas e plano",
  "tiktok-shop": "TikTok Shop",
  conteudo: "Criação de conteúdo",
  estudio: "Estúdio IA",
  outro: "Outro assunto",
};

/**
 * - rascunho / simulado: únicos estados possíveis na demo.
 * - aberto → em_atendimento → aguardando_aluna → resolvido: fluxo real (futuro).
 */
export type TicketStatus = "rascunho" | "simulado" | "aberto" | "em_atendimento" | "aguardando_aluna" | "resolvido";

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  rascunho: "Rascunho",
  simulado: "Simulação · não enviado",
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_aluna: "Aguardando sua resposta",
  resolvido: "Resolvido",
};

export const DEMO_TICKET_STATUSES: TicketStatus[] = ["rascunho", "simulado"];

export interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  /** Futuro: membro da equipe responsável (atribuído no servidor). */
  assignee: null | { userId: string };
}

export interface TicketDraft {
  subject: string;
  category: TicketCategory | "";
  description: string;
}

export const TICKET_LIMITS = { subjectMin: 5, subjectMax: 80, descriptionMin: 20, descriptionMax: 1000, maxTickets: 20 } as const;

/**
 * Dados que NUNCA devem ir num ticket: senha, código de verificação, token,
 * CPF, cartão. Detecção simples e conservadora (falso positivo só pede revisão).
 */
const SENSITIVE: { re: RegExp; label: string }[] = [
  { re: /\b(minha\s+)?senha\s*(é|e|:|=)\s*\S+/i, label: "senha" },
  { re: /\b(c[oó]digo|token|chave)\s*(de\s+(acesso|verifica[cç][aã]o|seguran[cç]a))?\s*(é|e|:|=)\s*[A-Za-z0-9-]{4,}/i, label: "código ou token" },
  { re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, label: "CPF" },
  { re: /\b(?:\d[ -]?){13,19}\b/, label: "número de cartão" },
];

export function sensitiveFindings(text: string): string[] {
  return SENSITIVE.filter((s) => s.re.test(text)).map((s) => s.label);
}

export type TicketErrors = Partial<Record<"subject" | "category" | "description", string>>;

export function validateTicket(d: TicketDraft): TicketErrors {
  const e: TicketErrors = {};
  const subject = d.subject.trim();
  const description = d.description.trim();
  if (subject.length < TICKET_LIMITS.subjectMin) e.subject = "Escreva um assunto curto (pelo menos 5 caracteres).";
  else if (subject.length > TICKET_LIMITS.subjectMax) e.subject = `Use até ${TICKET_LIMITS.subjectMax} caracteres.`;
  if (!d.category) e.category = "Escolha a categoria.";
  if (description.length < TICKET_LIMITS.descriptionMin) e.description = "Conte o que aconteceu (pelo menos 20 caracteres).";
  else if (description.length > TICKET_LIMITS.descriptionMax) e.description = `Use até ${TICKET_LIMITS.descriptionMax} caracteres.`;
  const found = sensitiveFindings(`${subject} ${description}`);
  if (found.length) {
    const msg = `Remova dados sensíveis (${found.join(", ")}). A equipe nunca pede senha, códigos ou documentos.`;
    if (sensitiveFindings(description).length) e.description = msg;
    else e.subject = msg;
  }
  return e;
}

export const isTicketCategory = (v: unknown): v is TicketCategory => typeof v === "string" && v in TICKET_CATEGORY_LABEL;
