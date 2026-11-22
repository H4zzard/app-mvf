/**
 * Perfis da equipe no painel DEMONSTRATIVO. Módulo PURO.
 *
 * Reaproveita a matriz única (`src/lib/auth/permissions.ts`): Administrador,
 * Moderador e Suporte SÃO papéis existentes (`admin`, `moderator`, `support`).
 * “Editor de conteúdo” e “Revisor” ainda NÃO existem no banco: são conceitos
 * (conjuntos de permissões) documentados para a fase de backend — criá-los
 * exigirá migration e decisão do operador. Nada aqui é segurança real.
 */
import type { UserRole } from "@/types";
import { can, permissionsOf, type Permission } from "../auth/permissions.ts";

export type AdminProfile = "administrador" | "editor" | "revisor" | "moderador" | "suporte";

export interface AdminProfileInfo {
  id: AdminProfile;
  label: string;
  description: string;
  /** Papel existente no banco, quando houver. */
  role: UserRole | null;
  /** Para conceitos sem papel no banco: o conjunto de permissões proposto. */
  proposed?: Permission[];
}

export const ADMIN_PROFILES: AdminProfileInfo[] = [
  { id: "administrador", label: "Administrador", description: "Edita, revisa e publica conteúdo.", role: "admin" },
  { id: "editor", label: "Editor de conteúdo", description: "Cria e edita rascunhos e envia para revisão.", role: null, proposed: ["admin:access", "content:edit"] },
  { id: "revisor", label: "Revisor", description: "Aprova ou devolve conteúdo em revisão.", role: null, proposed: ["admin:access", "content:review"] },
  { id: "moderador", label: "Moderador", description: "Comunidade (etapa 13B). Sem edição de conteúdo.", role: "moderator" },
  { id: "suporte", label: "Suporte", description: "Atendimento (etapa 13B). Sem edição de conteúdo.", role: "support" },
];

export function profileInfo(id: AdminProfile): AdminProfileInfo {
  return ADMIN_PROFILES.find((p) => p.id === id) ?? ADMIN_PROFILES[0];
}

/** Permissões efetivas do perfil simulado. */
export function profilePermissions(id: AdminProfile): Permission[] {
  const p = profileInfo(id);
  return p.role ? permissionsOf([p.role]) : [...(p.proposed ?? [])];
}

export function profileCan(id: AdminProfile, permission: Permission): boolean {
  const p = profileInfo(id);
  return p.role ? can([p.role], permission) : (p.proposed ?? []).includes(permission);
}
