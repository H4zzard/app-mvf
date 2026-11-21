"use client";

import { useActionState } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestMagicLink } from "./actions";
import type { LoginState } from "@/lib/auth/login-messages";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestMagicLink, { status: "idle", message: null });

  if (state.status === "sent") {
    return (
      <div role="status" aria-live="polite">
        <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
          <MailCheck aria-hidden className="size-6" />
        </span>
        <h2 className="mt-4 font-serif text-xl font-semibold text-fg">Link enviado!</h2>
        <p className="mt-2 text-sm text-muted">{state.message}</p>
        {state.email ? <p className="mt-1 break-all text-sm font-semibold text-fg">{state.email}</p> : null}
        <ul className="mt-4 space-y-1.5 text-sm text-muted">
          <li>• O link vale por tempo limitado e só pode ser usado uma vez.</li>
          <li>• Não chegou? Veja a caixa de spam e promoções.</li>
          <li>• Abra o link neste celular ou computador e toque em “Entrar”.</li>
        </ul>
        <a href="/login" className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">
          Usar outro e-mail
        </a>
        <p className="mt-1 text-xs text-subtle">Para pedir outro link para o mesmo e-mail, aguarde 1 minuto.</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div>
        <label htmlFor="email" className="text-sm font-medium text-fg">
          E-mail usado na compra
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-describedby={state.status === "error" ? "login-error" : "login-help"}
          aria-invalid={state.status === "error" || undefined}
          placeholder="voce@exemplo.com"
          className="mt-1.5 min-h-12 w-full rounded-2xl border border-line-strong bg-card px-4 text-base text-fg placeholder:text-subtle focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        />
        <p id="login-help" className="mt-1.5 text-xs text-muted">
          Enviaremos um link de acesso. Não é preciso senha.
        </p>
      </div>
      {state.status === "error" && state.message ? (
        <p id="login-error" role="alert" className="rounded-xl bg-blush px-3 py-2 text-sm text-brand">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Receber link de acesso"}
        {!pending ? <ArrowRight aria-hidden className="size-4" /> : null}
      </Button>
    </form>
  );
}
