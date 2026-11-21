import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { PublicShell } from "@/components/auth/public-shell";
import { readConfig } from "@/lib/config/env";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  "link-invalido": "Este link expirou ou já foi usado. Peça um novo abaixo.",
  sessao: "Sua sessão expirou. Entre novamente.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <PublicShell>
      <h1 className="font-serif text-2xl font-semibold text-fg">Entrar no {"App MVF"}</h1>
      <p className="mt-1.5 text-sm text-muted">Acesso exclusivo para alunas do Marcas Virais Femininas.</p>
      <div className="mt-6">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-blush/60" />}>
          <LoginBody searchParams={searchParams} />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function LoginBody({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const config = readConfig();
  const returnTo = sanitizeReturnTo(typeof params.returnTo === "string" ? params.returnTo : undefined);
  const errorKey = typeof params.erro === "string" ? params.erro : null;
  const signedOut = params.saiu === "1";

  if (config.authMode === "demo") {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-canvas p-4 text-sm text-muted">
        <p className="flex items-center gap-2 font-semibold text-fg">
          <FlaskConical aria-hidden className="size-4" /> Modo demo local
        </p>
        <p className="mt-1">O login está desativado neste modo (somente desenvolvimento). Nada é gravado.</p>
        <Link href="/inicio" className="mt-3 inline-flex min-h-10 items-center font-semibold text-brand hover:underline">
          Abrir a demonstração
        </Link>
      </div>
    );
  }
  if (config.authMode !== "supabase") {
    return (
      <p role="status" className="rounded-2xl bg-canvas p-4 text-sm text-muted">
        O login ainda não está disponível: a plataforma está em configuração.
      </p>
    );
  }
  return (
    <>
      {signedOut ? (
        <p role="status" className="mb-4 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
          Você saiu da sua conta.
        </p>
      ) : null}
      {errorKey && ERRORS[errorKey] ? (
        <p role="alert" className="mb-4 rounded-xl bg-blush px-3 py-2 text-sm text-brand">
          {ERRORS[errorKey]}
        </p>
      ) : null}
      <LoginForm returnTo={returnTo} />
    </>
  );
}
