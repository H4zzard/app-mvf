import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { STUDIO_MAX_CHARACTERS, demoReducer, initialDemoState } from "./store.ts";
import { buildCharacterPrompt, defaultCharacterBrief, makeCharacterSheet } from "../studio/character.ts";
import { parseSnapshot, serializeSnapshot } from "./snapshot.ts";

const sheet = (name: string) => {
  const b = { ...defaultCharacterBrief(), name };
  return makeCharacterSheet(b, buildCharacterPrompt(b));
};

describe("Estúdio no estado da demo (memória)", () => {
  test("salvar ficha: sem duplicar, mais recente primeiro, com limite", () => {
    let s = demoReducer(initialDemoState(), { type: "studio/character-save", sheet: sheet("A") });
    s = demoReducer(s, { type: "studio/character-save", sheet: sheet("B") });
    s = demoReducer(s, { type: "studio/character-save", sheet: sheet("A") });
    assert.deepEqual(s.studioCharacters.map((c) => c.name), ["A", "B"]);
    s = demoReducer(s, { type: "studio/character-remove", id: sheet("B").id });
    assert.deepEqual(s.studioCharacters.map((c) => c.name), ["A"]);
    let full = initialDemoState();
    for (let i = 0; i < STUDIO_MAX_CHARACTERS + 3; i++) full = demoReducer(full, { type: "studio/character-save", sheet: sheet(`P${i}`) });
    assert.equal(full.studioCharacters.length, STUDIO_MAX_CHARACTERS);
  });

  test("rascunhos por ferramenta se combinam sem apagar os outros", () => {
    const personagem = { brief: defaultCharacterBrief(), advanced: true, output: null, outputKey: null };
    let s = demoReducer(initialDemoState(), { type: "studio/draft", draft: { personagem } });
    s = demoReducer(s, { type: "studio/draft", draft: { roteiros: undefined } });
    assert.equal(s.studioDrafts.personagem?.advanced, true);
  });

  test("semente para o Animador carrega a ficha; reset limpa tudo", () => {
    let s = demoReducer(initialDemoState(), { type: "studio/seed", seed: { from: "Bia", target: "animar", characterId: "ficha-x" } });
    assert.equal(s.studioSeed?.target, "animar");
    s = demoReducer(s, { type: "reset", state: initialDemoState() });
    assert.equal(s.studioSeed, null);
    assert.deepEqual(s.studioDrafts, {});
  });

  test("restauração opcional não guarda fichas nem rascunhos do Estúdio", () => {
    const demo = demoReducer(initialDemoState(), { type: "studio/character-save", sheet: sheet("A") });
    const raw = serializeSnapshot({ scenario: "padrao", plan: { mode: "example", profile: null, statusMap: {} }, demo });
    const back = parseSnapshot(raw);
    assert.ok(back);
    assert.deepEqual(back.demo.studioCharacters, []);
    assert.deepEqual(back.demo.studioDrafts, {});
  });
});
