import { LockKeyhole } from "lucide-react";
import { PublicShell } from "@/components/auth/public-shell";

/**
 * Exibido quando falta configuração de autenticação/banco. A área privada
 * permanece FECHADA. Não revela detalhes de infraestrutura ao público.
 */
export function ConfigPendingScreen() {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <PublicShell>
      <span className="grid size-12 place-items-center rounded-full bg-blush text-brand">
        <LockKeyhole aria-hidden className="size-5" />
      </span>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-fg">Plataforma em configuração</h1>
      <p className="mt-2 text-sm text-muted">
        O acesso das alunas ainda não foi liberado. Volte em breve — avisaremos pelos canais oficiais do MVF.
      </p>
      {isDev ? (
        <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-canvas p-4 text-xs text-muted">
          <p className="font-semibold text-fg">Desenvolvimento</p>
          <p className="mt-1">
            Configure o Supabase em <code>.env.local</code> (ver <code>.env.example</code> e <code>docs/AUTH_E_ACESSO.md</code>) ou,
            só para testar layout e motor, use <code>MVF_DEMO_MODE=true</code> com <code>npm run dev</code>.
          </p>
        </div>
      ) : null}
    </PublicShell>
  );
}
