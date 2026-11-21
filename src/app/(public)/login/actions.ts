"use server";

import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { readConfig } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/kiwify/rules";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { RETURN_TO_COOKIE } from "@/lib/auth/confirm-params";

export interface LoginState {
  status: "idle" | "sent" | "error";
  message: string | null;
}

/** Resposta SEMPRE igual para e-mail cadastrado ou não (não expõe a base de compradoras). */
const NEUTRAL: LoginState = {
  status: "sent",
  message: "Se este e-mail tiver acesso ao MVF, você vai receber um link para entrar em instantes.",
};

const perEmail = new RateLimiter(3, 10 * 60_000);
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
  if (!email) return { status: "error", message: "Digite um e-mail válido, o mesmo usado na compra." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const emailKey = createHash("sha256").update(email).digest("hex");
  if (!perIp.take(ip) || !perEmail.take(emailKey)) {
    return { status: "error", message: "Muitas tentativas. Aguarde alguns minutos antes de pedir outro link." };
  }

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
      // Sem cadastro público: só contas provisionadas a partir de compra verificada.
      shouldCreateUser: false,
      emailRedirectTo: `${config.appBaseUrl}/auth/confirm`,
    },
  });

  if (error) {
    // Conta inexistente também cai aqui; a resposta pública continua neutra.
    // O 429 do Supabase (intervalo de 60 s por usuária) só ocorre para contas que
    // EXISTEM: responder diferente revelaria quem é compradora. Por isso fica neutro
    // também; o limitador local acima avisa “muitas tentativas” igual para qualquer e-mail.
    console.warn("[login] signInWithOtp", { code: error.code ?? "sem_codigo", status: error.status ?? null });
  }
  return NEUTRAL;
}
