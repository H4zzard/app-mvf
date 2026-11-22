"use client";

import Link from "next/link";
import { ArrowRight, Database, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PENDING_INTEGRATION, contentMetrics, contentPendings } from "@/lib/admin/overview";
import { profileInfo, profilePermissions } from "@/lib/admin/roles";
import { AdminPageHeader } from "./admin-ui";
import { useAdmin } from "./admin-provider";

const METRICS = contentMetrics();
const PENDINGS = contentPendings();

const PERMISSION_LABEL: Record<string, string> = {
  "admin:access": "Entrar no painel",
  "integration:read": "Ver integração Kiwify",
  "community:moderate": "Moderar comunidade",
  "support:assign": "Atender suporte",
  "content:edit": "Editar conteúdo",
  "content:review": "Revisar e aprovar",
  "content:publish": "Publicar",
};

/** Visão geral: só números que existem nos arquivos do projeto. */
export function OverviewView() {
  const { state, pending } = useAdmin();
  const info = profileInfo(state.profile);
  return (
    <div>
      <AdminPageHeader title="Visão geral" description="Números tirados dos catálogos do projeto. Dados de alunas, vendas e acessos dependem do banco." />

      <section aria-labelledby="ov-conteudo">
        <h2 id="ov-conteudo" className="sr-only">
          Conteúdo cadastrado
        </h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="rounded-2xl border border-line bg-card p-4 shadow-card">
              <dt className="text-xs text-muted">{m.label}</dt>
              <dd className="mt-1 font-serif text-3xl font-semibold text-fg">{m.value}</dd>
              {m.hint ? <dd className="mt-0.5 text-[0.7rem] leading-tight text-subtle">{m.hint}</dd> : null}
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="p-5" aria-labelledby="ov-pend">
          <h2 id="ov-pend" className="flex items-center gap-2 font-semibold text-fg">
            <ListTodo aria-hidden className="size-5 text-brand" /> Pendências de conteúdo
          </h2>
          <p className="mt-1 text-xs text-muted">Calculadas pelos mesmos validadores do catálogo, dos produtos e da agenda.</p>
          <ul className="mt-3 divide-y divide-line">
            {PENDINGS.map((p) => (
              <li key={p.text} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <Badge tone="neutral">{p.area}</Badge>
                <span className="min-w-0 flex-1 text-sm text-fg">{p.text}</span>
                {p.href ? (
                  <Link href={p.href} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand hover:underline">
                    Abrir <ArrowRight aria-hidden className="size-4" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="p-5" aria-labelledby="ov-sessao">
            <h2 id="ov-sessao" className="font-semibold text-fg">
              Esta sessão
            </h2>
            <p className="mt-1 text-sm text-muted">
              {pending ? `${pending} alteração(ões) pendente(s) em memória.` : "Nenhuma alteração ainda."} Recarregar a página descarta tudo.
            </p>
            {pending ? (
              <Link href="/gestao/alteracoes" className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand hover:underline">
                Revisar e exportar <ArrowRight aria-hidden className="size-4" />
              </Link>
            ) : null}
            {state.log.length ? (
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
                {state.log.slice(0, 5).map((l) => (
                  <li key={l.seq}>{l.text}</li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card className="p-5" aria-labelledby="ov-perfil">
            <h2 id="ov-perfil" className="font-semibold text-fg">
              Perfil simulado: {info.label}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {info.role ? `Papel existente no app: “${info.role}”.` : "Papel futuro: ainda não existe no banco (exige migration e decisão)."} Permissões
              simuladas, não são segurança real.
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {profilePermissions(state.profile).map((p) => (
                <li key={p}>
                  <Badge tone="brand">{PERMISSION_LABEL[p] ?? p}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5" aria-labelledby="ov-banco">
            <h2 id="ov-banco" className="flex items-center gap-2 font-semibold text-fg">
              <Database aria-hidden className="size-5 text-brand" /> Dependem do banco
            </h2>
            <ul className="mt-2 space-y-1.5">
              {PENDING_INTEGRATION.map((l) => (
                <li key={l} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-fg">{l}</span>
                  <Badge tone="soon">Aguardando integração</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
