"use client";

import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";

/** Estado de erro das telas internas. */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={TriangleAlert}
        title="Algo não saiu como esperado"
        description="Não foi possível carregar esta tela. Tente novamente; se continuar, volte ao Início."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => retry()}>Tentar novamente</Button>
            <ButtonLink href="/inicio" variant="secondary">
              Ir para o Início
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
