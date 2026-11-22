import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { CatalogLesson } from "@/types/catalog";
import { readConfig } from "../config/env.ts";
import { checkEnv } from "../config/preflight.ts";
import { adminDemoAllowed, denyAdminDemoRequest } from "./access.ts";
import { catalogContext, productExists, productsBase, scriptsBase } from "./context.ts";
import { createAdminReducer, initialAdminState, pendingCount, type AdminAction, type AdminContext, type AdminState } from "./store.ts";
import { blankLesson, buildCatalogExport, lessonImpact, lessonsToCsv, moveModule } from "./catalog-edit.ts";
import { blankProduct, buildProductsExport, checkProduct, productsToCsv } from "./products-edit.ts";
import { blankScript, buildScriptsExport } from "./scripts-edit.ts";
import { contentMetrics, contentPendings, PENDING_INTEGRATION } from "./overview.ts";
import { buildChangeReport } from "./report.ts";
import { profileCan } from "./roles.ts";
import { checkTransition, STATUS_MEANING } from "../content/editorial.ts";
import { lessonsFromCsv } from "../catalog/csv.ts";
import { productsFromCsv, previewProductImport } from "../products/import.ts";
import { officialCatalogFile, catalog } from "../catalog/index.ts";
import { officialProductsFile } from "../products/index.ts";
import { DEMO_PRODUCTS } from "../../demo/products.ts";
import { SCRIPT_LIBRARY } from "../../demo/studio-scripts.ts";
import type { Product } from "../products/types.ts";

const CTX: AdminContext = { catalog: catalogContext, productsBase: productsBase.products, scriptsBase, productExists };
const reduce = createAdminReducer(CTX);
const run = (s: AdminState, ...a: AdminAction[]) => a.reduce(reduce, s);
const hash = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const CONTENT = ["src/content/catalogo-oficial.json", "src/content/produtos-oficiais.json", "src/content/roteiros-oficiais.json", "src/content/agenda-oficial.json"];
const BEFORE = Object.fromEntries(CONTENT.map((p) => [p, hash(p)]));
const FILE_SNAPSHOT = JSON.stringify([officialCatalogFile, officialProductsFile]);

const lesson = (over: Partial<CatalogLesson> = {}): CatalogLesson => ({
  ...blankLesson("l-nova-aula-teste", "m-primeiros-passos", 1),
  title: "Nova aula de teste",
  summary: "Resumo da aula de teste.",
  durationMinutes: 12,
  ...over,
});

const completeProduct = (over: Partial<Product> = {}): Product => ({
  ...blankProduct("numi-produto-teste"),
  name: "Produto de teste",
  category: "corpo",
  images: [{ src: "/area-membros/numi-produto-exclusivo.png", alt: "Capa", kind: "foto" }],
  shortDescription: "Curta",
  description: "Descrição oficial de teste.",
  howToUse: "Modo de uso de teste.",
  characteristics: ["Característica"],
  approvedBenefits: ["Benefício aprovado"],
  restrictions: ["Restrição"],
  price: { amount: 59.9, currency: "BRL", verifiedAt: "2026-11-01" },
  commission: { value: 10, type: "percentual", source: "Fonte de teste", verifiedAt: "2026-11-01" },
  affiliation: { status: "disponivel", conditions: "Condições de teste", affiliateUrl: "https://example.com/af" },
  productUrl: "https://example.com/p",
  ...over,
});

/* ------------------------------- Acesso ao painel ------------------------------- */

