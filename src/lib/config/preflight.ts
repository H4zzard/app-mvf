/**
 * Preflight de configuração (Prompt 04). Módulo PURO e testável.
 *
 * Regras:
 * - Nunca devolve nem imprime VALORES de variáveis: só nomes, presença e formato.
 * - Não faz chamadas de rede (as checagens remotas ficam em scripts/preflight.ts
 *   e usam os avaliadores abaixo sobre as respostas).
 * - Severidade: "error" bloqueia o ambiente; "warn" precisa de atenção; "ok" informativo.
 */

export type PreflightTarget = "development" | "homologacao" | "producao";
export type Level = "ok" | "warn" | "error";

export interface Finding {
  level: Level;
  key: string;
  message: string;
}

type Env = Record<string, string | undefined>;

const val = (env: Env, k: string) => {
  const v = env[k];
  return v && v.trim() ? v.trim() : null;
};

/** Papel declarado num JWT legado do Supabase (anon/service_role), sem validar assinatura. */
export function jwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !token.startsWith("eyJ")) return null;
  try {
    const json = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

type KeyKind = "publishable" | "secret" | "legacy_anon" | "legacy_service_role" | "unknown";

export function classifySupabaseKey(key: string): KeyKind {
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";
  const role = jwtRole(key);
  if (role === "anon") return "legacy_anon";
  if (role === "service_role") return "legacy_service_role";
  return "unknown";
}

const isElevated = (k: KeyKind) => k === "secret" || k === "legacy_service_role";

export const SECRET_ENV_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "KIWIFY_CLIENT_SECRET",
  "KIWIFY_WEBHOOK_TOKEN",
  "KIWIFY_WEBHOOK_TOKEN_PREVIOUS",
] as const;

