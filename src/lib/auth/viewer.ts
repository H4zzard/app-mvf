import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { UserRole } from "@/types";
import { readConfig } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseRoles } from "@/lib/auth/permissions";

/**
 * Data Access Layer de identidade/autorização. Fonte única para layout,
 * páginas, Server Actions e Route Handlers.
 *
 * - Identidade: getClaims() (JWT verificado), nunca getSession().
 * - Autorização: my_access() no banco (direito ativo OU papel de equipe).
 * - Falha de banco/Auth → erro (fail closed), nunca acesso por suposição.
 */
export type Viewer =
  | { kind: "demo" }
  | { kind: "unconfigured" }
  | { kind: "anonymous" }
  | { kind: "denied"; userId: string }
  | { kind: "member"; userId: string; email: string; roles: UserRole[]; displayName: string | null };

export const getViewer = cache(async (): Promise<Viewer> => {
  // Sempre por requisição: a configuração (variáveis de ambiente) e a sessão são
  // lidas em runtime, nunca congeladas no build (senão a tela "em configuração"
  // ou um estado de outra pessoa poderia ser pré-renderizado).
  await connection();
  const config = readConfig();
  if (config.authMode === "demo") return { kind: "demo" };
  if (config.authMode === "unconfigured") return { kind: "unconfigured" };

  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) return { kind: "anonymous" };

  const { data: access, error } = await supabase.rpc("my_access");
  if (error) throw new Error("Falha ao verificar o acesso.");
  const a = (access ?? {}) as { has_access?: boolean; roles?: unknown };
  if (a.has_access !== true) return { kind: "denied", userId: claims.sub };

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", claims.sub).maybeSingle();
  return {
    kind: "member",
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    roles: parseRoles(a.roles),
    displayName: (profile?.display_name as string | null) ?? null,
  };
});

/** Para layouts/páginas privadas: redireciona quem não pode entrar. */
export async function requirePrivateAccess(): Promise<Extract<Viewer, { kind: "demo" | "member" | "unconfigured" }>> {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/login");
  if (viewer.kind === "denied") redirect("/acesso-indisponivel");
  return viewer;
}

export type ActionAuth =
  | { ok: true; viewer: Extract<Viewer, { kind: "member" }> }
  | { ok: false; error: "unauthenticated" | "forbidden" | "unconfigured" | "demo" };

/** Para Server Actions: reautoriza a cada chamada, sem confiar no cliente. */
export async function authorizeMemberAction(): Promise<ActionAuth> {
  const viewer = await getViewer();
  switch (viewer.kind) {
    case "member":
      return { ok: true, viewer };
    case "anonymous":
      return { ok: false, error: "unauthenticated" };
    case "denied":
      return { ok: false, error: "forbidden" };
    case "demo":
      return { ok: false, error: "demo" };
    default:
      return { ok: false, error: "unconfigured" };
  }
}
