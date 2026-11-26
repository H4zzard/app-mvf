/**
 * Pipeline da base de conhecimento do Assistente MVF (LOCAL, sem rede).
 *
 *   npm run support-kb -- check   <pasta>              # valida arquivos (.md .txt .vtt .srt)
 *   npm run support-kb -- preview <pasta>              # prévia: novos, versões, duplicados, trechos
 *   npm run support-kb -- sql     <pasta> --out x.sql   # gera SQL de importação (NÃO executa)
 *
 * A pasta deve ficar FORA do repositório (materiais do curso são privados).
 * O SQL gerado só é aplicado no banco depois de autorização explícita do
 * operador (docs/SUPORTE_IA.md). Só documentos com status “aprovado” chegam às alunas.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { allRepoKnowledge } from "../src/lib/support-ai/base.ts";
import { chunkDocument, looksLikeInjection, parseKnowledgeFile, planImport, textHash } from "../src/lib/support-ai/knowledge.ts";
import type { KnowledgeDocument } from "../src/lib/support-ai/types.ts";

const [cmd, dirArg, ...rest] = process.argv.slice(2);
const outIdx = rest.indexOf("--out");
const out = outIdx >= 0 ? rest[outIdx + 1] : null;

function usage(): never {
  console.log("Uso: npm run support-kb -- check|preview|sql <pasta> [--out arquivo.sql]");
  process.exit(1);
}

if (!cmd || !dirArg || !["check", "preview", "sql"].includes(cmd)) usage();
const dir = resolve(dirArg);
if (!relative(process.cwd(), dir).startsWith("..")) {
  console.warn("⚠ A pasta está dentro do repositório. Materiais do curso não devem ser versionados no Git.");
}

function walk(d: string, acc: string[] = []): string[] {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const docs: KnowledgeDocument[] = [];
let failed = 0;
for (const file of walk(dir)) {
  const r = parseKnowledgeFile(relative(dir, file), readFileSync(file, "utf8"));
  const name = relative(dir, file);
  if (!r.ok) {
    failed++;
    console.log(`✗ ${name}\n    - ${r.errors.join("\n    - ")}`);
    continue;
  }
  const suspicious = chunkDocument(r.doc).filter((c) => looksLikeInjection(c.text)).length;
  console.log(`✓ ${name} → ${r.doc.id} (${r.doc.status}, v${r.doc.version}${suspicious ? `, ⚠ ${suspicious} trecho(s) com instruções ao modelo serão ignorados` : ""})`);
  docs.push(r.doc);
}
const ids = new Map<string, number>();
for (const d of docs) ids.set(d.id, (ids.get(d.id) ?? 0) + 1);
for (const [id, n] of ids) if (n > 1) {
  failed++;
  console.log(`✗ id repetido em ${n} arquivos: ${id}`);
}
console.log(`\n${docs.length} válido(s), ${failed} problema(s).`);
if (cmd === "check") process.exit(failed ? 1 : 0);

const plan = planImport(docs, allRepoKnowledge());
console.log("\nPrévia (comparada com a base do repositório):");
for (const p of plan) console.log(`  ${p.action.padEnd(16)} ${p.id} · ${p.status} · ${p.chunks} trecho(s)${p.note ? ` · ${p.note}` : ""}`);
if (cmd === "preview") process.exit(failed ? 1 : 0);

if (failed) {
  console.error("\nCorrija os problemas antes de gerar o SQL.");
  process.exit(1);
}
if (!out) usage();
const q = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const lines = ["-- Importação da base do Assistente MVF (gerado por scripts/support-knowledge.ts).", "-- APLICAR SOMENTE COM AUTORIZAÇÃO. Idempotente por id/versão.", "begin;"];
for (const d of docs) {
  if (plan.find((p) => p.id === d.id)?.action === "conflito_versao") continue;
  lines.push(
    `insert into public.support_knowledge_documents (id, title, origin, type, module_id, lesson_id, version, updated_on, status, access, text_hash, published_at, updated_at)
values (${q(d.id)}, ${q(d.title)}, ${q(d.origin)}, ${q(d.type)}, ${q(d.moduleId)}, ${q(d.lessonId)}, ${d.version}, ${q(d.updatedAt)}, ${q(d.status)}, ${q(d.access)}, ${q(textHash(d.text))}, ${d.status === "aprovado" ? "now()" : "null"}, now())
on conflict (id) do update set title = excluded.title, origin = excluded.origin, type = excluded.type, module_id = excluded.module_id, lesson_id = excluded.lesson_id,
  version = excluded.version, updated_on = excluded.updated_on, status = excluded.status, access = excluded.access, text_hash = excluded.text_hash,
  published_at = case when excluded.status = 'aprovado' then coalesce(public.support_knowledge_documents.published_at, now()) else null end, updated_at = now()
where excluded.version >= public.support_knowledge_documents.version;`,
    `delete from public.support_knowledge_chunks where document_id = ${q(d.id)};`,
  );
  for (const c of chunkDocument(d)) {
    if (looksLikeInjection(c.text)) continue;
    lines.push(`insert into public.support_knowledge_chunks (id, document_id, ord, content, content_hash) values (${q(c.id)}, ${q(d.id)}, ${c.ord}, ${q(c.text)}, ${q(c.hash)});`);
  }
}
lines.push("commit;");
writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
console.log(`\nSQL gerado em ${out} (não executado).`);
