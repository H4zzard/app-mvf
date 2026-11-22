import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildCharacterPrompt, defaultCharacterBrief, makeCharacterSheet, realismFor, surpriseBrief, validateCharacterBrief } from "./character.ts";
import type { CharacterBrief } from "./contracts.ts";

const base = (): CharacterBrief => defaultCharacterBrief();

describe("Criar Personagem: prompt de imagem (texto)", () => {
  test("padrão é válido e gera prompt em inglês, vertical, estático e sem fala", () => {
    assert.deepEqual(validateCharacterBrief(base()), {});
    const out = buildCharacterPrompt(base());
    assert.equal(out.language, "en");
    assert.match(out.visualPrompt, /^Photorealistic candid UGC photo, vertical 9:16 format\./);
    assert.match(out.visualPrompt, /A 28-year-old woman with tan light-brown skin/);
    assert.match(out.visualPrompt, /no dialogue/);
    assert.ok(!/http|www\./i.test(out.visualPrompt));
  });

  test("JSON válido e coerente com o prompt", () => {
    const out = buildCharacterPrompt(base());
    const json = JSON.parse(JSON.stringify(out.structuredAttributes));
    assert.equal(json.schema, "mvf.character.v1");
    assert.equal(json.aspect_ratio, "vertical 9:16");
    assert.equal(json.subject.age, 28);
    assert.ok(out.visualPrompt.includes(json.scene.setting));
    assert.ok(out.visualPrompt.includes(json.wardrobe.outfit));
  });

  test("“✎ LIVRE” usa o texto da aluna; livre vazio é erro", () => {
    const b = { ...base(), setting: { preset: "livre", free: "a bright pastel bakery counter" } };
    assert.ok(buildCharacterPrompt(b).visualPrompt.includes("a bright pastel bakery counter"));
    const bad = { ...base(), lighting: { preset: "livre", free: "  " } };
    assert.ok(validateCharacterBrief(bad).lighting);
    assert.throws(() => buildCharacterPrompt(bad));
  });

  test("idade adulta obrigatória", () => {
    assert.ok(validateCharacterBrief({ ...base(), age: 17 }).age);
    assert.ok(validateCharacterBrief({ ...base(), age: 81 }).age);
  });

  test("imagem de referência: preserva identidade, não descreve traços e não alega análise", () => {
    const b = { ...base(), hasReferenceImage: true, age: 5, skinTone: { preset: "livre", free: "" } };
    assert.deepEqual(validateCharacterBrief(b), {});
    const out = buildCharacterPrompt(b);
    assert.match(out.visualPrompt, /attached reference image/);
    assert.ok(!/year-old/.test(out.visualPrompt));
    assert.ok(!/analy[sz]ed|I can see|in your photo/i.test(out.visualPrompt));
    assert.equal(out.structuredAttributes.use_reference_image, true);
    assert.ok(out.notes.some((n) => /autorização/.test(n)));
  });

  test("realismo contextual: idade, cabelo, tecido e cenário", () => {
    const d = { ...base(), realism: "detalhado" as const, age: 55, hairTexture: { preset: "cacheado" }, fabric: { preset: "linho" }, setting: { preset: "cozinha" } };
    const r = realismFor(d);
    assert.ok(r.skin.some((s) => /wrinkles/.test(s)));
    assert.ok(r.details.some((s) => /curls/.test(s)));
    assert.ok(r.details.some((s) => /linen/.test(s)));
    assert.ok(r.environment.some((s) => /counter/.test(s)));
    const p = realismFor(base());
    assert.equal(p.environment.length, 0);
    assert.ok(!p.skin.some((s) => /wrinkles/.test(s)));
  });

  test("textos avançados substituem o realismo automático", () => {
    const r = realismFor({ ...base(), skinOverride: "freckles across the nose", detailOverride: "chipped nail polish" });
    assert.deepEqual(r.skin, ["freckles across the nose"]);
    assert.deepEqual(r.details, ["chipped nail polish"]);
  });

  test("determinístico; ficha com id estável e versão do schema", () => {
    assert.deepEqual(buildCharacterPrompt(base()), buildCharacterPrompt(base()));
    const b = { ...base(), name: "Bia" };
    const s1 = makeCharacterSheet(b, buildCharacterPrompt(b));
    const s2 = makeCharacterSheet(b, buildCharacterPrompt(b));
    assert.equal(s1.id, s2.id);
    assert.match(s1.id, /^ficha-[a-z0-9]+$/);
    assert.equal(s1.schemaVersion, 1);
    assert.equal(s1.name, "Bia");
    assert.ok(s1.appearance.includes("28-year-old"));
  });

  test("Surpreenda-me: mesma semente → mesma sugestão, sempre válida e sem “livre”", () => {
    for (const seed of [1, 42, 999, 123456]) {
      const s = surpriseBrief(base(), seed);
      assert.deepEqual(s, surpriseBrief(base(), seed));
      assert.deepEqual(validateCharacterBrief(s), {});
      assert.ok(!JSON.stringify(s).includes('"livre"'));
    }
    assert.notDeepEqual(surpriseBrief(base(), 1), surpriseBrief(base(), 2));
  });
});
