"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { readConfig } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { RETURN_TO_COOKIE, parseConfirmParams } from "@/lib/auth/confirm-params";

/**
 * Valida o link mágico SOMENTE no POST (clique da pessoa no botão).
 * Motivo: filtros de e-mail corporativo (ex.: Safe Links) abrem links por GET
 * antes da aluna e consumiriam o token de uso único. O direito de acesso é
 * checado depois, no layout privado. Nunca logar o token.
 */
export async function confirmMagicLink(form: FormData): Promise<void> {
  const config = readConfig();
  if (config.authMode !== "supabase") redirect("/login?erro=link-invalido");

  const params = parseConfirmParams({
    token_hash: form.get("token_hash"),
    type: form.get("type"),
    code: form.get("code"),
  });
  if (!params) redirect("/login?erro=link-invalido");

  const supabase = await createSupabaseServerClient();
  let ok = false;
  if (params.kind === "token_hash") {
    const { error } = await supabase.auth.verifyOtp({ type: params.type as EmailOtpType, token_hash: params.tokenHash });
    ok = !error;
    if (error) console.warn("[auth/confirm] verifyOtp", { code: error.code ?? "sem_codigo" });
  } else {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    ok = !error;
    if (error) console.warn("[auth/confirm] exchangeCode", { code: error.code ?? "sem_codigo" });
  }
  if (!ok) redirect("/login?erro=link-invalido");

  const cookieStore = await cookies();
  const returnTo = sanitizeReturnTo(cookieStore.get(RETURN_TO_COOKIE)?.value);
  cookieStore.delete({ name: RETURN_TO_COOKIE, path: "/auth" });
  redirect(returnTo);
}
