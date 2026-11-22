/**
 * Verificador central de permissões por papel (salvo no banco, nunca vindo da UI).
 * Permissões finas do módulo de gestão serão detalhadas no próximo prompt.
 * Módulo puro.
 */
import type { UserRole } from "@/types";

export const STAFF_ROLES: UserRole[] = ["admin", "expert", "support", "moderator"];

export type Permission = "admin:access" | "integration:read" | "community:moderate" | "support:assign";

const MATRIX: Record<Permission, UserRole[]> = {
  /** Entrar em /admin. */
  "admin:access": ["admin", "expert", "support", "moderator"],
  /** Ver saúde da integração Kiwify (eventos, importações). */
  "integration:read": ["admin", "support"],
  /** Fila de denúncias da Comunidade: ocultar ou manter publicações e comentários. */
  "community:moderate": ["admin", "moderator"],
  /** Atribuir e responder solicitações de suporte (futuro backend). */
  "support:assign": ["admin", "support"],
};

export function can(roles: readonly UserRole[], permission: Permission): boolean {
  return roles.some((r) => MATRIX[permission].includes(r));
}

const PRIORITY: UserRole[] = ["owner", "admin", "expert", "support", "moderator", "partner", "student"];

/** Papel principal para exibição (o menu usa isto; a autorização usa `can`). */
export function primaryRole(roles: readonly UserRole[]): UserRole {
  return PRIORITY.find((r) => roles.includes(r)) ?? "student";
}

const VALID = new Set<string>(["student", "admin", "expert", "moderator", "support", "partner"]);

export function parseRoles(value: unknown): UserRole[] {
  return Array.isArray(value) ? (value.filter((r) => typeof r === "string" && VALID.has(r)) as UserRole[]) : [];
}

/** Decisão HTTP para rotas de gestão (testável sem Next). */
export function adminRequestStatus(
  viewer: { kind: "member"; roles: UserRole[] } | { kind: "anonymous" | "denied" | "demo" | "unconfigured" },
  permission: Permission,
): 200 | 401 | 403 {
  if (viewer.kind === "anonymous" || viewer.kind === "unconfigured") return 401;
  if (viewer.kind !== "member") return 403; // demo e sem acesso nunca leem dados de gestão
  return can(viewer.roles, permission) ? 200 : 403;
}