test("acesso: só com development + MVF_DEMO_MODE + MVF_ADMIN_DEMO (decisão no servidor)", () => {
  const cfg = (env: Record<string, string>) => readConfig(env);
  assert.equal(adminDemoAllowed(cfg({ NODE_ENV: "development", MVF_DEMO_MODE: "true", MVF_ADMIN_DEMO: "true" })), true);
  assert.equal(adminDemoAllowed(cfg({ NODE_ENV: "production", MVF_DEMO_MODE: "true", MVF_ADMIN_DEMO: "true" })), false, "produção nunca");
  assert.equal(adminDemoAllowed(cfg({ NODE_ENV: "development", MVF_DEMO_MODE: "true" })), false, "sem a flag explícita");
  assert.equal(adminDemoAllowed(cfg({ NODE_ENV: "development", MVF_ADMIN_DEMO: "true" })), false, "sem o modo demo");
  const supa = { NODE_ENV: "development", MVF_ADMIN_DEMO: "true", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" };
  assert.equal(adminDemoAllowed(cfg(supa)), false, "modo Supabase (contas reais) nunca");
  const prod = cfg({ NODE_ENV: "production", MVF_DEMO_MODE: "true", MVF_ADMIN_DEMO: "true" });
  for (const p of ["/gestao", "/gestao/cursos", "/gestao/produtos?x=1".split("?")[0]]) assert.equal(denyAdminDemoRequest(p, prod), true, p);
  assert.equal(denyAdminDemoRequest("/admin", prod), false, "o /admin real não é afetado");
  assert.equal(denyAdminDemoRequest("/gestaox", prod), false);
});

test("preflight acusa MVF_ADMIN_DEMO ligado em homologação/produção", () => {
  const r = checkEnv({ MVF_ADMIN_DEMO: "true", NODE_ENV: "production" }, "producao");
  assert.ok(r.some((c) => c.key === "MVF_ADMIN_DEMO" && c.level === "error"));
});

/* ------------------------------- Visão geral ------------------------------- */

test("visão geral: indicadores reais do catálogo, sem números de alunas/vendas", () => {
  const m = Object.fromEntries(contentMetrics().map((x) => [x.label, x.value]));
  assert.equal(m["Módulos cadastrados"], 23);
  assert.equal(m["Aulas oficiais"], catalog.gaps().officialLessons);
  assert.equal(m["Aulas de exemplo"], catalog.gaps().demoLessons);
  assert.equal(m["Produtos oficiais"], officialProductsFile.products.length);
  assert.equal(m["Produtos em rascunho"], officialProductsFile.products.filter((p) => p.approval !== "aprovado").length);
  assert.ok(!contentMetrics().some((x) => /alun|receit|vend|acess|visualiz/i.test(x.label)));
  assert.ok(PENDING_INTEGRATION.some((l) => /alunas/i.test(l)));
  const p = contentPendings().map((x) => x.text).join(" | ");
  assert.match(p, /módulos/);
  assert.match(p, /Creme Multifuncional 3 em 1: falta/);
});

/* ------------------------------- Cursos e aulas ------------------------------- */

test("aula: criar, editar e validar com o validador oficial; inválida não é salva", () => {
  let s = run(initialAdminState(), { type: "lesson/save", lesson: lesson() });
  assert.equal(s.lessons["l-nova-aula-teste"].status, "rascunho");
  assert.equal(run(s, { type: "lesson/save", lesson: lesson({ id: "l-x", moduleId: "m-nao-existe" }) }), s, "módulo inexistente");
  assert.equal(run(s, { type: "lesson/save", lesson: lesson({ id: "l-y", media: { kind: "externo", provider: "youtube", ref: "https://youtu.be/abc" } }) }), s, "URL no lugar do ID");
  assert.equal(run(s, { type: "lesson/save", lesson: lesson({ id: "l-z", durationMinutes: 900 }) }), s);
  s = run(s, { type: "lesson/save", lesson: lesson({ title: "Título editado" }) });
  assert.equal(s.lessons["l-nova-aula-teste"].data.title, "Título editado");
});

test("aula: perfil sem permissão de edição não altera nada", () => {
  const s0 = initialAdminState("moderador");
  assert.equal(profileCan("moderador", "content:edit"), false);
  assert.equal(run(s0, { type: "lesson/save", lesson: lesson() }), s0);
  assert.equal(run(s0, { type: "module/move", id: "m-primeiros-passos", dir: 1 }), s0);
});

test("IDs e aliases: substituir exemplo mantém o MESMO ID; alias nunca vira ID de aula", () => {
  const s = run(initialAdminState(), { type: "lesson/save", lesson: lesson({ id: "l-roteiro", moduleId: "m-roteirista-invisivel", title: "Roteiro oficial" }) });
  assert.ok(s.lessons["l-roteiro"], "mesmo ID da aula de exemplo (progresso e tarefas preservados)");
  const ctx2: AdminContext = { ...CTX, catalog: { ...catalogContext, file: { ...catalogContext.file, lessonAliases: { "l-antiga": "l-roteiro" } } } };
  const s0 = initialAdminState();
  assert.equal(createAdminReducer(ctx2)(s0, { type: "lesson/save", lesson: lesson({ id: "l-antiga" }) }), s0);
});

test("excluir aula usada por tarefa do plano exige ver e confirmar o impacto", () => {
  let s = run(initialAdminState(), { type: "lesson/save", lesson: lesson({ id: "l-roteiro", moduleId: "m-roteirista-invisivel", title: "Roteiro oficial" }) });
  const impact = lessonImpact("l-roteiro", catalogContext);
  assert.ok(impact.some((i) => i.startsWith("Tarefa do plano")), impact.join(" | "));
  assert.equal(run(s, { type: "lesson/remove", id: "l-roteiro", confirmed: false }), s, "sem confirmação nada muda");
  s = run(s, { type: "lesson/remove", id: "l-roteiro", confirmed: true });
  assert.equal(s.lessons["l-roteiro"], undefined);
});

test("reordenar módulos: só dentro do trilho; voltar à ordem original limpa o rascunho", () => {
  const rail = catalogContext.file.modules.filter((m) => m.railId === "formacao").sort((a, b) => a.order - b.order);
  const patch = moveModule(catalogContext.file.modules, rail[0].id, 1);
  assert.deepEqual(Object.keys(patch).sort(), [rail[0].id, rail[1].id].sort());
  assert.equal(patch[rail[0].id].order, 2);
  let s = run(initialAdminState(), { type: "module/move", id: rail[0].id, dir: 1 });
  assert.equal(pendingCount(s), 2);
  s = run(s, { type: "module/move", id: rail[0].id, dir: -1 });
  assert.deepEqual(s.moduleEdits, {});
  assert.deepEqual(moveModule(catalogContext.file.modules, rail[0].id, -1), {}, "o primeiro não sobe");
});

/* ------------------------------- Fluxo editorial ------------------------------- */

test("fluxo editorial: transições, permissões por perfil e validação antes de avançar", () => {
  const ok = { errors: [] as string[], missing: [] as string[] };
  const as = (p: Parameters<typeof profileCan>[0]) => (perm: Parameters<typeof profileCan>[1]) => profileCan(p, perm);
  assert.equal(checkTransition("rascunho", "aprovado", { can: as("administrador"), ...ok }).ok, false, "não pula a revisão");
  assert.equal(checkTransition("rascunho", "em_revisao", { can: as("editor"), ...ok }).ok, true);
  assert.equal(checkTransition("em_revisao", "aprovado", { can: as("editor"), ...ok }).ok, false, "editor não aprova");
  assert.equal(checkTransition("em_revisao", "aprovado", { can: as("revisor"), ...ok }).ok, true);
  assert.equal(checkTransition("aprovado", "publicado_local", { can: as("revisor"), ...ok }).ok, false, "revisor não publica");
  assert.equal(checkTransition("aprovado", "publicado_local", { can: as("administrador"), ...ok }).ok, true);
  assert.equal(checkTransition("em_revisao", "aprovado", { can: as("administrador"), errors: [], missing: ["duração"] }).ok, false, "incompleto não aprova");
  assert.equal(checkTransition("rascunho", "em_revisao", { can: as("administrador"), errors: ["erro"], missing: [] }).ok, false);
  assert.equal(checkTransition("arquivado", "rascunho", { can: as("editor"), ...ok }).ok, true);
  assert.match(STATUS_MEANING.aprovado, /Não é aprovação real/);
  assert.match(STATUS_MEANING.publicado_local, /Não foi publicado na Vercel/);
});

test("fluxo no redutor: aula incompleta não aprova; editar depois de aprovar volta a rascunho", () => {
  let s = run(initialAdminState(), { type: "lesson/save", lesson: lesson({ durationMinutes: null }) }, { type: "status/set", kind: "aula", id: "l-nova-aula-teste", to: "em_revisao" });
  assert.equal(s.lessons["l-nova-aula-teste"].status, "em_revisao");
  assert.equal(run(s, { type: "status/set", kind: "aula", id: "l-nova-aula-teste", to: "aprovado" }), s, "falta duração");
  s = run(s, { type: "lesson/save", lesson: lesson() });
  assert.equal(s.lessons["l-nova-aula-teste"].status, "rascunho", "mudou o conteúdo → nova revisão");
  s = run(s, { type: "status/set", kind: "aula", id: "l-nova-aula-teste", to: "em_revisao" }, { type: "status/set", kind: "aula", id: "l-nova-aula-teste", to: "aprovado" });
  assert.equal(s.lessons["l-nova-aula-teste"].status, "aprovado");
  s = run(s, { type: "lesson/save", lesson: lesson({ summary: "Outro resumo." }) });
  assert.equal(s.lessons["l-nova-aula-teste"].status, "rascunho");
});

/* --------------------------------- Exportação --------------------------------- */

test("exportação do catálogo: só aulas aprovadas entram; arquivo validado; CSV reimportável", () => {
  let s = run(
    initialAdminState(),
    { type: "lesson/save", lesson: lesson() },
    { type: "status/set", kind: "aula", id: "l-nova-aula-teste", to: "em_revisao" },
    { type: "status/set", kind: "aula", id: "l-nova-aula-teste", to: "aprovado" },
    { type: "lesson/save", lesson: lesson({ id: "l-rascunho-teste", title: "Só rascunho" }) },
  );
  const exp = buildCatalogExport(catalogContext, s.moduleEdits, Object.values(s.lessons).map((d) => ({ lesson: d.data, status: d.status })));
  assert.ok(exp.ok, exp.errors.join("\n"));
  assert.deepEqual(exp.included, ["l-nova-aula-teste"]);
  assert.deepEqual(exp.excluded.map((e) => e.id), ["l-rascunho-teste"]);
  assert.equal(exp.file!.modules.length, 23);
  assert.deepEqual(exp.file!.lessonAliases, officialCatalogFile.lessonAliases, "aliases preservados");
  const back = lessonsFromCsv(lessonsToCsv([s.lessons["l-nova-aula-teste"].data]));
  assert.deepEqual(back.errors, []);
  assert.equal(back.lessons[0].id, "l-nova-aula-teste");
  assert.equal(back.lessons[0].durationMinutes, 12);
  s = run(s, { type: "module/move", id: "m-primeiro-acesso", dir: 1 });
  assert.ok(buildCatalogExport(catalogContext, s.moduleEdits, []).ok);
});

/* --------------------------------- Produtos --------------------------------- */

test("produtos: demonstrativo nunca é editado nem ganha preço/comissão/link", () => {
  const s0 = initialAdminState();
  const demo = DEMO_PRODUCTS[0];
  assert.equal(run(s0, { type: "product/save", product: demo }), s0);
  assert.ok(checkProduct(demo).errors.length);
  assert.equal(run(s0, { type: "product/save", product: { ...demo, origin: "oficial", brand: "Exemplo", price: { amount: 10, currency: "BRL", verifiedAt: "x" } } }), s0, "preço sem data válida");
});

test("produtos: o Creme 3 em 1 não vira aprovado só por ter capa; produto completo pode", () => {
  const creme = productsBase.products.find((p) => p.id === "numi-creme-multifuncional-3em1")!;
  let s = run(initialAdminState(), { type: "product/save", product: { ...creme, shortDescription: "Descrição curta editada" } });
  assert.equal(s.products[creme.id].status, "rascunho");
  s = run(s, { type: "status/set", kind: "produto", id: creme.id, to: "em_revisao" });
  assert.equal(run(s, { type: "status/set", kind: "produto", id: creme.id, to: "aprovado" }).products[creme.id].status, "em_revisao", "incompleto continua fora de aprovado");
  assert.ok(checkProduct(creme).missing.includes("preço"));

  let t = run(initialAdminState(), { type: "product/save", product: completeProduct() });
  t = run(t, { type: "status/set", kind: "produto", id: "numi-produto-teste", to: "em_revisao" }, { type: "status/set", kind: "produto", id: "numi-produto-teste", to: "aprovado" });
  assert.equal(t.products["numi-produto-teste"].status, "aprovado");
  const exp = buildProductsExport(productsBase, Object.values(t.products).map((d) => ({ product: d.data, status: d.status })), "2026-11-22");
  assert.ok(exp.ok, exp.errors.join("\n"));
  assert.equal(exp.file!.products.find((p) => p.id === "numi-produto-teste")!.approval, "aprovado");
  assert.equal(exp.file!.products.find((p) => p.id === creme.id)!.approval, "rascunho");
  // CSV exportado é reimportável pelo CLI de produtos sem conflito.
  const csv = productsFromCsv(productsToCsv(exp.file!.products));
  assert.deepEqual(csv.errors, []);
  const prev = previewProductImport(exp.file!.products, csv.rows);
  assert.deepEqual(prev.errors, []);
  assert.deepEqual(prev.conflicts, []);
});

test("produtos: comissão sem fonte é recusada (validador oficial)", () => {
  const p = completeProduct({ commission: { value: 10, type: "percentual", source: "", verifiedAt: "2026-11-01" } });
  assert.ok(checkProduct(p).errors.some((e) => /fonte/.test(e)));
});

/* --------------------------------- Roteiros --------------------------------- */

test("roteiros: cadastro, validação, autorização e exportação no contrato central", () => {
  const sc = { ...blankScript("rot-rotina-teste"), title: "Rotina de teste", category: "Rotina", summary: "Resumo", parts: { hook: "Olha isso.", body: "Eu uso o {produto} de manhã.", cta: "Link no vídeo." } };
  let s = run(initialAdminState(), { type: "script/save", script: sc });
  assert.equal(s.scripts["rot-rotina-teste"].status, "rascunho");
  s = run(s, { type: "status/set", kind: "roteiro", id: "rot-rotina-teste", to: "em_revisao" });
  assert.equal(run(s, { type: "status/set", kind: "roteiro", id: "rot-rotina-teste", to: "aprovado" }).scripts["rot-rotina-teste"].status, "em_revisao", "sem autorização não aprova");
  s = run(s, { type: "script/save", script: { ...sc, authorization: { source: "Equipe MVF", authorized: true } } });
  s = run(s, { type: "status/set", kind: "roteiro", id: "rot-rotina-teste", to: "em_revisao" }, { type: "status/set", kind: "roteiro", id: "rot-rotina-teste", to: "aprovado" });
  assert.equal(s.scripts["rot-rotina-teste"].status, "aprovado");
  const exp = buildScriptsExport(scriptsBase, Object.values(s.scripts).map((d) => ({ script: d.data, status: d.status })), "2026-11-22", productExists);
  assert.ok(exp.ok, exp.errors.join("\n"));
  const s0 = initialAdminState();
  assert.equal(run(s0, { type: "script/save", script: { ...sc, title: "Roteiro validado comercialmente" } }), s0);
  assert.equal(run(s0, { type: "script/save", script: { ...sc, productId: "nao-existe" } }), s0);
  assert.equal(run(s0, { type: "script/save", script: { ...sc, id: "tpl-gancho-demo-cta", origin: "demonstrativo" } }), s0, "exemplo não é editado");
});

test("Animador continua igual: com o arquivo oficial vazio, só os 5 exemplos", () => {
  assert.equal(SCRIPT_LIBRARY.length, 5);
  assert.ok(SCRIPT_LIBRARY.every((s) => s.source === "exemplo"));
});

/* ------------------------------ Dados e backend ------------------------------ */

test("relatório de alterações inclui rascunhos e o aviso de demonstração", () => {
  const s = run(initialAdminState(), { type: "lesson/save", lesson: lesson() });
  const r = buildChangeReport(s, CTX, "2026-11-22");
  assert.equal(r.lessons[0].isNew, true);
  assert.match(r.note, /não são aprovação nem publicação reais/);
});

test("dados oficiais preservados: nada do painel altera objetos nem arquivos do projeto", () => {
  run(initialAdminState(), { type: "lesson/save", lesson: lesson() }, { type: "product/save", product: completeProduct() }, { type: "module/move", id: "m-primeiro-acesso", dir: 1 });
  assert.equal(JSON.stringify([officialCatalogFile, officialProductsFile]), FILE_SNAPSHOT);
  for (const p of CONTENT) assert.equal(hash(p), BEFORE[p], p);
});

test("sem backend: painel e lógica não usam rede, banco, env, Server Actions nem armazenamento", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      // integration-health.ts é o /admin REAL (pré-existente, lê o banco no servidor): fora do painel demo.
      else if (/\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts") && f !== "integration-health.ts") files.push(p);
    }
  };
  walk("src/lib/admin");
  walk("src/components/gestao");
  walk("src/lib/content");
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /\bfetch\(|from ["'][^"']*supabase|"use server"|localStorage|sessionStorage|indexedDB|writeFile/i, f);
    if (!f.endsWith("access.ts")) assert.doesNotMatch(src, /process\.env/, f);
  }
});
