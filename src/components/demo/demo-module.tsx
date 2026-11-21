import { Suspense } from "react";
import { getViewer } from "@/lib/auth/viewer";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import PageLoading from "@/app/(app)/loading";

/**
 * Mostra o módulo de DEMONSTRAÇÃO só no modo demo local (decidido NO SERVIDOR).
 * Para alunas reais, o módulo ainda não tem dados: aparece o “Em breve” honesto.
 * Assim nenhum dado mock é renderizado nem enviado em produção.
 */
export function DemoModule({ featureId, children }: { featureId: string; children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Gate featureId={featureId}>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ featureId, children }: { featureId: string; children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer.kind === "demo") return <>{children}</>;
  return <FeaturePlaceholder featureId={featureId} />;
}
