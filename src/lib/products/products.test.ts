import { test } from "node:test";
import assert from "node:assert/strict";
import raw from "../../content/produtos-oficiais.json" with { type: "json" };
import { DEMO_PRODUCTS } from "../../demo/products.ts";
import { createProductCatalog, productCatalog } from "./index.ts";
import { parseProduct, parseProductsFile, productGaps } from "./schema.ts";
import { AVAILABILITY_LABEL, TO_CONFIRM, commercialInfo, isPromotable, originLabel, visibleBenefits } from "./display.ts";
import { DEFAULT_PRODUCT_FILTERS, activeProductFilterCount, filterProductList, pickInOrder } from "./filters.ts";
import type { Product } from "./types.ts";

const official = (over: Partial<Product> = {}): Product => ({
  id: "numi-teste",
  brand: "NUMI",
  name: "Produto de teste",
  category: "corpo",
  origin: "oficial",
  approval: "aprovado",
  availability: "disponivel",
  isNew: false,
  images: [],
  shortDescription: "",
  description: "Descrição de teste do produto oficial.",
  howToUse: "Aplique na pele limpa.",
  characteristics: ["Frasco com válvula"],
  approvedBenefits: ["Benefício aprovado de teste"],
  restrictions: ["Não usar em feridas"],
  price: { amount: 89.9, currency: "BRL", verifiedAt: "2026-11-01" },
  commission: { value: 15, type: "percentual", source: "Painel de teste", verifiedAt: "2026-11-01" },
  affiliation: { status: "disponivel", conditions: "Condição de teste.", affiliateUrl: "https://example.com/afiliacao" },
  productUrl: "https://example.com/produto",
  materialIds: [],
  lessonIds: [],
  contentTags: [],
  formats: ["maos_produto"],
  ...over,
});

/* ------------------------------ Catálogo oficial ------------------------------ */

test("arquivo oficial é válido, só tem produtos oficiais e nenhum dado comercial inventado", () => {
  const r = parseProductsFile(raw, { requireOfficial: true });
  assert.ok(r.ok, r.ok ? "" : r.errors.join("\n"));
  for (const p of r.file.products) {
    assert.equal(p.origin, "oficial");
    // Até a equipe aprovar: sem preço, comissão, link nem benefício.
    if (p.approval !== "aprovado") {
      assert.equal(p.price, null);
      assert.equal(p.commission, null);
      assert.equal(p.productUrl, null);
      assert.equal(p.affiliation.affiliateUrl, null);
      assert.deepEqual(p.approvedBenefits, []);
    }
  }
});

test("produtos demonstrativos passam no schema, não usam a marca NUMI e não têm dado comercial", () => {
  assert.ok(DEMO_PRODUCTS.length >= 4);
  for (const p of DEMO_PRODUCTS) {
    const r = parseProduct(p);
    assert.deepEqual(r.errors, [], p.id);
    assert.equal(p.origin, "demonstrativo");
    assert.doesNotMatch(p.brand, /numi/i);
    assert.equal(commercialInfo(p).price.label, TO_CONFIRM);
    assert.equal(commercialInfo(p).commission.label, TO_CONFIRM);
    assert.equal(originLabel(p).demo, true);
  }
});

