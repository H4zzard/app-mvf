import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { allTakesText, buildAnimationPrompts, defaultAnimationBrief, dialoguePreserved, splitPastedScript, tokens, validateAnimationBrief } from "./animation.ts";
import type { AnimationBrief } from "./contracts.ts";
import { SCRIPT_LIBRARY, fillProduct, searchLibrary } from "../../demo/studio-scripts.ts";

const LONG =
  "Eu uso esse sérum todas as manhãs, logo depois de lavar o rosto, e antes do protetor solar, porque assim a pele fica pronta para a maquiagem e eu não preciso esperar muito tempo para continuar a rotina.";

const brief = (over: Partial<AnimationBrief> = {}): AnimationBrief => ({
  ...defaultAnimationBrief(),
  characterAppearance: "a 28-year-old woman with tan light-brown skin, wearing a plain t-shirt",
  parts: {
    hook: "Você precisa ver como eu uso o sérum!",
    body: `Olha a textura: “leve”, quase água. ${LONG} Depois, espero secar.`,
    cta: "Quer a rotina completa? Comenta aqui 💬",
  },
  ...over,
});

describe("Animar Personagem: prompts de vídeo (texto) com fala intacta", () => {
  test("a fala dos takes reproduz exatamente o texto aprovado", () => {
    for (const takeLength of [4, 6, 8] as const) {
      for (const pace of ["calma", "natural", "animada"] as const) {
        const out = buildAnimationPrompts(brief({ takeLength, pace }));
        assert.ok(out.takes.length > 1);
        assert.ok(dialoguePreserved(out), `${takeLength}/${pace}`);
        for (const t of out.takes) assert.ok(out.exactDialogue.includes(t.dialogue) || t.dialogue.split(" ").every((w) => out.exactDialogue.includes(w)));
      }
    }
  });

  test("pontuação, aspas e emoji preservados; take respeita o limite de fala", () => {
    const out = buildAnimationPrompts(brief());
    const all = out.takes.map((t) => t.dialogue).join(" ");
    assert.ok(all.includes("“leve”,"));
    assert.ok(all.includes("💬"));
    for (const t of out.takes) assert.ok(t.speechSeconds <= t.intendedSeconds * 0.8 + 0.05, `${t.speechSeconds} > ${t.intendedSeconds}`);
  });

  test("frase longa é dividida com aviso, nunca truncada", () => {
    const out = buildAnimationPrompts(brief({ takeLength: 4 }));
    assert.ok(out.warnings.some((w) => /frase longa/.test(w)));
    assert.equal(tokens(out.takes.map((t) => t.dialogue).join(" ")).length, tokens(out.exactDialogue).length);
  });

  test("direção em inglês com a fala exata em português", () => {
    const out = buildAnimationPrompts(brief());
    assert.match(out.takes[0].prompt, /SPOKEN DIALOGUE \(in Brazilian Portuguese/);
    assert.ok(out.takes[0].prompt.includes("“Você precisa ver como eu uso o sérum!”"));
    assert.match(out.takes[0].prompt, /do not translate, rewrite/);
    assert.ok(out.fullPrompt.includes(out.exactDialogue));
  });

  test("mudar a direção e regenerar não muda o diálogo", () => {
    const a = buildAnimationPrompts(brief());
    const b = buildAnimationPrompts(brief({ camera: { preset: "pushin" }, atmosphere: { preset: "livre", free: "late-night cozy chat" }, voiceTone: { preset: "animado" } }));
    assert.deepEqual(a.takes.map((t) => t.dialogue), b.takes.map((t) => t.dialogue));
    assert.notEqual(a.takes[0].prompt, b.takes[0].prompt);
  });

  test("partes desligadas saem da fala; ordem gancho → desenvolvimento → CTA", () => {
    const out = buildAnimationPrompts(brief({ enabled: { hook: true, body: false, cta: true } }));
    assert.equal(out.exactDialogue, "Você precisa ver como eu uso o sérum!\n\nQuer a rotina completa? Comenta aqui 💬");
    assert.match(out.takes[0].objective, /^Gancho/);
    assert.match(out.takes[out.takes.length - 1].objective, /^CTA/);
  });

  test("copiar tudo, teleprompter e continuidade", () => {
    const out = buildAnimationPrompts(brief());
    const all = allTakesText(out);
    assert.ok(all.includes("Prompt 1\n") && all.includes("Prompt 2\n"));
    assert.ok(out.teleprompter.startsWith("[Take 1 · Gancho]"));
    assert.ok(out.continuityNotes.some((n) => /MESMA imagem/.test(n)));
    assert.ok(out.takes.slice(1).every((t) => /Continue exactly from/.test(t.prompt)));
  });

  test("validação: precisa de personagem e de fala", () => {
    const e = validateAnimationBrief({ ...defaultAnimationBrief() });
    assert.ok(e.character && e.dialogue);
    assert.deepEqual(validateAnimationBrief(brief({ characterAppearance: "", readyImage: true })), {});
    assert.ok(validateAnimationBrief(brief({ gaze: { preset: "livre", free: "" } })).gaze);
  });

  test("“Já tenho imagem pronta”: só texto, sem receber arquivo", () => {
    const out = buildAnimationPrompts(brief({ characterAppearance: "", readyImage: true }));
    assert.match(out.takes[0].prompt, /CHARACTER: the character shown in the supplied reference image\./);
    assert.ok(!/upload|analy[sz]e/i.test(out.fullPrompt));
  });

  test("roteiro colado é separado sem alterar o texto", () => {
    const txt = "Você já errou isso? Eu errava. Passo pouco produto e espalho. Comenta se você também faz assim!";
    const p = splitPastedScript(txt);
    assert.equal(p.hook, "Você já errou isso?");
    assert.equal(p.cta, "Comenta se você também faz assim!");
    assert.deepEqual(tokens([p.hook, p.body, p.cta].join(" ")), tokens(txt));
    const para = splitPastedScript("Gancho aqui.\n\nCorpo um.\n\nCorpo dois.\n\nLink na bio.");
    assert.equal(para.hook, "Gancho aqui.");
    assert.equal(para.body, "Corpo um.\n\nCorpo dois.");
    assert.equal(para.cta, "Link na bio.");
  });

  test("biblioteca: exemplos próprios, com produto preenchido e busca", () => {
    assert.ok(SCRIPT_LIBRARY.length >= 5);
    assert.ok(SCRIPT_LIBRARY.every((s) => s.source === "exemplo" && s.parts.hook && s.parts.cta));
    const filled = fillProduct(SCRIPT_LIBRARY[0].parts, "Sérum");
    assert.ok(!JSON.stringify(filled).includes("{produto}"));
    assert.ok(searchLibrary("unboxing", "").length >= 1);
    assert.equal(searchLibrary("", "Rotina").every((s) => s.category === "Rotina"), true);
  });
});
