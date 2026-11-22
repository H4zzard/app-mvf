/**
 * Catálogo de conteúdo — validação e importação (local; não toca banco nem APIs).
 *
 *   npm run catalog -- check                       # valida src/content/catalogo-oficial.json + pendências
 *   npm run catalog -- check outro-arquivo.json    # valida um arquivo enviado pela equipe
 *   npm run catalog -- import-csv aulas.csv        # PRÉVIA: converte a planilha e valida tudo
 *   npm run catalog -- import-csv aulas.csv --write   # grava no catalogo-oficial.json (só se válido)
 */
import { parseArgs } from "node:util";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCatalogFile } from "../src/lib/catalog/schema.ts";
import { buildCatalog, createCatalogApi } from "../src/lib/catalog/build.ts";
import { lessonsFromCsv, mergeLessons } from "../src/lib/catalog/csv.ts";
import { DEMO_OVERLAY } from "../src/demo/catalog-demo.ts";
import { TASK_CATALOG } from "../src/demo/task-catalog.ts";

const OFFICIAL = "src/content/catalogo-oficial.json";
const { positionals, values } = parseArgs({ allowPositionals: true, options: { write: { type: "boolean", default: false } } });
const [command, fileArg] = positionals;

function die(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}
const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return die(`Não consegui ler ${path}: ${(e as Error).message}`);
  }
};

function report(raw: unknown, label: string): boolean {
  const r = parseCatalogFile(raw);
  console.log(`Catálogo: ${label}`);
  if (!r.ok) {
    console.log(`\n✖ ${r.errors.length} erro(s) — o arquivo NÃO pode ser usado:`);
    for (const e of r.errors) console.log(`  - ${e}`);
    return false;
  }
  const missingCovers = r.file.modules.filter((m) => !existsSync(join("public", m.cover)));
  for (const m of missingCovers) console.log(`  ✖ capa não encontrada: ${m.cover} (${m.id})`);

  const api = createCatalogApi(buildCatalog(r.file, DEMO_OVERLAY));
  const g = api.gaps();
  const tasksOnDemo = TASK_CATALOG.filter((t) => t.lessonId && api.getLesson(t.lessonId)?.origin === "demonstrativo");
  const tasksBroken = TASK_CATALOG.filter((t) => t.lessonId && !api.getLesson(t.lessonId));

  console.log(`\n✔ Arquivo válido · ${r.file.modules.length} módulos · ${g.officialLessons} aulas oficiais · ${r.file.materials.length} materiais oficiais`);
  console.log(`\nPendências (o que falta para o catálogo ser 100% oficial):`);
  console.log(`  • Módulos sem nenhuma aula: ${g.modulesWithoutLessons.length}${g.modulesWithoutLessons.length ? ` → ${g.modulesWithoutLessons.join(", ")}` : ""}`);
  console.log(`  • Módulos só com aulas de EXEMPLO: ${g.modulesOnlyDemo.length}${g.modulesOnlyDemo.length ? ` → ${g.modulesOnlyDemo.join(", ")}` : ""}`);
  console.log(`  • Aulas de exemplo em uso: ${g.demoLessons}`);
  console.log(`  • Aulas oficiais sem vídeo vinculado: ${g.lessonsWithoutVideo.length}`);
  console.log(`  • Aulas oficiais sem duração: ${g.lessonsWithoutDuration.length}`);
  console.log(`  • Materiais sem arquivo: ${g.materialsWithoutFile}`);
  console.log(`  • Tarefas do checklist apontando para aula de EXEMPLO: ${tasksOnDemo.length}${tasksOnDemo.length ? ` → ${tasksOnDemo.map((t) => `${t.id}→${t.lessonId}`).join(", ")}` : ""}`);
  if (tasksBroken.length) console.log(`  ✖ Tarefas apontando para aula INEXISTENTE: ${tasksBroken.map((t) => `${t.id}→${t.lessonId}`).join(", ")}`);
  if (r.warnings.length) {
    console.log(`\nAvisos:`);
    for (const w of r.warnings) console.log(`  ! ${w}`);
  }
  if (r.file.review?.length) {
    console.log(`\nNotas de revisão do arquivo:`);
    for (const n of r.file.review) console.log(`  · ${n}`);
  }
  return missingCovers.length === 0 && tasksBroken.length === 0;
}

if (command === "check") {
  const path = fileArg ?? OFFICIAL;
  process.exit(report(readJson(path), path) ? 0 : 1);
} else if (command === "import-csv") {
  if (!fileArg) die("Informe o arquivo: npm run catalog -- import-csv aulas.csv");
  const csv = lessonsFromCsv(readFileSync(fileArg, "utf8"));
  if (csv.errors.length) die(`Planilha com problema:\n  - ${csv.errors.join("\n  - ")}`);
  const current = readJson(OFFICIAL) as Record<string, unknown>;
  const next = {
    ...current,
    lessons: mergeLessons((current.lessons as Record<string, unknown>[]) ?? [], csv.lessons),
    lessonAliases: { ...((current.lessonAliases as Record<string, string>) ?? {}), ...csv.aliases },
  };
  console.log(`${values.write ? "GRAVAÇÃO" : "PRÉVIA (nada gravado)"} · ${csv.lessons.length} aula(s) da planilha · ${Object.keys(csv.aliases).length} alias(es)\n`);
  const ok = report(next, `${OFFICIAL} + ${fileArg}`);
  if (!ok) die("Corrija os erros acima antes de importar.");
  if (values.write) {
    writeFileSync(OFFICIAL, JSON.stringify(next, null, 2) + "\n");
    console.log(`\n✔ Gravado em ${OFFICIAL}. Rode npm test e npm run build antes de publicar.`);
  } else console.log("\nPara gravar, repita com --write.");
} else {
  die("Comando: check [arquivo.json] | import-csv <planilha.csv> [--write]");
}
