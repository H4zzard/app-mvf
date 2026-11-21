import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl place-items-center px-4">
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        description="O endereço acessado não existe ou mudou de lugar."
        action={<ButtonLink href="/inicio">Ir para o Início</ButtonLink>}
        className="w-full bg-card"
      />
    </main>
  );
}
