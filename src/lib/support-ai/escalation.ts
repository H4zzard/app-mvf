/**
 * Assuntos que exigem a EQUIPE (o assistente não resolve nem decide).
 * Detecção conservadora: oferecer o encaminhamento nunca é um erro grave;
 * fingir que resolveu, sim. Módulo puro.
 */
import { normalize } from "../support/search.ts";

export type HandoffTopic = "reembolso" | "cobranca" | "pagamento" | "acesso_persistente" | "matricula" | "conta_sensivel" | "reclamacao";

export const HANDOFF_LABEL: Record<HandoffTopic, string> = {
  reembolso: "Reembolso",
  cobranca: "Cobrança",
  pagamento: "Erro de pagamento",
  acesso_persistente: "Problema de acesso que continua",
  matricula: "Matrícula não reconhecida",
  conta_sensivel: "Alteração na conta",
  reclamacao: "Reclamação",
};

const RULES: [HandoffTopic, RegExp][] = [
  ["reembolso", /\b(reembols\w*|estorn\w*|devolu[cç][aã]o do (meu )?dinheiro|quero (meu )?dinheiro de volta|cancelar (a )?compra)\b/],
  ["cobranca", /\b(cobra(do|da|ram|ndo|nca|n[cç]a)|cobrou|cobran[cç]a|duas vezes|em dobro|fatura)\b/],
  ["pagamento", /\b(pagamento (recusado|nao (foi )?aprovado|falhou|deu erro)|erro (no|de) pagamento|pix nao (caiu|compensou)|boleto)\b/],
  ["matricula", /\b(matricula|compra) (nao (foi )?(reconhecida|encontrada|aparece|liberada)|sumiu)|nao (encontra|acha|reconhece) (minha )?(compra|matricula)\b/],
  ["acesso_persistente", /\b(continuo|continua|ainda|de novo|faz dias|ja tentei)\b.{0,40}\b(sem acesso|nao (consigo|da para|da pra) (entrar|acessar|logar)|acesso (bloqueado|negado|indisponivel))\b/],
  ["conta_sensivel", /\b(trocar|mudar|alterar) (o |meu )?(e-?mail|cpf|titular)|excluir (minha )?conta|apagar (meus )?dados\b/],
  ["reclamacao", /\b(reclama[cç][aã]o|procon|reclame aqui|absurdo|quero falar com (alguem|uma pessoa|humano|atendente))\b/],
];

/** Primeiro assunto sensível encontrado no texto (ou null). */
export function detectHandoff(text: string): HandoffTopic | null {
  const t = normalize(text);
  for (const [topic, re] of RULES) if (re.test(t)) return topic;
  return null;
}
