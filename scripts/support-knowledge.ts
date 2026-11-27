/**
 * Pipeline da base de conhecimento do Assistente MVF (LOCAL, sem rede).
 *
 *   npm run support-kb -- check   <pasta>              # valida arquivos (.md .txt .vtt .srt)
 *   npm run support-kb -- preview <pasta>              # prévia: novos, versões, duplicados, trechos
 *   npm run support-kb -- sql     <pasta> --out x.sql   # gera SQL de importação (NÃO executa)
 *   npm run support-kb -- scaffold <pasta>             # cria a estrutura de pastas e modelos (não sobrescreve)
 *   npm run support-kb -- push <pasta> [--app] [--execute]  # envia ao Supabase do .env carregado (prévia sem --execute); --app inclui os guias do app
 *   npm run support-kb -- split <arquivo.md> <pasta> [--aprovado]  # divide um documento com várias “Aula:” em um arquivo por aula
 *
 * A pasta deve ficar FORA do repositório (materiais do curso são privados).
 * O SQL gerado só é aplicado no banco depois de autorização explícita do
 * operador (docs/SUPORTE_IA.md). Só documentos com status “aprovado” chegam às alunas.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { allRepoKnowledge, repoGuides } from "../src/lib/support-ai/base.ts";
import { catalog, officialCatalogFile } from "../src/lib/catalog/index.ts";
import { chunkDocument, looksLikeInjection, parseKnowledgeFile, planImport, textHash } from "../src/lib/support-ai/knowledge.ts";
import type { KnowledgeDocument } from "../src/lib/support-ai/types.ts";

const [cmd, dirArg, ...rest] = process.argv.slice(2);
const outIdx = rest.indexOf("--out");
const out = outIdx >= 0 ? rest[outIdx + 1] : null;

function usage(): never {
  console.log("Uso: npm run support-kb -- check|preview|sql <pasta> [--out arquivo.sql]");
  process.exit(1);
}

if (!cmd || !dirArg || !["check", "preview", "sql", "scaffold", "split", "push"].includes(cmd)) usage();
const dir = resolve(dirArg);

/**
 * split <arquivo.md> <pasta>: divide um documento único com várias aulas (“## Aula: Título”)
 * em um arquivo por aula, já com cabeçalho. Limpa a marcação exportada do Notion/Docs
 * (escapes, negrito) e as indicações de gravação entre colchetes. Reexecutar sobrescreve
 * a pasta gerada; edite o documento de origem, não os arquivos gerados.
 */
