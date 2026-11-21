import { PlugZap, ShieldCheck, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Minhas Vendas: estado vazio honesto. Não há conexão com fonte de vendas,
 * então nenhuma receita, comissão ou resultado é exibido (nem fictício).
 */
export function SalesView() {
  return (
    <div className="space-y-5">
      <PageHeader title="Minhas Vendas" description="Acompanhe vendas e comissões a partir de fontes verificáveis." />
      <Card className="p-6 text-center sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blush text-brand">
          <Wallet aria-hidden className="size-6" />
        </span>
        <h2 className="mt-4 font-serif text-xl font-semibold text-fg">A conexão de vendas ainda não existe</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Quando houver uma fonte verificável conectada, suas vendas e comissões aparecem aqui. Até lá, não mostramos números,
          nem de exemplo.
        </p>
        <ButtonLink href="/meu-plano" className="mt-5">
          Continuar meu plano
        </ButtonLink>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex items-start gap-3 p-4">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-sm text-muted">
            <strong className="font-semibold text-fg">Verificado × autodeclarado.</strong> Os valores serão sempre identificados pela
            origem.
          </p>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <PlugZap aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-sm text-muted">
            <strong className="font-semibold text-fg">Sem promessas.</strong> O app acompanha o seu caminho; resultados dependem de
            muitos fatores.
          </p>
        </Card>
      </div>
    </div>
  );
}
