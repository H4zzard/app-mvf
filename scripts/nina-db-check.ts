/**
 * Nina — qual projeto Supabase cada ambiente usa, e (opcional) estado do banco. SOMENTE LEITURA.
 *
 *   npm run nina:db-check -- --compare .env.local .env.homolog [--expect-ref <ref de produção>]
 *       Só local: lê as variáveis dos arquivos e diz se apontam para o MESMO projeto.
 *       Nunca imprime chaves; o ref aparece mascarado.
 *
 *   node --env-file=<arquivo> scripts/nina-db-check.ts --remote [--expect-ref <ref>]
 *       Leituras via API (service role): colunas/funções do suporte, base de conhecimento
 *       (contagens e ids) e atendimentos (só contagem). Não grava nada. Requer autorização
 *       do operador (é uma consulta ao banco remoto).
 *
 * Para políticas, permissões e migrations registradas, use o SELECT único de
 * supabase/checks/nina_estado_somente_leitura.sql no SQL Editor.
 */
import { readFileSync } from "node:fs";
import { identify, maskRef, parseEnvFile, projectRefFromUrl, type ProjectIdentity } from "../src/lib/config/supabase-project.ts";

const args = process.argv.slice(2);
const expect = args.includes("--expect-ref") ? args[args.indexOf("--expect-ref") + 1] : null;
const KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

const show = (p: ProjectIdentity) => {
  const key = p.serviceKeyMatches === "unknown" ? "chave secreta: formato novo (não traz o ref; confira no painel)" : p.serviceKeyMatches ? "chave secreta é do mesmo projeto" : "✖ CHAVE SECRETA DE OUTRO PROJETO";
  const exp = expect ? (p.ref === expect ? " · ✔ é o projeto esperado" : " · ✖ NÃO é o projeto esperado") : "";
  console.log(`  ${p.label.padEnd(16)} projeto ${maskRef(p.ref)}${exp} · ${key}`);
};

if (args.includes("--compare")) {
  const files = args.slice(args.indexOf("--compare") + 1).filter((a) => !a.startsWith("--") && a !== expect);
  if (files.length < 1) {
    console.error("Uso: --compare <arquivo.env> [<arquivo.env> …]");
    process.exit(2);
  }
  console.log("Projetos Supabase por arquivo (somente local, sem rede):");
  const ids = files.map((f) => {
    let text = "";
    try {
      text = readFileSync(f, "utf8");
    } catch {
      console.log(`  ${f.padEnd(16)} (arquivo não encontrado)`);
      return null;
    }
    const p = identify(f, parseEnvFile(text, KEYS));
    show(p);
    return p;
  }).filter((p): p is ProjectIdentity => p !== null && p.ref !== null);
  const refs = new Set(ids.map((p) => p.ref));
  if (ids.length >= 2) console.log(refs.size === 1 ? "\n→ TODOS apontam para o MESMO projeto Supabase. Não há banco separado entre eles." : `\n→ ${refs.size} projetos diferentes.`);
  console.log("Produção: compare com o ref da Vercel (Settings → Environment Variables → NEXT_PUBLIC_SUPABASE_URL, ambiente Production) ou passe --expect-ref.");
  process.exit(0);
}

if (!args.includes("--remote")) {
  console.error("Use --compare <arquivos> (local) ou --remote (leitura no banco do .env carregado).");
  process.exit(2);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("✖ Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (rode com node --env-file=<arquivo>).");
  process.exit(1);
}
show(identify("ambiente", { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key }));
if (expect && projectRefFromUrl(url) !== expect) {
  console.error("✖ Interrompido: o .env carregado não é do projeto esperado.");
  process.exit(1);
}
const h: Record<string, string> = key.startsWith("sb_") ? { apikey: key } : { apikey: key, authorization: `Bearer ${key}` };
// Só GET. Nenhum POST/PATCH/DELETE neste script.
const get = async (path: string) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { method: "GET", headers: { ...h, prefer: "count=exact" }, signal: AbortSignal.timeout(10_000) });
  const total = r.headers.get("content-range")?.split("/")[1] ?? null;
  return { ok: r.ok, status: r.status, total, body: r.ok ? ((await r.json()) as Record<string, unknown>[]) : null };
};
const line = (item: string, value: string) => console.log(`  ${item.padEnd(52)} ${value}`);

console.log("\nEstado do banco (somente leitura):");
const tables = await get("support_conversations?select=id&limit=0");
line("tabelas do suporte (20261126120000)", tables.ok ? "presentes" : `ausentes (HTTP ${tables.status})`);
if (tables.ok) {
  const comp = (await get("support_conversations?select=close_reason&limit=0")).ok && (await get("support_messages?select=actions&limit=0")).ok;
  line("complemento 20261127120000 (colunas)", comp ? "APLICADO" : "PENDENTE");
  for (const s of ["open", "closing", "closed"]) line(`atendimentos ${s} (contagem)`, (await get(`support_conversations?select=id&status=eq.${s}&limit=0`)).total ?? "?");
  const docs = await get("support_knowledge_documents?select=id,type,status");
  if (docs.body) {
    const by = new Map<string, number>();
    for (const d of docs.body) by.set(`${d.type}/${d.status}`, (by.get(`${d.type}/${d.status}`) ?? 0) + 1);
    line("documentos na base", `${docs.body.length} · ${[...by].map(([k, n]) => `${k}=${n}`).join(", ")}`);
  }
  line("trechos na base", (await get("support_knowledge_chunks?select=id&limit=0")).total ?? "?");
  const stale = await get("support_knowledge_chunks?select=document_id&or=(content.ilike.*baixar a conversa*,content.ilike.*baixar a transcri*,content.ilike.*download*)");
  line("docs que ainda falam em baixar a conversa", stale.body ? [...new Set(stale.body.map((r) => String(r.document_id)))].join(", ") || "nenhum" : "?");
}
console.log("\nPolíticas, permissões e histórico privado: rode supabase/checks/nina_estado_somente_leitura.sql no SQL Editor.");
