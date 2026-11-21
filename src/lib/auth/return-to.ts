/**
 * `returnTo` seguro: só caminhos INTERNOS de uma lista permitida.
 * Bloqueia open redirect (https://…, //host, /\host, esquemas, codificações).
 * Módulo puro.
 */
export const DEFAULT_RETURN_TO = "/inicio";

const ALLOWED_PREFIXES = [
  "/inicio",
  "/meu-plano",
  "/onboarding",
  "/aulas",
  "/videos-virais",
  "/estudio-ia",
  "/marketplace",
  "/minhas-vendas",
  "/materiais",
  "/comunidade",
  "/lives",
  "/desafios",
  "/ranking",
  "/conquistas",
  "/recompensas",
  "/perfil",
  "/suporte",
  "/regras-faq",
  "/admin",
];

export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) return DEFAULT_RETURN_TO;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_RETURN_TO;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\s\u0000-\u001f]/.test(decoded)) return DEFAULT_RETURN_TO;
  const path = decoded.split(/[?#]/)[0];
  if (!/^\/[a-z0-9\-/]*$/.test(path)) return DEFAULT_RETURN_TO;
  const allowed = ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  return allowed ? path : DEFAULT_RETURN_TO;
}

/** Rotas privadas (protegidas no Proxy e, de verdade, no servidor). */
export function isPrivatePath(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname === "/";
}
