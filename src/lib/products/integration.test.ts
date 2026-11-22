import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEMO_PRODUCTS } from "../../demo/products.ts";
import { productCatalog } from "./index.ts";
import { animationFieldsFrom, dialogueMentions, fitItems, missingForRecording, recordingFieldsFrom, studioProductSeed } from "./studio-bridge.ts";
import { recommendProducts } from "./recommend.ts";
import { previewProductImport, productsFromCsv, productsFromJson } from "./import.ts";
import { defaultRecordingBrief, validateRecordingBrief, buildRecordingScripts } from "../studio/recording-scripts.ts";
import { buildAnimationPrompts, defaultAnimationBrief, dialoguePreserved, exactDialogue } from "../studio/animation.ts";
import { demoReducer, initialDemoState, MY_PRODUCTS_MAX } from "../demo/store.ts";
import { parseSnapshot, serializeSnapshot } from "../demo/snapshot.ts";
import type { Product } from "./types.ts";

const approved = (over: Partial<Product> = {}): Product => ({
  ...DEMO_PRODUCTS[1],
  id: "numi-aprovado",
  brand: "NUMI",
  origin: "oficial",
  approval: "aprovado",
  approvedBenefits: ["Benefício aprovado A", "Benefício aprovado B"],
  price: { amount: 59.9, currency: "BRL", verifiedAt: "2026-11-01" },
  commission: { value: 12, type: "percentual", source: "Fonte secreta de teste", verifiedAt: "2026-11-01" },
  affiliation: { status: "disponivel", conditions: "Condição comercial de teste", affiliateUrl: "https://example.com/af" },
  productUrl: "https://example.com/p",
  ...over,
});

/* ------------------------- Marketplace → Roteiros ------------------------- */

test("Marketplace → Roteiros: nome, descrição, modo de uso e características chegam intactos", () => {
  const p = productCatalog.get("p-serum");
  assert.ok(p);
  const f = recordingFieldsFrom(studioProductSeed(p));
  assert.equal(f.productName, p.name);
  assert.equal(f.howToUse, p.howToUse);
  assert.ok(f.description.startsWith(p.description));
  for (const c of p.characteristics) assert.ok(f.description.includes(c), c);
  assert.equal(f.category, "Skincare");
  assert.equal(f.differential, "", "diferencial é afirmação comparativa: só a aluna escreve");
});

test("Marketplace → Roteiros: briefing de produto demonstrativo é válido e gera as 10 abordagens", () => {
  for (const p of DEMO_PRODUCTS.filter((x) => x.availability !== "indisponivel")) {
    const brief = { ...defaultRecordingBrief(), ...recordingFieldsFrom(studioProductSeed(p)), style: "aplicacao" as const };
    assert.deepEqual(validateRecordingBrief(brief), {}, p.id);
    const out = buildRecordingScripts(brief);
    assert.equal(out.scripts.length, 10);
    assert.ok(out.scripts.every((s) => s.fullSpeech.includes(p.name)), p.id);
    assert.equal(new Set(out.scripts.map((s) => s.angle)).size, 10);
  }
});

test("Marketplace → Estúdio NUNCA leva preço, comissão, fonte, link ou condição comercial", () => {
  const p = approved();
  const seed = studioProductSeed(p);
  const text = JSON.stringify([seed, recordingFieldsFrom(seed), animationFieldsFrom(seed)]);
  for (const forbidden of ["59", "12%", "Fonte secreta", "example.com", "Condição comercial", "R$"]) assert.ok(!text.includes(forbidden), forbidden);
});

test("benefícios só seguem para o Estúdio quando o produto oficial está APROVADO", () => {
  assert.match(recordingFieldsFrom(studioProductSeed(approved())).benefits, /Benefício aprovado A\. Benefício aprovado B\./);
  assert.equal(recordingFieldsFrom(studioProductSeed(approved({ approval: "rascunho" }))).benefits, "");
  assert.equal(recordingFieldsFrom(studioProductSeed(DEMO_PRODUCTS[0])).benefits, "");
});

test("produto oficial incompleto: campos vazios ficam vazios e o app aponta o que falta", () => {
  const numi = productCatalog.get("numi-creme-multifuncional-3em1");
  assert.ok(numi);
  const seed = studioProductSeed(numi);
  assert.equal(seed.description, "");
  assert.equal(seed.howToUse, "");
  assert.deepEqual(missingForRecording(seed), ["descrição", "modo de uso"]);
  const errs = validateRecordingBrief({ ...defaultRecordingBrief(), ...recordingFieldsFrom(seed) });
  assert.ok(errs.description && errs.howToUse, "a aluna completa com informações reais antes de gerar");
});

