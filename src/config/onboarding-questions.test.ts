import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { MultiQuestion } from "./onboarding-questions.ts";
import {
  QUESTIONS,
  getQuestion,
  getVisibleQuestions,
  sanitizeAnswers,
  toggleMultiValue,
  validateProfile,
} from "./onboarding-questions.ts";
import { EXAMPLE_PROFILES } from "../demo/example-profiles.ts";

const formats = getQuestion("formatos") as MultiQuestion;

describe("perguntas do onboarding", () => {
  test("11 perguntas com IDs únicos e só o nome é opcional", () => {
    assert.equal(QUESTIONS.length, 11);
    assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, 11);
    assert.deepEqual(QUESTIONS.filter((q) => q.optional).map((q) => q.id), ["nome"]);
  });

  test("pergunta de formato só aparece para “não” ou “talvez”", () => {
    const has = (a: Parameters<typeof getVisibleQuestions>[0]) => getVisibleQuestions(a).some((q) => q.id === "formatos");
    assert.equal(has({ wantsToAppear: "sim" }), false);
    assert.equal(has({ wantsToAppear: "nao" }), true);
    assert.equal(has({ wantsToAppear: "talvez" }), true);
    assert.equal(has({}), false);
  });

  test("mudar para “aparecer = sim” descarta formatos (sem contradição)", () => {
    const a = sanitizeAnswers({ wantsToAppear: "sim", formats: ["avatar_ia"] });
    assert.equal(a.formats, undefined);
  });

  test("multisseleção: máximo de 2, explorar é exclusivo, desmarcar funciona", () => {
    let v: string[] = [];
    v = toggleMultiValue(formats, v, "avatar_ia");
    v = toggleMultiValue(formats, v, "maos_produto");
    v = toggleMultiValue(formats, v, "narracao_imagens"); // ignorado (máx. 2)
    assert.deepEqual(v, ["avatar_ia", "maos_produto"]);
    v = toggleMultiValue(formats, v, "quero_explorar");
    assert.deepEqual(v, ["quero_explorar"]);
    v = toggleMultiValue(formats, v, "avatar_ia");
    assert.deepEqual(v, ["avatar_ia"]);
    v = toggleMultiValue(formats, v, "avatar_ia");
    assert.deepEqual(v, []);
  });

  test("perfil incompleto é rejeitado com a pergunta faltante", () => {
    const r = validateProfile({ experience: "ja_vendi" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.some((e) => e.questionId === "conta"));
  });

  test("valores fora da lista e combinações proibidas são rejeitados", () => {
    const base = EXAMPLE_PROFILES[0].profile;
    const bad = validateProfile({ ...base, dailyMinutes: "45" as never });
    assert.equal(bad.ok, false);
    const combo = validateProfile({ ...base, formats: ["quero_explorar", "avatar_ia"] });
    assert.equal(combo.ok, false);
    const tooMany = validateProfile({ ...base, formats: ["avatar_ia", "maos_produto", "narracao_imagens"] });
    assert.equal(tooMany.ok, false);
  });

  test("os cinco perfis de exemplo são válidos; nome é aparado e opcional", () => {
    for (const e of EXAMPLE_PROFILES) assert.equal(validateProfile(e.profile).ok, true, e.key);
    const r = validateProfile({ ...EXAMPLE_PROFILES[0].profile, preferredName: "  Ana   Paula " });
    assert.ok(r.ok && r.profile.preferredName === "Ana Paula");
    const empty = validateProfile({ ...EXAMPLE_PROFILES[0].profile, preferredName: "   " });
    assert.ok(empty.ok && empty.profile.preferredName === undefined);
  });
});