if (cmd === "split") {
  const target = rest[0];
  const status = rest.includes("--aprovado") ? "aprovado" : "rascunho";
  if (!target) usage();
  const raw = readFileSync(dir, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const clean = (line: string) =>
    line
      .replace(/\\([\\[\]\-!.:()*_#+>])/g, "$1")
      .replace(/\*\*|__/g, "")
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1")
      .replace(/^#{1,6}\s*/, "")
      .replace(/\s+$/, "");
  const isStageDirection = (l: string) => /^\[[^\]]*\]$/.test(l.trim()) || /^GUIA DE GRAVAÇÃO\b/i.test(l.trim());
  const slug = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
  const lessons: { title: string; body: string[] }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const c = clean(line);
    const m = /^#{1,3}\s/.test(line.trim()) ? /^Aula\s*:\s*(.+)$/i.exec(c.trim()) : null;
    if (m) lessons.push({ title: m[1].trim().replace(/[.!]+$/, ""), body: [] });
    else if (lessons.length && !isStageDirection(c)) lessons.at(-1)!.body.push(c.trim() === "" ? "" : c.trim());
  }
  const outDir = resolve(target);
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (/^\d{3}-.*\.md$/.test(f)) writeFileSync(join(outDir, f), ""); // limpa a geração anterior
  const used = new Set<string>();
  let written = 0;
  const skipped: string[] = [];
  lessons.forEach((l, i) => {
    const text = l.body.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.replace(/\s/g, "").length < 80) return skipped.push(l.title);
    let id = `curso-${slug(l.title)}`;
    while (used.has(id)) id = `${id}-${i}`;
    used.add(id);
    const title = l.title.replace(/\n/g, " ");
    const file = join(outDir, `${String(i + 1).padStart(3, "0")}-${id.slice(6)}.md`);
    writeFileSync(file, `---\nid: ${id}\ntitle: ${title}\ntype: transcricao\nversion: 1\nupdated: ${today}\nstatus: ${status}\naccess: alunas\norigin: Aula do curso MVF (${String(i + 1).padStart(3, "0")}ª no documento)\n---\n${text}\n`, "utf8");
    written++;
  });
  for (const f of readdirSync(outDir)) if (/^\d{3}-.*\.md$/.test(f) && statSync(join(outDir, f)).size === 0) unlinkSync(join(outDir, f));
  console.log(`✓ ${written} aula(s) gravada(s) em ${outDir} (status: ${status}).`);
  if (skipped.length) console.log(`⚠ ${skipped.length} aula(s) sem conteúdo escrito, não incluída(s): ${skipped.join(" · ")}`);
  process.exit(0);
}

if (cmd === "scaffold") {
  const write = (path: string, content: string) => {
    if (existsSync(path)) return console.log(`= mantido   ${relative(dir, path)}`);
    writeFileSync(path, content, "utf8");
    console.log(`+ criado    ${relative(dir, path)}`);
  };
  const today = new Date().toISOString().slice(0, 10);
  for (const sub of ["aplicativo", "suporte", "curso"]) mkdirSync(join(dir, sub), { recursive: true });
  write(join(dir, "LEIA-ME.txt"), `Base da Nina (Assistente MVF) — materiais PRIVADOS, fora do Git.

aplicativo/  textos extras sobre o uso do app (os guias principais já estão no app)
suporte/     procedimentos de atendimento, regras, FAQ oficial, produtos NUMI autorizados
curso/       uma pasta por módulo oficial; um arquivo por aula (.md, .txt, .vtt ou .srt)

Cada arquivo começa com o cabeçalho entre ---. Tudo começa como status: rascunho.
Só mude para status: aprovado depois da revisão da equipe.

Comandos (na pasta do projeto):
  npm run support-kb -- check   ~/MVF-base
  npm run support-kb -- preview ~/MVF-base
  npm run nina -- report ~/MVF-base
  npm run support-kb -- sql ~/MVF-base --out ~/mvf-base.sql   (gera, não executa)
`);
  const rails = new Map(officialCatalogFile.rails.map((r) => [r.id, r.title]));
  for (const m of officialCatalogFile.modules.filter((x) => x.origin === "oficial")) {
    const folder = join(dir, "curso", `${String(m.order).padStart(2, "0")}-${m.id}`);
    mkdirSync(folder, { recursive: true });
    write(join(folder, "_modulo.md"), `---
id: modulo-${m.id}-detalhes
title: Módulo ${m.title}
type: material
module: ${m.id}
version: 1
updated: ${today}
status: rascunho
access: alunas
objective: (escreva o objetivo do módulo)
prerequisites: (módulos ou aulas que vêm antes, se houver)
---
Trilho: ${rails.get(m.railId) ?? m.railId}. Ordem no trilho: ${m.order}.

(Descreva o módulo para a aluna: para quem é, o que ela vai aprender e em que momento da jornada ele ajuda.)
`);
    const lessons = officialCatalogFile.lessons.filter((l) => l.moduleId === m.id && l.origin === "oficial");
    for (const l of lessons) {
      write(join(folder, `${String(l.order).padStart(2, "0")}-${l.id}.md`), `---
id: aula-${l.id}-transcricao
title: ${l.title}
type: transcricao
module: ${m.id}
lesson: ${l.id}
version: 1
updated: ${today}
status: rascunho
access: alunas
objective: (objetivo da aula)
topics: (assuntos, separados por vírgula)
keywords: (palavras e dúvidas que as alunas usam para pedir esta aula)
---
(Cole aqui a transcrição completa ou o roteiro da aula.)
`);
    }
  }
  write(join(dir, "curso", "modelo-aula.md"), `---
id: aula-ID-DA-AULA-transcricao
title: Nome oficial da aula
type: transcricao
module: ID-DO-MODULO
lesson: ID-DA-AULA (o mesmo do catálogo oficial)
version: 1
updated: ${today}
status: rascunho
access: alunas
objective: O que a aluna consegue fazer depois da aula
topics: assunto 1, assunto 2, assunto 3
keywords: como as alunas pedem esta aula, dúvidas comuns
---
Transcrição completa ou roteiro da aula. Para legendas, use .vtt ou .srt com o mesmo cabeçalho.
`);
  console.log(`
Estrutura pronta em ${dir}. Módulos oficiais: ${officialCatalogFile.modules.filter((x) => x.origin === "oficial").length}. Aulas oficiais no catálogo: ${officialCatalogFile.lessons.filter((x) => x.origin === "oficial").length}.`);
  process.exit(0);
}
if (!relative(process.cwd(), dir).startsWith("..")) {
  console.warn("⚠ A pasta está dentro do repositório. Materiais do curso não devem ser versionados no Git.");
}

function walk(d: string, acc: string[] = []): string[] {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (!/^(LEIA-ME|modelo-aula)/i.test(f) && !f.startsWith(".")) acc.push(p);
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
  if (r.doc.lessonId) {
    const l = catalog.getLesson(r.doc.lessonId);
    if (!l) console.log(`⚠ ${name}: a aula ${r.doc.lessonId} não existe no catálogo. Cadastre a aula no catálogo oficial antes (docs/CATALOGO.md); sem isso não haverá botão “Abrir aula”.`);
    else if (l.origin !== "oficial") console.log(`⚠ ${name}: ${r.doc.lessonId} é uma aula de EXEMPLO, não oficial.`);
  }
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

if (cmd === "push") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("✗ Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY. Rode com node --env-file=<arquivo .env> …");
    process.exit(1);
  }
  const execute = rest.includes("--execute");
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const api = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers as Record<string, string> | undefined) } });
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${path.split("?")[0]}: ${(await r.text()).slice(0, 200)}`);
    return r;
  };
  // --app: também envia os guias do aplicativo (src/content/nina/aplicativo.json), com o status de lá.
  if (rest.includes("--app")) docs.push(...repoGuides().docs);
  const existing = new Map<string, number>(((await (await api("support_knowledge_documents?select=id,version")).json()) as { id: string; version: number }[]).map((d) => [d.id, d.version]));
  const todo = docs.filter((d) => !(existing.get(d.id)! > d.version));
  const older = docs.length - todo.length;
  const host = new URL(url).host.split(".")[0];
  console.log(`\nDestino: projeto Supabase ${host.slice(0, 4)}… · ${todo.length} documento(s) a enviar (${todo.filter((d) => existing.has(d.id)).length} atualização(ões))${older ? ` · ${older} ignorado(s): versão no banco é mais nova` : ""}.`);
  if (!execute) {
    console.log("Prévia apenas. Para gravar, rode de novo com --execute.");
    process.exit(0);
  }
  let chunks = 0;
  for (const d of todo) {
    await api("support_knowledge_documents?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: d.id, title: d.title, origin: d.origin, type: d.type, module_id: d.moduleId ?? null, lesson_id: d.lessonId ?? null, version: d.version, updated_on: d.updatedAt, status: d.status, access: d.access, text_hash: textHash(d.text), published_at: d.status === "aprovado" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }),
    });
    await api(`support_knowledge_chunks?document_id=eq.${encodeURIComponent(d.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const rows = chunkDocument(d).filter((c) => !looksLikeInjection(c.text)).map((c) => ({ id: c.id, document_id: d.id, ord: c.ord, content: c.text, content_hash: c.hash }));
    if (rows.length) await api("support_knowledge_chunks", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
    chunks += rows.length;
  }
  console.log(`✓ ${todo.length} documento(s) e ${chunks} trecho(s) gravados.`);
  process.exit(0);
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