test("IDs estáveis: os IDs já usados por favoritos e cenários continuam existindo", () => {
  for (const id of ["p-hidratante", "p-serum", "p-batom", "p-base", "p-mascara-capilar", "p-oleo-corporal", "numi-creme-multifuncional-3em1"]) {
    assert.ok(productCatalog.get(id), id);
  }
  const ids = productCatalog.all().map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("schema recusa demonstrativo com preço, comissão, link, benefício ou marca NUMI", () => {
  const demo = DEMO_PRODUCTS[0];
  assert.ok(parseProduct({ ...demo, price: { amount: 10, currency: "BRL", verifiedAt: "2026-11-01" } }).errors.some((e) => /preço/.test(e)));
  assert.ok(parseProduct({ ...demo, commission: { value: 10, type: "percentual", source: "x", verifiedAt: "2026-11-01" } }).errors.some((e) => /comissão/.test(e)));
  assert.ok(parseProduct({ ...demo, productUrl: "https://example.com" }).errors.some((e) => /link/.test(e)));
  assert.ok(parseProduct({ ...demo, approvedBenefits: ["x"] }).errors.some((e) => /benefícios/.test(e)));
  assert.ok(parseProduct({ ...demo, brand: "NUMI" }).errors.some((e) => /NUMI/.test(e)));
});

test("schema: comissão exige fonte e data; percentual até 100; preço em BRL com data", () => {
  const base = official();
  assert.ok(parseProduct({ ...base, commission: { value: 15, type: "percentual", source: "", verifiedAt: "2026-11-01" } }).errors.length);
  assert.ok(parseProduct({ ...base, commission: { value: 15, type: "percentual", source: "Painel", verifiedAt: "ontem" } }).errors.length);
  assert.ok(parseProduct({ ...base, commission: { value: 150, type: "percentual", source: "Painel", verifiedAt: "2026-11-01" } }).errors.length);
  assert.ok(parseProduct({ ...base, price: { amount: 10, currency: "USD", verifiedAt: "2026-11-01" } }).errors.length);
  assert.ok(parseProduct({ ...base, price: { amount: 0, currency: "BRL", verifiedAt: "2026-11-01" } }).errors.length);
  assert.deepEqual(parseProduct(base).errors, []);
});

test("schema: só imagem local em /public, link só https e ID estável no formato", () => {
  const base = official();
  assert.ok(parseProduct({ ...base, images: [{ src: "https://cdn.exemplo.com/a.jpg", alt: "a", kind: "foto" }] }).errors.length);
  assert.ok(parseProduct({ ...base, images: [{ src: "/produtos/video.mp4", alt: "a", kind: "foto" }] }).errors.length);
  assert.ok(parseProduct({ ...base, images: [{ src: "/produtos/../x.jpg", alt: "a", kind: "foto" }] }).errors.length);
  assert.ok(parseProduct({ ...base, images: [{ src: "/produtos/a.jpg", alt: "", kind: "foto" }] }).errors.length);
  assert.ok(parseProduct({ ...base, productUrl: "http://example.com" }).errors.length);
  assert.ok(parseProduct({ ...base, productUrl: "javascript:alert(1)" }).errors.length);
  assert.ok(parseProduct({ ...base, id: "Produto NUMI" }).errors.length);
  assert.deepEqual(parseProduct({ ...base, images: [{ src: "/produtos/numi-1.jpg", alt: "Frasco", kind: "foto" }] }).errors, []);
});

test("arquivo: id repetido e origin demonstrativo no oficial são erro", () => {
  const p = official();
  const dup = parseProductsFile({ version: 1, updatedAt: "2026-11-22", products: [p, p] });
  assert.equal(dup.ok, false);
  const demo = parseProductsFile({ version: 1, updatedAt: "2026-11-22", products: [DEMO_PRODUCTS[0]] }, { requireOfficial: true });
  assert.equal(demo.ok, false);
});

/* ------------------------- Informações comerciais ------------------------- */

test("comercial: oficial APROVADO mostra preço, comissão (com fonte e data), afiliação e links", () => {
  const c = commercialInfo(official());
  assert.equal(c.price.label, "R$ 89,90");
  assert.equal(c.commission.label, "15%");
  assert.match(c.commission.detail ?? "", /01\/11\/2026 · Fonte: Painel de teste/);
  assert.equal(c.affiliation.label, "Afiliação aberta");
  assert.equal(c.affiliateUrl, "https://example.com/afiliacao");
  assert.equal(c.productUrl, "https://example.com/produto");
});

test("comercial: rascunho/em revisão NUNCA exibe preço, comissão, links ou benefícios, mesmo se preenchidos", () => {
  for (const approval of ["rascunho", "em_revisao"] as const) {
    const p = official({ approval });
    const c = commercialInfo(p);
    assert.equal(c.price.label, TO_CONFIRM);
    assert.equal(c.commission.label, TO_CONFIRM);
    assert.equal(c.affiliation.label, TO_CONFIRM);
    assert.equal(c.affiliateUrl, null);
    assert.equal(c.productUrl, null);
    assert.equal(c.conditions, "");
    assert.deepEqual(visibleBenefits(p), []);
  }
});

test("comercial: aprovado sem comissão/preço cadastrados mostra “A confirmar” (sem número fictício)", () => {
  const c = commercialInfo(official({ price: null, commission: null, affiliation: { status: "a_confirmar", conditions: "", affiliateUrl: null }, productUrl: null }));
  assert.equal(c.price.label, TO_CONFIRM);
  assert.equal(c.commission.label, TO_CONFIRM);
  assert.equal(c.affiliation.label, TO_CONFIRM);
  assert.equal(c.price.confirmed, false);
});

test("comercial: valor fixo formatado em reais", () => {
  const c = commercialInfo(official({ commission: { value: 1234.5, type: "valor_fixo", source: "Painel", verifiedAt: "2026-11-01" } }));
  assert.equal(c.commission.label, "R$ 1.234,50");
});

/* ---------------------- Disponibilidade e incompletos ---------------------- */

test("disponibilidade: rótulos para todos os estados e indisponível não é “promovível”", () => {
  assert.deepEqual(Object.keys(AVAILABILITY_LABEL).sort(), ["a_confirmar", "disponivel", "em_breve", "indisponivel"]);
  assert.equal(isPromotable(official({ availability: "disponivel" })), true);
  assert.equal(isPromotable(official({ availability: "a_confirmar" })), true);
  assert.equal(isPromotable(official({ availability: "em_breve" })), false);
  assert.equal(isPromotable(official({ availability: "indisponivel" })), false);
});

test("produto incompleto: lista de pendências para a equipe e selo “cadastro em preenchimento”", () => {
  const numi = productCatalog.get("numi-creme-multifuncional-3em1");
  assert.ok(numi);
  const gaps = productGaps(numi);
  for (const g of ["descrição", "modo de uso", "preço", "comissão (com fonte e data)", "aprovação da equipe"]) assert.ok(gaps.includes(g), g);
  assert.match(originLabel(numi).label, /cadastro em preenchimento/);
  assert.deepEqual(productGaps(official({ images: [{ src: "/p/a.jpg", alt: "a", kind: "foto" }], shortDescription: "x" })), []);
});

/* --------------------------------- Catálogo --------------------------------- */

test("catálogo: oficiais primeiro; um demonstrativo nunca substitui oficial com o mesmo id", () => {
  const off = official({ id: "p-serum" });
  const cat = createProductCatalog([off], DEMO_PRODUCTS);
  assert.equal(cat.get("p-serum")?.origin, "oficial");
  assert.equal(cat.all()[0].id, "p-serum");
  assert.equal(cat.all().filter((p) => p.id === "p-serum").length, 1);
  assert.deepEqual(createProductCatalog([off], null).demo(), []);
});

test("catálogo: Produtos NUMI só traz oficiais da marca NUMI", () => {
  assert.ok(productCatalog.numi().length >= 1);
  assert.ok(productCatalog.numi().every((p) => p.origin === "oficial" && p.brand === "NUMI"));
});

/* ----------------------------- Busca e filtros ----------------------------- */

test("busca ignora acento e maiúsculas e procura em nome, descrição e características", () => {
  const f = (query: string) => filterProductList(DEMO_PRODUCTS, { ...DEFAULT_PRODUCT_FILTERS, query }).map((p) => p.id);
  assert.deepEqual(f("SERUM"), ["p-serum"]);
  assert.deepEqual(f("conta-gotas"), ["p-serum"]);
  assert.deepEqual(f("mascara capilar"), ["p-mascara-capilar"]);
  assert.deepEqual(f("xyz inexistente"), []);
});

test("filtros por categoria, origem, disponibilidade, salvos e Meus produtos", () => {
  const all = [...productCatalog.all()];
  const f = (o: Partial<typeof DEFAULT_PRODUCT_FILTERS>) => filterProductList(all, { ...DEFAULT_PRODUCT_FILTERS, ...o });
  assert.ok(f({ category: "skincare" }).every((p) => p.category === "skincare"));
  assert.ok(f({ origin: "oficial" }).every((p) => p.origin === "oficial"));
  assert.ok(f({ origin: "demonstrativo" }).every((p) => p.origin === "demonstrativo"));
  assert.deepEqual(f({ availability: "indisponivel" }).map((p) => p.id), ["p-oleo-corporal"]);
  assert.deepEqual(f({ list: "salvos", saved: ["p-batom"] }).map((p) => p.id), ["p-batom"]);
  assert.deepEqual(f({ list: "meus", mine: ["p-serum", "p-base"] }).map((p) => p.id), ["p-serum", "p-base"]);
  assert.deepEqual(f({ list: "meus", mine: [] }), []);
  assert.equal(activeProductFilterCount({ ...DEFAULT_PRODUCT_FILTERS, category: "corpo", origin: "oficial" }), 2);
  assert.deepEqual(pickInOrder(all, ["p-base", "nao-existe", "p-serum"]).map((p) => p.id), ["p-base", "p-serum"]);
});
