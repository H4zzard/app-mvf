import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AdminProvider } from "@/components/gestao/admin-provider";
import { AdminShell } from "@/components/gestao/admin-shell";
import { getViewer } from "@/lib/auth/viewer";
import { readConfig } from "@/lib/config/env";
import { adminDemoAllowed } from "@/lib/admin/access";

export const metadata: Metadata = {
  title: { default: "Gestão", template: "%s · Gestão" },
  robots: { index: false, follow: false },
};

/**
 * Painel administrativo DEMONSTRATIVO. Decisão NO SERVIDOR, a cada requisição:
 * só existe com NODE_ENV=development + MVF_DEMO_MODE=true + MVF_ADMIN_DEMO=true
 * (sessão de demo local). Em produção/homologação/Supabase: “não encontrada”.
 * O Proxy já responde 404 antes; esta checagem é a segunda defesa.
 */
export default function GestaoLayout({ children }: LayoutProps<"/gestao">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Carregando painel…</p>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer.kind !== "demo" || !adminDemoAllowed(readConfig())) notFound();
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
