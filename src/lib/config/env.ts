/**
 * Leitura central da configuração de ambiente (somente servidor).
 *
 * Modos de autenticação:
 *  - "supabase": Supabase configurado → autenticação e dados reais.
 *  - "demo": SOMENTE com NODE_ENV=development E MVF_DEMO_MODE=true. Dados em
 *    memória, marcação visível, nada gravado. Ignorado em produção.
 *  - "unconfigured": falta configuração → área privada FECHADA (nunca abre por falha).
 * Módulo puro (recebe `env`), testável.
 */
import { parseIdList } from "../kiwify/rules.ts";

export type AuthMode = "supabase" | "demo" | "unconfigured";

export interface AppConfig {
  authMode: AuthMode;
  /** true quando MVF_DEMO_MODE=true foi pedido fora de development (ignorado). */
  demoFlagIgnored: boolean;
  /**
   * Painel administrativo DEMONSTRATIVO (/gestao). Só com as TRÊS condições:
   * NODE_ENV=development + MVF_DEMO_MODE=true + MVF_ADMIN_DEMO=true. Em produção,
   * homologação ou modo Supabase é sempre false (nada de chave na URL nem login fictício).
   */
  adminDemo: boolean;
  supabase: { url: string; publishableKey: string } | null;
  serviceRoleKey: string | null;
  appBaseUrl: string;
  supportContactUrl: string | null;
  /**
   * Prévia dos módulos (dados de EXEMPLO, sempre rotulados) para contas reais.
   * `MVF_PREVIEW_MODULES`: vazio = ninguém; "all" = todas as alunas; ou lista de e-mails.
   * Não dá acesso a nada: só troca o “Em breve” pela tela de demonstração.
   */
  modulesPreview: { all: boolean; emails: string[] };
  kiwify: {
    webhookTokens: string[];
    allowedProductIds: string[];
    api: { clientId: string; clientSecret: string; accountId: string } | null;
  };
}

type Env = Record<string, string | undefined>;

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export function readConfig(env: Env = process.env): AppConfig {
  const isDev = env.NODE_ENV === "development";
  const demoRequested = env.MVF_DEMO_MODE === "true";
  const url = clean(env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = clean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const supabase = url && publishableKey ? { url, publishableKey } : null;

  const clientId = clean(env.KIWIFY_CLIENT_ID);
  const clientSecret = clean(env.KIWIFY_CLIENT_SECRET);
  const accountId = clean(env.KIWIFY_ACCOUNT_ID);

  return {
    authMode: isDev && demoRequested ? "demo" : supabase ? "supabase" : "unconfigured",
    demoFlagIgnored: demoRequested && !isDev,
    adminDemo: isDev && demoRequested && env.MVF_ADMIN_DEMO === "true",
    supabase,
    serviceRoleKey: clean(env.SUPABASE_SERVICE_ROLE_KEY),
    appBaseUrl: (clean(env.APP_BASE_URL) ?? "http://localhost:3000").replace(/\/$/, ""),
    supportContactUrl: clean(env.MVF_SUPPORT_CONTACT_URL),
    modulesPreview: parsePreview(env.MVF_PREVIEW_MODULES),
    kiwify: {
      webhookTokens: [clean(env.KIWIFY_WEBHOOK_TOKEN), clean(env.KIWIFY_WEBHOOK_TOKEN_PREVIOUS)].filter(
        (t): t is string => t !== null,
      ),
      allowedProductIds: parseIdList(env.KIWIFY_ALLOWED_PRODUCT_IDS),
      api: clientId && clientSecret && accountId ? { clientId, clientSecret, accountId } : null,
    },
  };
}

function parsePreview(raw: string | undefined): AppConfig["modulesPreview"] {
  const v = clean(raw);
  if (!v) return { all: false, emails: [] };
  if (v.toLowerCase() === "all") return { all: true, emails: [] };
  const emails = v
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  return { all: false, emails };
}

/** A conta (e-mail do JWT) pode ver a prévia dos módulos? */
export function canPreviewModules(config: Pick<AppConfig, "modulesPreview">, email: string | null | undefined): boolean {
  if (config.modulesPreview.all) return true;
  const e = (email ?? "").trim().toLowerCase();
  return e !== "" && config.modulesPreview.emails.includes(e);
}
