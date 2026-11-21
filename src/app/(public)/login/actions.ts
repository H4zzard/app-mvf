"use server";

import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { readConfig } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/kiwify/rules";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { RETURN_TO_COOKIE } from "@/lib/auth/confirm-params";
import { checkBuyerStatus } from "@/lib/auth/buyer-check";
import { LOGIN_MESSAGES, stateForBuyerStatus, stateForSendResult, type LoginState } from "@/lib/auth/login-messages";

/**
 * Pedido de link mágico.
 * 1) valida o e-mail; 2) limita tentativas; 3) verifica NO SERVIDOR se há compra
 * ativa (decisão D63: a tela informa quando não há); 4) só então envia o link.
 * Sem cadastro público: `shouldCreateUser: false`.
 */
const perEmail = new RateLimiter(5, 10 * 60_000);
const perIp = new RateLimiter(20, 10 * 60_000);

export async function requestMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const config = readConfig();
  if (config.authMode === "demo") {
    return { status: "error", message: "Modo demo local: o login está desativado. Acesse /inicio diretamente." };
  }
  if (config.authMode !== "supabase") {
    return { status: "error", message: "O login ainda não está disponível. Tente novamente mais tarde." };
  }

  const email = normalizeEmail(form.get("email"));
  if (!email) return { status: "error", message: LOGIN_MESSAGES.invalidEmail };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const emailKey = createHash("sha256").update(email).digest("hex");
  if (!perIp.take(ip) || !perEmail.take(emailKey)) {
    return { status: "error", message: LOGIN_MESSAGES.tooMany };
  }

  const blocked = stateForBuyerStatus(await checkBuyerStatus(email));
  if (blocked) return blocked;

  const returnTo = sanitizeReturnTo(form.get("returnTo"));
  (await cookies()).set(RETURN_TO_COOKIE, returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth",
    maxAge: 60 * 60,
  });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${config.appBaseUrl}/auth/confirm`,
    },
  });
  if (error) console.warn("[login] signInWithOtp", { code: error.code ?? "sem_codigo", status: error.status ?? null });
  return stateForSendResult(error ? { code: error.code ?? null, status: error.status ?? null } : null, email);
}
