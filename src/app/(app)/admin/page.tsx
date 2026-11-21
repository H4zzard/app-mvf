import type { Metadata } from "next";
import { Suspense } from "react";
import PageLoading from "@/app/(app)/loading";
import { Activity, ShieldAlert } from "lucide-react";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getViewer } from "@/lib/auth/viewer";
import { can } from "@/lib/auth/permissions";
import { loadIntegrationHealth } from "@/lib/admin/integration-health";

export const metadata: Metadata = { title: "Admin" };

/**
 * /admin protegido NO SERVIDOR por papel salvo no banco. A aluna comum recebe
 * 403 (tela de acesso negado), mesmo digitando a URL. O módulo completo de
 * gestão fica para o próximo prompt.
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  const viewer = await getViewer();

  if (viewer.kind === "demo") {
    return (
      <div className="space-y-6">
        <p className="mx-auto max-w-3xl rounded-xl border border-dashed border-line-strong bg-canvas p-3 text-sm text-muted">
          <DemoBadge label="Modo demo local" /> Nenhum dado real é exibido. Com o Supabase configurado, esta página exige papel
          de equipe salvo no banco.
        </p>
        <FeaturePlaceholder featureId="admin" />
      </div>
    );
  }

  if (viewer.kind !== "member" || !can(viewer.roles, "admin:access")) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito (403)"
          description="Esta área é exclusiva da equipe do MVF. Se você faz parte da equipe e precisa de acesso, peça a um administrador."
        />
      </div>
    );
  }

  const health = can(viewer.roles, "integration:read") ? await loadIntegrationHealth() : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">Gestão</p>
        <h1 className="font-serif text-3xl font-semibold text-fg">Admin</h1>
        <p className="mt-1 text-sm text-muted">
          Papéis: {viewer.roles.join(", ")}. O módulo completo de gestão será construído na próxima etapa.
        </p>
      </header>

      {health ? (
        <Card className="p-6">
          <CardHeader
            title="Saúde da integração Kiwify"
            description="Últimos 7 dias. Sem dados pessoais."
            action={<Activity aria-hidden className="size-5 text-brand" />}
          />
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Acessos ativos" value={health.activeEntitlements} />
            {["processed", "pending_verification", "failed", "ignored"].map((s) => (
              <Stat key={s} label={STATUS_LABEL[s]} value={health.eventsByStatus[s] ?? 0} />
            ))}
          </dl>
          <h2 className="mt-6 text-sm font-semibold text-fg">Eventos recentes</h2>
          {health.recentEvents.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhum webhook recebido ainda.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-subtle">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Recebido</th>
                    <th className="py-2 pr-3 font-medium">Evento</th>
                    <th className="py-2 pr-3 font-medium">Pedido</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Erro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {health.recentEvents.map((e, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3 text-muted">{new Date(e.receivedAt).toLocaleString("pt-BR")}</td>
                      <td className="py-2 pr-3">{e.eventType}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{e.order}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={e.status === "processed" ? "success" : e.status === "failed" ? "warning" : "neutral"}>
                          {STATUS_LABEL[e.status] ?? e.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted">{e.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h2 className="mt-6 text-sm font-semibold text-fg">Importações</h2>
          {health.imports.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhuma importação executada.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {health.imports.map((r, i) => (
                <li key={i}>
                  {new Date(r.startedAt).toLocaleString("pt-BR")} · {r.mode} · {r.status} · concedidas: {r.counts.concedidas ?? 0}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <p className="text-sm text-muted">Seu papel não inclui a leitura da integração, ou o servidor não está configurado.</p>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  processed: "Processados",
  pending_verification: "Pendentes",
  failed: "Com erro",
  ignored: "Ignorados",
  received: "Recebidos",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-serif text-2xl font-semibold text-fg">{value}</dd>
    </div>
  );
}
