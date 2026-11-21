import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { PublicShell } from "@/components/auth/public-shell";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { readConfig } from "@/lib/config/env";
import { signOutAction } from "@/app/auth-actions";

export const metadata: Metadata = { title: "Acesso indisponível" };

/**
 * Conta autenticada sem direito ativo (não localizada, reembolsada, estornada…).
 * Não exibe detalhes de pedidos nem de outras compradoras.
 */
export default function AccessUnavailablePage() {
  return (
    <PublicShell>
      <span className="grid size-12 place-items-center rounded-full bg-blush text-brand">
        <CircleAlert aria-hidden className="size-5" />
      </span>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-fg">Não encontramos um acesso ativo</h1>
      <p className="mt-2 text-sm text-muted">
        Sua conta não tem, neste momento, uma compra ativa do MVF vinculada. Isso pode acontecer se a compra foi feita
        com outro e-mail, se ainda está sendo confirmada, ou se foi reembolsada ou cancelada.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-muted">
        <li>• Tente entrar com o e-mail exato usado na compra.</li>
        <li>• Compras recentes podem levar alguns minutos para serem confirmadas.</li>
        <li>• Se o problema continuar, fale com o suporte do MVF informando o e-mail da compra.</li>
      </ul>
      <Suspense fallback={null}>
        <Actions />
      </Suspense>
    </PublicShell>
  );
}

async function Actions() {
  const viewer = await getViewer();
  const support = readConfig().supportContactUrl;
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {viewer.kind === "member" || viewer.kind === "demo" ? (
        <Link href="/inicio" className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">
          Ir para o Início
        </Link>
      ) : null}
      {support ? (
        <a
          href={support}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-semibold text-fg hover:bg-blush"
        >
          Falar com o suporte
        </a>
      ) : null}
      {viewer.kind === "denied" ? (
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Entrar com outro e-mail
          </Button>
        </form>
      ) : (
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">
          Voltar ao login
        </Link>
      )}
    </div>
  );
}
