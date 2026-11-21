/**
 * Preflight de configuração (Prompt 04).
 *
 *   npm run preflight                                  # alvo development, só checagens locais
 *   npm run preflight -- --target homologacao          # regras de homologação
 *   npm run preflight -- --target homologacao --remote # + checagens remotas SOMENTE LEITURA
 *   node --env-file=.env.homolog scripts/preflight.ts --target homologacao --remote
 *
 * Nunca imprime valores de variáveis, tokens ou dados pessoais.
 * O modo --remote só faz leituras: configurações públicas do Auth, leitura anônima
 * das tabelas (deve ser recusada), contagem com a chave secreta, emissão de token
 * OAuth da Kiwify (sem consultar vendas) e respostas do próprio app publicado.
 * Não cria usuárias, não envia e-mails, não grava nada, não consulta compras.
 */
import { parseArgs } from "node:util";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  PRIVATE_TABLES,
  checkEnv,
  classifySupabaseKey,
  evaluateAnonRead,
  evaluateAuthSettings,
  summarize,
  type Finding,
  type PreflightTarget,
} from "../src/lib/config/preflight.ts";

const { values } = parseArgs({
  options: {
    target: { type: "string", default: "development" },
    remote: { type: "boolean", default: false },
  },
});

const target = values.target as PreflightTarget;
if (!["development", "homologacao", "producao"].includes(target)) {
  console.error("✖ --target deve ser development, homologacao ou producao.");
  process.exit(2);
}

const env = process.env;
const findings: Finding[] = checkEnv(env, target);

// --- Segredos fora do Git ---
const gitignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : "";
if (!/^\.env\*$/m.test(gitignore)) findings.push({ level: "error", key: ".gitignore", message: "Não ignora .env* (segredos podem ir para o Git)." });
else findings.push({ level: "ok", key: ".gitignore", message: "Ignora .env* (exceto .env.example)." });
const envFiles = readdirSync(".").filter((f) => f.startsWith(".env") && f !== ".env.example");
if (envFiles.length) findings.push({ level: "ok", key: "arquivos .env", message: `Locais e ignorados pelo Git: ${envFiles.join(", ")}.` });

const timeout = () => AbortSignal.timeout(10_000);

async function remoteChecks() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const svc = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const keyHeaders = (key: string): Record<string, string> =>
    classifySupabaseKey(key).startsWith("legacy") ? { apikey: key, authorization: `Bearer ${key}` } : { apikey: key };

  if (url && pub) {
    try {
      const r = await fetch(`${url}/auth/v1/settings`, { headers: keyHeaders(pub), signal: timeout() });
      if (r.ok) findings.push(...evaluateAuthSettings(await r.json()));
      else findings.push({ level: "error", key: "auth.settings", message: `HTTP ${r.status}: confira URL e chave publicável.` });
    } catch {
      findings.push({ level: "error", key: "auth.settings", message: "Supabase inacessível." });
    }
    for (const t of PRIVATE_TABLES) {
      try {
        const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: keyHeaders(pub), signal: timeout() });
        let body: unknown = null;
        try {
          body = await r.json();
        } catch {
          body = null;
        }
        findings.push(evaluateAnonRead(t, r.status, body));
      } catch {
        findings.push({ level: "warn", key: `rls.anon.${t}`, message: "Falha de rede." });
      }
    }
  }

  if (url && svc) {
    try {
      const r = await fetch(`${url}/rest/v1/purchase_entitlements?select=order_id&limit=1`, {
        headers: { ...keyHeaders(svc), prefer: "count=exact" },
        signal: timeout(),
      });
      const total = r.headers.get("content-range")?.split("/")[1];
      findings.push(
        r.ok
          ? { level: "ok", key: "service_role", message: `Chave secreta aceita; migration presente (${total ?? "?"} direito(s) registrados).` }
          : { level: "error", key: "service_role", message: `HTTP ${r.status}: chave secreta recusada ou migration ausente.` },
      );
    } catch {
      findings.push({ level: "error", key: "service_role", message: "Falha de rede." });
    }
  }

  const k = { id: env.KIWIFY_CLIENT_ID?.trim(), secret: env.KIWIFY_CLIENT_SECRET?.trim(), account: env.KIWIFY_ACCOUNT_ID?.trim() };
  if (k.id && k.secret && k.account) {
    try {
      const r = await fetch("https://public-api.kiwify.com/v1/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: k.id, client_secret: k.secret }).toString(),
        signal: timeout(),
      });
      if (r.ok) {
        const j = (await r.json()) as { access_token?: unknown; scope?: unknown; expires_in?: unknown };
        const scopes = typeof j.scope === "string" ? j.scope : "não informado";
        findings.push({
          level: j.access_token ? "ok" : "error",
          key: "kiwify.oauth",
          message: j.access_token ? `Token emitido (não exibido) · expires_in=${String(j.expires_in)} · escopos: ${scopes}` : "Resposta sem access_token.",
        });
        if (typeof j.scope === "string" && !j.scope.split(/\s+/).includes("sales")) {
          findings.push({ level: "error", key: "kiwify.scope", message: "Credencial sem escopo “sales”: a confirmação de vendas não funcionará." });
        }
      } else findings.push({ level: "error", key: "kiwify.oauth", message: `HTTP ${r.status}: credenciais recusadas (não cole no chat; gere/reveja no painel).` });
    } catch {
      findings.push({ level: "error", key: "kiwify.oauth", message: "Kiwify inacessível." });
    }
  }

  const base = env.APP_BASE_URL?.trim();
  if (base && target !== "development") {
    const app = async (path: string, init?: RequestInit) => fetch(new URL(path, base), { redirect: "manual", signal: timeout(), ...init });
    try {
      const login = await app("/login");
      findings.push({ level: login.status === 200 ? "ok" : "error", key: "app./login", message: `HTTP ${login.status}` });
      const priv = await app("/inicio");
      const loc = priv.headers.get("location") ?? "";
      findings.push({
        level: priv.status >= 300 && priv.status < 400 && loc.includes("/login") ? "ok" : "error",
        key: "app./inicio sem sessão",
        message: `HTTP ${priv.status} → ${loc.includes("/login") ? "/login" : "outro destino"}`,
      });
      const wh = await app("/api/webhooks/kiwify", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      findings.push({
        level: wh.status === 401 ? "ok" : wh.status === 503 ? "warn" : "error",
        key: "app.webhook sem assinatura",
        message: wh.status === 401 ? "401 (recusado)" : wh.status === 503 ? "503 (token do webhook não configurado no deploy)" : `HTTP ${wh.status} inesperado`,
      });
      const health = await app("/api/admin/health");
      findings.push({ level: health.status === 401 ? "ok" : "error", key: "app.health sem sessão", message: `HTTP ${health.status}` });
    } catch {
      findings.push({ level: "error", key: "app", message: "APP_BASE_URL inacessível." });
    }
  }
}

if (values.remote) await remoteChecks();

const icon = { ok: "✔", warn: "!", error: "✖" } as const;
console.log(`Preflight · alvo: ${target}${values.remote ? " · com checagens remotas (somente leitura)" : " · somente local"}\n`);
for (const f of findings) console.log(`${icon[f.level]} ${f.key.padEnd(38)} ${f.message}`);
const { errors, warnings } = summarize(findings);
console.log(`\n${errors} erro(s), ${warnings} aviso(s).`);
if (!values.remote) console.log("Dica: depois de configurar, rode com --remote para conferir Auth, RLS anônima, chaves e Kiwify (somente leitura).");
process.exit(errors > 0 ? 1 : 0);
