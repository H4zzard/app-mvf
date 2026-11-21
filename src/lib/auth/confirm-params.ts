/**
 * Validação dos parâmetros do link mágico (`/auth/confirm`). Módulo puro.
 * Aceita o formato recomendado (token_hash + type=email|magiclink) e o
 * `code` do fluxo PKCE. Qualquer outra coisa → null (link inválido).
 */

/** Cookie httpOnly com o destino pós-login (gravado em /login, lido em /auth/confirm). */
export const RETURN_TO_COOKIE = "mvf_return_to";

const ALLOWED_TYPES = new Set(["email", "magiclink"]);
const TOKEN = /^[A-Za-z0-9_-]{8,256}$/;

export type ConfirmParams =
  | { kind: "token_hash"; tokenHash: string; type: "email" | "magiclink" }
  | { kind: "code"; code: string };

export function parseConfirmParams(raw: { token_hash?: unknown; type?: unknown; code?: unknown }): ConfirmParams | null {
  const str = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : null);
  const tokenHash = str(raw.token_hash);
  const type = str(raw.type);
  const code = str(raw.code);
  if (tokenHash) {
    if (!type || !ALLOWED_TYPES.has(type) || !TOKEN.test(tokenHash)) return null;
    return { kind: "token_hash", tokenHash, type: type as "email" | "magiclink" };
  }
  if (code && TOKEN.test(code)) return { kind: "code", code };
  return null;
}
