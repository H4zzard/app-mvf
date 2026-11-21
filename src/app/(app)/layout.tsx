import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider, type ClientViewer } from "@/components/layout/session-provider";
import { PlanProvider } from "@/components/plan/plan-provider";
import { DemoProvider } from "@/components/demo/demo-provider";
import { ConfigPendingScreen } from "@/components/auth/config-pending";
import { AppBootSkeleton } from "@/components/auth/boot-skeleton";
import { requirePrivateAccess } from "@/lib/auth/viewer";
import { loadStudentState } from "@/lib/data/student-repo";
import { primaryRole } from "@/lib/auth/permissions";
import { greetingName } from "@/lib/greeting";
import { canPreviewModules, readConfig } from "@/lib/config/env";

/**
 * Área privada. A sessão e o direito de acesso são verificados NO SERVIDOR
 * a cada carregamento (e novamente em cada Server Action e na RLS).
 * Sem configuração, a área fica FECHADA (nunca abre por falha).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppBootSkeleton />}>
      <PrivateApp>{children}</PrivateApp>
    </Suspense>
  );
}

async function PrivateApp({ children }: { children: React.ReactNode }) {
  const viewer = await requirePrivateAccess();

  if (viewer.kind === "unconfigured") return <ConfigPendingScreen />;

  if (viewer.kind === "demo") {
    return (
      <SessionProvider viewer={{ mode: "demo" }}>
        <PlanProvider persistence={{ kind: "memory" }}>
          <DemoProvider>
            <AppShell demo>{children}</AppShell>
          </DemoProvider>
        </PlanProvider>
      </SessionProvider>
    );
  }

  const state = await loadStudentState(viewer.userId);
  const name = viewer.displayName || state.profile?.preferredName || greetingName(null);
  const clientViewer: ClientViewer = {
    mode: "member",
    displayName: name,
    initials: initialsOf(name),
    role: primaryRole(viewer.roles),
    roles: viewer.roles,
    modulesPreview: canPreviewModules(readConfig(), viewer.email),
  };

  return (
    <SessionProvider viewer={clientViewer}>
      <PlanProvider persistence={{ kind: "server", initial: state }}>
        {clientViewer.modulesPreview ? (
          // Prévia: estado de exemplo dos módulos em memória; plano e progresso seguem no servidor.
          <DemoProvider>
            <AppShell>{children}</AppShell>
          </DemoProvider>
        ) : (
          <AppShell>{children}</AppShell>
        )}
      </PlanProvider>
    </SessionProvider>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "MV").slice(0, 2)).toUpperCase();
}
