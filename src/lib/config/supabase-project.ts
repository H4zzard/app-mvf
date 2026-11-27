/**
 * Identificação do projeto Supabase a partir das variáveis — sem imprimir chaves.
 * Puro (sem rede); usado por scripts/nina-db-check.ts e testado.
 *
 * O “project ref” aparece na URL pública (https://<ref>.supabase.co) e não é segredo, mas
 * mesmo assim só mostramos uma versão mascarada. Chaves nunca são exibidas: no máximo
 * dizemos o tipo e se o ref embutido (chaves JWT antigas) confere com a URL.
 */

export function projectRefFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url.trim()).host;
    const m = host.match(/^([a-z0-9]{15,30})\.supabase\.(co|in|net)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Ref embutido numa chave JWT antiga (anon/service_role). Chaves novas (sb_…) não trazem o ref. */
export function projectRefFromKey(key: string | undefined | null): string | null {
  if (!key || key.startsWith("sb_")) return null;
  const parts = key.trim().split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { ref?: unknown };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

/** “abcd…wxyz”: suficiente para comparar com o painel, sem copiar o valor inteiro para logs. */
export const maskRef = (ref: string | null) => (ref ? `${ref.slice(0, 4)}…${ref.slice(-4)}` : "—");

/** Lê só as chaves pedidas de um arquivo .env (sem expandir, sem executar nada). */
export function parseEnvFile(text: string, keys: readonly string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || !keys.includes(m[1])) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2").trim();
  }
  return out;
}

export interface ProjectIdentity {
  label: string;
  ref: string | null;
  serviceKeyRef: string | null;
  serviceKeyMatches: boolean | "unknown";
}

export function identify(label: string, env: Record<string, string | undefined>): ProjectIdentity {
  const ref = projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKeyRef = projectRefFromKey(env.SUPABASE_SERVICE_ROLE_KEY);
  return { label, ref, serviceKeyRef, serviceKeyMatches: serviceKeyRef === null ? "unknown" : serviceKeyRef === ref };
}