test("nada é cortado no meio: itens que não cabem ficam de fora inteiros e são contados", () => {
  const r = fitItems(["aaaa", "bbbb", "cccc"], "; ", 12);
  assert.equal(r.text, "aaaa; bbbb");
  assert.equal(r.omitted, 1);
  const long = approved({ description: "x".repeat(590), characteristics: ["característica longa demais para caber"] });
  const seed = studioProductSeed(long);
  assert.equal(seed.description, "x".repeat(590));
  assert.ok(seed.omitted >= 1);
  assert.ok(seed.description.length <= 600);
});

/* ------------------------- Marketplace → Animador ------------------------- */

test("Marketplace → Animador: só nome e características (≤ 300), sem benefícios", () => {
  const p = approved();
  const f = animationFieldsFrom(studioProductSeed(p));
  assert.equal(f.productName, p.name);
  assert.equal(f.productDetails, p.characteristics.join("; "));
  assert.ok(f.productDetails.length <= 300);
  assert.ok(!f.productDetails.includes("Benefício"));
});

test("Marketplace → Animador: ficha e fala aprovada são preservadas; o prompt usa nome e características", () => {
  const sheetAppearance = "a woman in her 30s with short curly hair";
  const parts = { hook: "Olha o que chegou.", body: "Eu uso de manhã, antes do protetor.", cta: "Está no link do vídeo." };
  const before = { ...defaultAnimationBrief(), characterAppearance: sheetAppearance, characterName: "Ficha 1", parts };
  const after = { ...before, ...animationFieldsFrom(studioProductSeed(DEMO_PRODUCTS[1])) };
  assert.equal(after.characterAppearance, sheetAppearance);
  assert.deepEqual(after.parts, parts);
  const out = buildAnimationPrompts(after);
  assert.ok(dialoguePreserved(out));
  assert.equal(out.exactDialogue, exactDialogue(before));
  assert.match(out.fullPrompt, /PRODUCT \(only these facts\): Sérum: Frasco de vidro com conta-gotas; Textura líquida e leve\./);
  assert.equal(dialogueMentions(exactDialogue(after), "Sérum"), false, "a fala não cita o produto → o app avisa, sem reescrever");
  assert.equal(dialogueMentions("Meu SERUM preferido", "Sérum"), true);
});

/* -------------------------------- Recomendações -------------------------------- */

const profile = (over: Partial<Parameters<typeof recommendProducts>[1] & object> = {}) => ({
  wantsToAppear: "nao" as const,
  formats: ["maos_produto" as const],
  experience: "nunca_vendi" as const,
  numiAccess: "nao_sei" as const,
  ...over,
});

test("recomendações: sem onboarding não há recomendação", () => {
  assert.deepEqual(recommendProducts(productCatalog.all(), null), []);
});

test("recomendações: quem não quer aparecer recebe produtos para mãos/avatar; quem quer aparecer, rotina", () => {
  const hands = recommendProducts(productCatalog.all(), profile());
  assert.ok(hands.length > 0);
  assert.ok(hands.every((r) => r.product.formats.includes("maos_produto") || r.reasons.some((x) => /NUMI/.test(x))));
  assert.ok(hands.some((r) => /sem aparecer/.test(r.reasons.join(" "))));
  const appear = recommendProducts(productCatalog.all(), profile({ wantsToAppear: "sim", formats: [] }));
  assert.ok(appear.length > 0);
  assert.ok(appear.every((r) => r.product.formats.includes("aparecendo")));
  assert.ok(appear.every((r) => /aparecendo|rotina/i.test(r.reasons.join(" ") + r.idea)));
});

test("recomendações: nunca indisponível/em breve, nunca promessa de venda, e preço/comissão não mudam nada", () => {
  const all = productCatalog.all();
  const recs = recommendProducts(all, profile());
  assert.ok(recs.every((r) => r.product.availability !== "indisponivel" && r.product.availability !== "em_breve"));
  const text = recs.map((r) => r.reasons.join(" ") + r.idea).join(" ");
  assert.doesNotMatch(text, /vend|comiss|ganh|lucr|R\$/i);
  const rich = all.map((p) => ({ ...p, commission: { value: 99, type: "percentual" as const, source: "x", verifiedAt: "2026-11-01" } }));
  assert.deepEqual(recommendProducts(rich, profile()).map((r) => r.product.id), recs.map((r) => r.product.id));
});

test("recomendações: acesso ao NUMI informado coloca o produto oficial NUMI na lista", () => {
  const recs = recommendProducts(productCatalog.all(), profile({ numiAccess: "sim" }));
  assert.ok(recs.some((r) => r.product.id === "numi-creme-multifuncional-3em1"));
});

/* ---------------------------- Favoritos e Meus produtos ---------------------------- */

