import { Suspense } from "react";
import { getViewer } from "@/lib/auth/viewer";
import { canPreviewModules, readConfig } from "@/lib/config/env";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import PageLoading from "@/app/(app)/loading";

/**
 * Mostra o módulo de DEMONSTRAÇÃO no modo demo local ou, para contas reais,
 * só com prévia autorizada em MVF_PREVIEW_MODULES (decidido NO SERVIDOR).
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
  // Prévia autorizada no servidor (MVF_PREVIEW_MODULES) para contas reais com acesso ativo.
  if (viewer.kind === "member" && canPreviewModules(readConfig(), viewer.email)) return <>{children}</>;
  return <FeaturePlaceholder featureId={featureId} />;
}
