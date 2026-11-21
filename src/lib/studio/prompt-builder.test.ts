import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildStudioPrompt, splitDuration, validateStudioInput, type StudioInput } from "./prompt-builder.ts";
import { STUDIO_TEMPLATES } from "../../demo/studio-templates.ts";

const BASE: StudioInput = {
  language: "pt",
  format: "avatar",
  character: "natural",
  setting: "penteadeira",
  objective: "demonstrar",
  tone: "acolhedor",
  productName: "Hidratante facial",
  templateId: "tpl-gancho-demo-cta",
  durationSec: 30,
};

describe("Estúdio IA: gerador determinístico", () => {
  test("mesma entrada → mesmo texto", () => {
    assert.deepEqual(buildStudioPrompt(BASE, STUDIO_TEMPLATES), buildStudioPrompt({ ...BASE }, STUDIO_TEMPLATES));
  });

  test("uma cena por parte do modelo, durações somam o total", () => {
    for (const t of STUDIO_TEMPLATES) {
      for (const d of [15, 30, 45] as const) {
        const out = buildStudioPrompt({ ...BASE, templateId: t.id, durationSec: d }, STUDIO_TEMPLATES);
        assert.equal(out.scenes.length, t.beats.length);
        assert.equal(out.scenes.reduce((s, x) => s + x.durationSec, 0), d);
      }
    }
  });

  test("frases do prompt começam com maiúscula", () => {
    const out = buildStudioPrompt(BASE, STUDIO_TEMPLATES);
    for (const s of out.scenes) assert.ok(!/\. [a-zà-ú]/.test(s.flowPrompt), s.flowPrompt);
  });

  test("produto entra no texto; mãos e produto nunca descrevem rosto", () => {
    const out = buildStudioPrompt({ ...BASE, format: "maos_produto" }, STUDIO_TEMPLATES);
    assert.ok(out.fullText.includes("Hidratante facial"));
    assert.ok(out.scenes.every((s) => s.flowPrompt.includes("sem rosto visível")));
    assert.ok(!out.fullText.includes("{produto}"));
  });

  test("inglês gera texto em inglês; gancho substitui a primeira fala", () => {
    const out = buildStudioPrompt({ ...BASE, language: "en", hook: "Wait for the texture." }, STUDIO_TEMPLATES);
    assert.ok(out.fullText.startsWith("Script to"));
    assert.equal(out.scenes[0].narration, "Wait for the texture.");
    assert.ok(out.scenes[0].flowPrompt.includes("Vertical 9:16"));
  });

  test("sempre inclui o checklist sem promessas e o aviso de geração externa", () => {
    const out = buildStudioPrompt(BASE, STUDIO_TEMPLATES);
    assert.ok(out.fullText.includes("Não prometa resultados"));
    assert.ok(out.fullText.includes("Google Flow"));
  });

  test("validação: produto obrigatório, limites e modelo existente", () => {
    assert.deepEqual(validateStudioInput(BASE, STUDIO_TEMPLATES), {});
    assert.ok(validateStudioInput({ ...BASE, productName: " a " }, STUDIO_TEMPLATES).productName);
    assert.ok(validateStudioInput({ ...BASE, productName: "x".repeat(61) }, STUDIO_TEMPLATES).productName);
    assert.ok(validateStudioInput({ ...BASE, templateId: "nao-existe" }, STUDIO_TEMPLATES).templateId);
    assert.ok(validateStudioInput({ ...BASE, hook: "x".repeat(141) }, STUDIO_TEMPLATES).hook);
    assert.throws(() => buildStudioPrompt({ ...BASE, productName: "" }, STUDIO_TEMPLATES));
  });

  test("splitDuration", () => {
    assert.deepEqual(splitDuration(30, 4), [7, 7, 7, 9]);
    assert.deepEqual(splitDuration(15, 3), [5, 5, 5]);
    assert.deepEqual(splitDuration(10, 0), []);
  });
});