test("Salvos e Meus produtos são listas independentes; remover tira só da lista certa", () => {
  let s = initialDemoState();
  s = demoReducer(s, { type: "favorite/toggle", kind: "products", id: "p-serum" });
  s = demoReducer(s, { type: "product/promote", id: "p-serum", on: true });
  s = demoReducer(s, { type: "product/promote", id: "p-batom", on: true });
  assert.deepEqual(s.productsPromoting, ["p-batom", "p-serum"], "mais recente primeiro");
  const again = demoReducer(s, { type: "product/promote", id: "p-batom", on: true });
  assert.equal(again, s, "idempotente");
  s = demoReducer(s, { type: "product/promote", id: "p-serum", on: false });
  assert.deepEqual(s.productsPromoting, ["p-batom"]);
  assert.deepEqual(s.favorites.products, ["p-serum"], "continua salvo");
  assert.equal(demoReducer(s, { type: "product/promote", id: "ID INVÁLIDO", on: true }), s);
});

test("Meus produtos tem limite e começa vazio em snapshots antigos", () => {
  let s = initialDemoState();
  for (let i = 0; i < MY_PRODUCTS_MAX + 5; i++) s = demoReducer(s, { type: "product/promote", id: `p-${i}`, on: true });
  assert.equal(s.productsPromoting.length, MY_PRODUCTS_MAX);
  const snap = JSON.parse(serializeSnapshot({ scenario: "padrao", plan: { mode: "example", profile: null, statusMap: {} }, demo: s }));
  delete snap.demo.productsPromoting;
  const parsed = parseSnapshot(JSON.stringify(snap));
  assert.ok(parsed, "snapshot antigo continua válido");
  assert.deepEqual(parsed.demo.productsPromoting, []);
});

test("semente do Marketplace atravessa o redutor e é consumida uma vez", () => {
  const seed = { from: "Sérum", target: "roteiros" as const, product: studioProductSeed(DEMO_PRODUCTS[1]), style: "unboxing" as const };
  const s = demoReducer(initialDemoState(), { type: "studio/seed", seed });
  assert.equal(s.studioSeed?.product?.name, "Sérum");
  assert.equal(s.studioSeed?.style, "unboxing");
  assert.equal(demoReducer(s, { type: "studio/seed", seed: null }).studioSeed, null);
});

/* ------------------------------ Importação futura ------------------------------ */

test("modelo de planilha da equipe (docs/catalogo/modelo-produtos.csv) é lido e validado", () => {
  const csv = productsFromCsv(readFileSync("docs/catalogo/modelo-produtos.csv", "utf8"));
  assert.deepEqual(csv.errors, []);
  assert.equal(csv.rows.length, 1);
  const prev = previewProductImport([], csv.rows);
  assert.deepEqual(prev.errors, []);
  assert.deepEqual(prev.added, ["exemplo-apague-esta-linha"]);
  const p = prev.products[0];
  assert.equal(p.approval, "rascunho");
  assert.deepEqual(p.characteristics, ["Característica 1", "Característica 2"]);
  assert.equal(p.images[0].alt, "Frasco visto de frente");
});

test("importação: célula vazia não apaga; dado oficial existente só muda com overwrite", () => {
  const current = approved({ id: "numi-x" });
  const csv = productsFromCsv(
    ["id,nome,descricao,modo_de_uso,comissao_valor,comissao_tipo,comissao_fonte,comissao_verificada_em", "numi-x,,,Novo modo de uso.,20,percentual,Painel novo,2026-11-20"].join("\n"),
  );
  assert.deepEqual(csv.errors, []);
  const safe = previewProductImport([current], csv.rows);
  assert.deepEqual(safe.errors, []);
  const kept = safe.products.find((p) => p.id === "numi-x");
  assert.equal(kept?.name, current.name, "vazio não apaga");
  assert.equal(kept?.howToUse, current.howToUse, "oficial não é sobrescrito sem overwrite");
  assert.equal(kept?.commission?.value, 12);
  assert.deepEqual(safe.conflicts.map((c) => c.field).sort(), ["commission", "howToUse"]);
  const forced = previewProductImport([current], csv.rows, { overwrite: true });
  const changed = forced.products.find((p) => p.id === "numi-x");
  assert.equal(changed?.howToUse, "Novo modo de uso.");
  assert.equal(changed?.commission?.value, 20);
  assert.deepEqual(forced.updated, [{ id: "numi-x", fields: ["howToUse", "commission"] }]);
});

test("importação: campo oficial vazio pode ser preenchido sem overwrite; linha inválida bloqueia", () => {
  const numi = productCatalog.get("numi-creme-multifuncional-3em1");
  assert.ok(numi);
  const ok = previewProductImport([numi], productsFromJson({ products: [{ id: numi.id, description: "Descrição oficial enviada pela equipe." }] }).rows);
  assert.deepEqual(ok.conflicts, []);
  assert.deepEqual(ok.updated, [{ id: numi.id, fields: ["description"] }]);
  const bad = previewProductImport([], productsFromJson([{ id: "novo-produto", brand: "NUMI", name: "X", commission: { value: 10, type: "percentual" } }]).rows);
  assert.ok(bad.errors.length > 0, "comissão sem fonte/data é recusada");
  assert.ok(productsFromCsv("nome\nX").errors.length > 0, "sem coluna id");
});