export function checkEnv(env: Env, target: PreflightTarget): Finding[] {
  const out: Finding[] = [];
  const add = (level: Level, key: string, message: string) => out.push({ level, key, message });
  const remote = target !== "development";

  // --- Nada sensível em NEXT_PUBLIC_* (vai para o bundle do navegador) ---
  for (const [k, raw] of Object.entries(env)) {
    if (!k.startsWith("NEXT_PUBLIC_") || !raw) continue;
    const v = raw.trim();
    if (/SECRET|SERVICE|TOKEN|PASSWORD|PRIVATE/i.test(k)) {
      add("error", k, "Nome sugere segredo numa variável NEXT_PUBLIC_ (exposta no navegador). Remova.");
    } else if (isElevated(classifySupabaseKey(v))) {
      add("error", k, "Contém uma chave ELEVADA do Supabase numa variável pública. Remova e gere outra chave.");
    }
  }

  // --- Supabase ---
  const url = val(env, "NEXT_PUBLIC_SUPABASE_URL");
  if (!url) add(remote ? "error" : "warn", "NEXT_PUBLIC_SUPABASE_URL", "Ausente: área privada fica FECHADA (falha fechada).");
  else {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && !(target === "development" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname))) {
        add("error", "NEXT_PUBLIC_SUPABASE_URL", "Precisa ser https.");
      } else if (u.pathname !== "/" && u.pathname !== "") {
        add("error", "NEXT_PUBLIC_SUPABASE_URL", "Use só a origem do projeto, sem caminho.");
      } else if (url.includes("SEU-PROJETO")) {
        add("error", "NEXT_PUBLIC_SUPABASE_URL", "Ainda é o valor de exemplo.");
      } else {
        add("ok", "NEXT_PUBLIC_SUPABASE_URL", u.hostname.endsWith(".supabase.co") ? "Formato OK." : "Formato OK (domínio próprio).");
      }
    } catch {
      add("error", "NEXT_PUBLIC_SUPABASE_URL", "Não é uma URL válida.");
    }
  }

  const pub = val(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const pubKind = pub ? classifySupabaseKey(pub) : null;
  if (!pub) add(remote ? "error" : "warn", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Ausente.");
  else if (pubKind && isElevated(pubKind)) {
    add("error", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "É uma chave ELEVADA (secret/service_role). Troque pela publicável e gere nova chave secreta.");
  } else if (pubKind === "unknown") {
    add("warn", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Formato não reconhecido (esperado sb_publishable_… ou anon legada).");
  } else {
    add("ok", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", pubKind === "legacy_anon" ? "Chave anon legada (Supabase prevê descontinuar; prefira sb_publishable_)." : "Formato OK.");
  }

  const svc = val(env, "SUPABASE_SERVICE_ROLE_KEY");
  if (!svc) {
    add(remote ? "error" : "warn", "SUPABASE_SERVICE_ROLE_KEY", "Ausente: webhook responde 503 e as CLIs não gravam.");
  } else {
    const k = classifySupabaseKey(svc);
    if (pub && svc === pub) add("error", "SUPABASE_SERVICE_ROLE_KEY", "Igual à chave publicável.");
    else if (!isElevated(k)) add("error", "SUPABASE_SERVICE_ROLE_KEY", "Não parece uma chave secreta (sb_secret_… ou service_role legada).");
    else add("ok", "SUPABASE_SERVICE_ROLE_KEY", "Presente, formato OK (valor não exibido).");
  }

  // --- URL pública do app (links mágicos) ---
  const base = val(env, "APP_BASE_URL");
  if (!base) add(remote ? "error" : "warn", "APP_BASE_URL", remote ? "Ausente: os links apontariam para localhost." : "Ausente (padrão http://localhost:3000).");
  else {
    try {
      const u = new URL(base);
      const local = /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
      if (remote && (u.protocol !== "https:" || local)) add("error", "APP_BASE_URL", "Em homologação/produção precisa ser https e público.");
      else if (u.pathname !== "/" && u.pathname !== "") add("error", "APP_BASE_URL", "Use só a origem, sem caminho.");
      else add("ok", "APP_BASE_URL", `OK · callback esperado: ${u.origin}/auth/confirm`);
    } catch {
      add("error", "APP_BASE_URL", "Não é uma URL válida.");
    }
  }

  // --- Modo demo ---
  if (val(env, "MVF_DEMO_MODE") === "true") {
    add(remote ? "error" : "ok", "MVF_DEMO_MODE", remote ? "Deve ser false/vazio fora do desenvolvimento (já é ignorado, mas não deixe ligado)." : "Demo local ligado (somente npm run dev).");
  }

  // --- Painel administrativo demonstrativo (/gestao) ---
  if (val(env, "MVF_ADMIN_DEMO") === "true") {
    add(remote ? "error" : "ok", "MVF_ADMIN_DEMO", remote ? "Nunca ligue fora do desenvolvimento (o painel já é negado no servidor, mas não deixe ligado)." : "Painel demonstrativo local ligado (somente npm run dev com MVF_DEMO_MODE=true).");
  }

  // --- Suporte ---
  const support = val(env, "MVF_SUPPORT_CONTACT_URL");
  if (support && !/^https:\/\//.test(support)) add("warn", "MVF_SUPPORT_CONTACT_URL", "Use um link https.");
  if (!support && remote) add("warn", "MVF_SUPPORT_CONTACT_URL", "Vazio: a tela “Acesso indisponível” fica sem contato de suporte.");

  // --- Prévia de módulos (dados de exemplo para contas reais) ---
  const preview = val(env, "MVF_PREVIEW_MODULES");
  if (preview) {
    const all = preview.toLowerCase() === "all";
    const count = preview.split(",").filter((e) => e.includes("@")).length;
    add(
      target === "producao" && all ? "warn" : "ok",
      "MVF_PREVIEW_MODULES",
      all ? "Prévia ligada para TODAS as alunas (telas com dados de exemplo rotulados)." : `Prévia ligada para ${count} conta(s) (e-mails não exibidos).`,
    );
  }

  // --- Kiwify ---
  const creds = ["KIWIFY_ACCOUNT_ID", "KIWIFY_CLIENT_ID", "KIWIFY_CLIENT_SECRET"].map((k) => [k, val(env, k)] as const);
  const present = creds.filter(([, v]) => v).length;
  if (present > 0 && present < 3) {
    add("error", "KIWIFY_*", `Credenciais da API incompletas (faltam: ${creds.filter(([, v]) => !v).map(([k]) => k).join(", ")}).`);
  } else if (present === 0) {
    add(remote ? "warn" : "ok", "KIWIFY_*", "API não configurada: aprovações ficam pendentes (nunca concedidas por suposição).");
  } else add("ok", "KIWIFY_*", "Credenciais da API presentes (valores não exibidos).");

  const tok = val(env, "KIWIFY_WEBHOOK_TOKEN");
  const prev = val(env, "KIWIFY_WEBHOOK_TOKEN_PREVIOUS");
  if (!tok) add(remote ? "warn" : "ok", "KIWIFY_WEBHOOK_TOKEN", "Ausente: webhook responde 503 (nada é liberado).");
  else if (tok.length < 16) add("warn", "KIWIFY_WEBHOOK_TOKEN", "Curto demais (< 16 caracteres). Gere um token longo na Kiwify.");
  else add("ok", "KIWIFY_WEBHOOK_TOKEN", "Presente (valor não exibido).");
  if (prev && tok && prev === tok) add("warn", "KIWIFY_WEBHOOK_TOKEN_PREVIOUS", "Igual ao atual: limpe após a rotação.");
  if (prev && !tok) add("error", "KIWIFY_WEBHOOK_TOKEN_PREVIOUS", "Há token anterior sem token atual.");

  const products = (val(env, "KIWIFY_ALLOWED_PRODUCT_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (products.length === 0) add(remote ? "warn" : "ok", "KIWIFY_ALLOWED_PRODUCT_IDS", "Vazio: nenhuma compra libera acesso (falha fechada).");
  else if (products.some((p) => !/^[A-Za-z0-9_-]{1,100}$/.test(p))) add("error", "KIWIFY_ALLOWED_PRODUCT_IDS", "Há ID com caracteres inválidos.");
  else add("ok", "KIWIFY_ALLOWED_PRODUCT_IDS", `${products.length} produto(s) permitido(s).`);

  return out;
}

/* ---------------- Avaliadores das checagens remotas (somente leitura) ---------------- */

/** GET /auth/v1/settings (público): cadastro aberto é ERRO; e-mail precisa estar habilitado. */
export function evaluateAuthSettings(json: unknown): Finding[] {
  const s = (json ?? {}) as { disable_signup?: unknown; external?: { email?: unknown } };
  const out: Finding[] = [];
  out.push(
    s.disable_signup === true
      ? { level: "ok", key: "auth.disable_signup", message: "Cadastro público desativado." }
      : { level: "error", key: "auth.disable_signup", message: "Cadastro público ATIVO. Desative “Allow new users to sign up”." },
  );
  out.push(
    s.external?.email === true
      ? { level: "ok", key: "auth.email", message: "Provedor de e-mail habilitado." }
      : { level: "error", key: "auth.email", message: "Provedor de e-mail desabilitado: o link mágico não funciona." },
  );
  return out;
}

/**
 * Leitura anônima (chave publicável, sem sessão) de uma tabela via REST.
 * Esperado: recusa (401/403) ou lista vazia. Linhas visíveis = vazamento.
 */
export function evaluateAnonRead(table: string, status: number, body: unknown): Finding {
  const key = `rls.anon.${table}`;
  const code = (body as { code?: unknown } | null)?.code;
  if (status === 404 || code === "PGRST205" || code === "42P01") {
    return { level: "error", key, message: "Tabela não encontrada: migration não aplicada neste projeto." };
  }
  if (status === 401 || status === 403 || code === "42501") return { level: "ok", key, message: "Anônimo recusado." };
  if (status === 200 && Array.isArray(body)) {
    return body.length === 0
      ? { level: "ok", key, message: "Anônimo não vê linhas." }
      : { level: "error", key, message: `Anônimo VÊ ${body.length} linha(s). Revise RLS/grants antes de qualquer piloto.` };
  }
  return { level: "warn", key, message: `Resposta inesperada (HTTP ${status}). Verificar manualmente.` };
}

export const PRIVATE_TABLES = [
  "profiles",
  "user_roles",
  "purchase_entitlements",
  "webhook_events",
  "onboarding_submissions",
  "user_plan_snapshots",
  "user_task_progress",
  "import_runs",
  "admin_audit_log",
] as const;

export function summarize(findings: Finding[]): { errors: number; warnings: number } {
  return {
    errors: findings.filter((f) => f.level === "error").length,
    warnings: findings.filter((f) => f.level === "warn").length,
  };
}
