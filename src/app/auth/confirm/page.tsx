import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { PublicShell } from "@/components/auth/public-shell";
import { readConfig } from "@/lib/config/env";
import { parseConfirmParams } from "@/lib/auth/confirm-params";
import { confirmMagicLink } from "./actions";

export const metadata: Metadata = {
  title: "Confirmar entrada",
  // O token está na URL: não indexar e não enviar como Referer.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Página intermediária do link mágico. Abrir o link (GET) NÃO consome o token:
 * só o clique em “Entrar” (POST) valida. Assim, robôs de segurança de e-mail
 * que pré-abrem links não queimam o acesso da aluna.
 */
export default function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  return (
    <PublicShell>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-blush/60" />}>
        <ConfirmBody searchParams={searchParams} />
      </Suspense>
    </PublicShell>
  );
}

async function ConfirmBody({ searchParams }: { searchParams: PageProps<"/auth/confirm">["searchParams"] }) {
  const params = parseConfirmParams(await searchParams);
  const available = readConfig().authMode === "supabase";

  if (!params || !available) {
    return (
      <>
        <h1 className="font-serif text-2xl font-semibold text-fg">Link inválido</h1>
        <p role="alert" className="mt-2 text-sm text-muted">
          {available ? "Este link está incompleto, expirou ou já foi usado." : "O login ainda não está disponível."}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Pedir um novo link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-serif text-2xl font-semibold text-fg">Quase lá</h1>
      <p className="mt-1.5 text-sm text-muted">Toque no botão para entrar no App MVF neste dispositivo.</p>
      <form action={confirmMagicLink} className="mt-6">
        {params.kind === "token_hash" ? (
          <>
            <input type="hidden" name="token_hash" value={params.tokenHash} />
            <input type="hidden" name="type" value={params.type} />
          </>
        ) : (
          <input type="hidden" name="code" value={params.code} />
        )}
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <LogIn aria-hidden className="size-4" /> Entrar
        </button>
      </form>
      <p className="mt-4 text-xs text-muted">O link vale por tempo limitado e só pode ser usado uma vez.</p>
    </>
  );
}
