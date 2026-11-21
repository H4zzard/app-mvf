/**
 * Mensagens do login por e-mail. Módulo PURO (testável).
 * Decisão do operador (D63): a tela informa se o e-mail tem compra.
 */

export type BuyerStatus = "active" | "inactive" | "none" | "unavailable";

export interface LoginState {
  status: "idle" | "sent" | "error";
  message: string | null;
  /** E-mail para o qual o link foi enviado (só no sucesso, para exibir na tela). */
  email?: string;
}

export const LOGIN_MESSAGES = {
  invalidEmail: "Digite um e-mail válido, o mesmo usado na compra.",
  notFound: "Não encontramos este e-mail em nenhuma compra. Confira se é o mesmo e-mail usado na Kiwify.",
  inactive: "Encontramos seu e-mail, mas não há uma compra ativa para ele. Fale com o suporte do MVF.",
  unavailable: "Não foi possível verificar seu e-mail agora. Tente novamente em instantes.",
  tooMany: "Muitas tentativas. Aguarde alguns minutos antes de pedir outro link.",
  cooldown: "Já enviamos um link para este e-mail há pouco. Aguarde 1 minuto e tente de novo.",
  sendFailed: "Não conseguimos enviar o e-mail agora. Tente novamente em instantes.",
  sent: "Pronto! Enviamos o link de acesso para o seu e-mail.",
} as const;

/** Resultado da verificação antes de enviar o link. `null` = pode enviar. */
export function stateForBuyerStatus(status: BuyerStatus): LoginState | null {
  switch (status) {
    case "active":
      return null;
    case "none":
      return { status: "error", message: LOGIN_MESSAGES.notFound };
    case "inactive":
      return { status: "error", message: LOGIN_MESSAGES.inactive };
    case "unavailable":
      return { status: "error", message: LOGIN_MESSAGES.unavailable };
  }
}

/** Resultado do envio do link pelo Supabase Auth. */
export function stateForSendResult(error: { code?: string | null; status?: number | null } | null, email: string): LoginState {
  if (!error) return { status: "sent", message: LOGIN_MESSAGES.sent, email };
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return { status: "error", message: LOGIN_MESSAGES.cooldown };
  }
  return { status: "error", message: LOGIN_MESSAGES.sendFailed };
}
