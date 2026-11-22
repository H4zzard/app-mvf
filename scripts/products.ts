/**
 * Catálogo de PRODUTOS — validação e importação (local; não toca banco nem APIs).
 *
 *   npm run products -- check                          # valida src/content/produtos-oficiais.json + pendências
 *   npm run products -- check outro-arquivo.json       # valida um arquivo enviado pela equipe
 *   npm run products -- import produtos.csv            # PRÉVIA (nada é gravado)
 *   npm run products -- import produtos.json           # idem, a partir de JSON
 *   npm run products -- import produtos.csv --write    # grava (só se não houver erro)
 *   … --write --overwrite                              # também troca valores OFICIAIS já cadastrados (revise a prévia!)
 */
import { parseArgs } from "node:util";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseProductsFile, productGaps } from "../src/lib/products/schema.ts";
import { previewProductImport, productsFromCsv, productsFromJson } from "../src/lib/products/import.ts";
import type { Product } from "../src/lib/products/types.ts";
import { catalog } from "../src/lib/catalog/index.ts";
import { DEMO_MATERIALS } from "../src/demo/materials.ts";

const OFFICIAL = "src/content/produtos-oficiais.json";
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { write: { type: "boolean", default: false }, overwrite: { type: "boolean", default: false } },
});
const [command, fileArg] = positionals;

function die(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}
function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    return die(`Não consegui ler ${path}: ${(e as Error).message}`);
  }
}
const readJson = (path: string): unknown => {
  try {
    return JSON.parse(read(path));
  } catch (e) {
    return die(`JSON inválido em ${path}: ${(e as Error).message}`);
  }
};

/** Referências cruzadas: imagens em /public, materiais e aulas existentes. */
function crossCheck(products: Product[]): string[] {
  const errs: string[] = [];
  const materials = new Set(DEMO_MATERIALS.map((m) => m.id));
  for (const p of products) {
    for (const img of p.images) if (!existsSync(join("public", img.src))) errs.push(`${p.id}: imagem não encontrada (${img.src}).`);
    for (const m of p.materialIds) if (!materials.has(m)) errs.push(`${p.id}: material inexistente (${m}).`);
    for (const l of p.lessonIds) if (!catalog.getLesson(l)) errs.push(`${p.id}: aula inexistente (${l}).`);
  }
  return errs;
}

function report(raw: unknown, label: string): boolean {
  const r = parseProductsFile(raw, { requireOfficial: true });
  console.log(`Produtos: ${label}`);
  if (!r.ok) {
    console.log(`\n✖ ${r.errors.length} erro(s) — o arquivo NÃO pode ser usado:`);
    for (const e of r.errors) console.log(`  - ${e}`);
    return false;
  }
  const cross = crossCheck(r.file.products);
  for (const e of cross) console.log(`  ✖ ${e}`);
  const approved = r.file.products.filter((p) => p.approval === "aprovado");
  console.log(`\n✔ Arquivo válido · ${r.file.products.length} produto(s) oficial(is) · ${approved.length} aprovado(s)`);
  console.log(`\nPendências por produto (o que falta a equipe fornecer):`);
  for (const p of r.file.products) {
    const gaps = productGaps(p);
    console.log(`  • ${p.id} (${p.approval}): ${gaps.length ? gaps.join(", ") : "completo"}`);
    for (const n of p.review ?? []) console.log(`      · ${n}`);
  }
  if (r.file.review?.length) {
    console.log(`\nNotas de revisão do arquivo:`);
    for (const n of r.file.review) console.log(`  · ${n}`);
  }
  return cross.length === 0;
}

if (command === "check") {
  const path = fileArg ?? OFFICIAL;
  process.exit(report(readJson(path), path) ? 0 : 1);
} else if (command === "import") {
  if (!fileArg) die("Informe o arquivo: npm run products -- import produtos.csv");
  const src = fileArg.toLowerCase().endsWith(".json") ? productsFromJson(readJson(fileArg)) : productsFromCsv(read(fileArg));
  if (src.errors.length) die(`Arquivo com problema:\n  - ${src.errors.join("\n  - ")}`);
  const current = readJson(OFFICIAL) as Record<string, unknown>;
  const parsed = parseProductsFile(current, { requireOfficial: true });
  if (!parsed.ok) die(`O arquivo oficial atual tem erro; rode “check” primeiro.`);
  const prev = previewProductImport(parsed.file.products, src.rows, { overwrite: values.overwrite });

  console.log(`${values.write ? "GRAVAÇÃO" : "PRÉVIA (nada gravado)"} · ${src.rows.length} linha(s) de ${fileArg}\n`);
  console.log(`  Novos: ${prev.added.length}${prev.added.length ? ` → ${prev.added.join(", ")}` : ""}`);
  console.log(`  Atualizados: ${prev.updated.length}${prev.updated.map((u) => `\n    · ${u.id}: ${u.fields.join(", ")}`).join("")}`);
  console.log(`  Sem mudança: ${prev.unchanged.length}`);
  if (prev.conflicts.length) {
    console.log(`\n  ! ${prev.conflicts.length} valor(es) OFICIAL(is) já cadastrado(s) NÃO foram trocados (use --overwrite depois de conferir):`);
    for (const c of prev.conflicts) console.log(`    · ${c.id}.${c.field}: ${JSON.stringify(c.current)} → ${JSON.stringify(c.incoming)}`);
  }
  if (prev.errors.length) die(`Corrija antes de importar:\n  - ${prev.errors.join("\n  - ")}`);

  const next = { ...current, updatedAt: new Date().toISOString().slice(0, 10), products: prev.products };
  console.log("");
  if (!report(next, `${OFFICIAL} + ${fileArg}`)) die("Corrija os erros acima antes de importar.");
  if (values.write) {
    writeFileSync(OFFICIAL, JSON.stringify(next, null, 2) + "\n");
    console.log(`\n✔ Gravado em ${OFFICIAL}. Rode npm test e npm run build antes de publicar.`);
  } else console.log("\nPara gravar, repita com --write.");
} else {
  die("Comando: check [arquivo.json] | import <produtos.csv|produtos.json> [--write] [--overwrite]");
}
