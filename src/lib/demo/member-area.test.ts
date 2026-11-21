import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MEMBER_ASSETS, MEMBER_MODULES, MEMBER_RAILS, moduleOfLesson, recommendModules } from "../../demo/member-area.ts";
import { DEMO_LESSONS } from "../../demo/lessons.ts";
import { EXAMPLE_PROFILE } from "../../demo/plan.ts";
import type { OnboardingProfile } from "@/types";

describe("área de membros: mapeamento de assets e aulas", () => {
  test("toda capa, banner e logo existem em public/", () => {
    for (const path of [...MEMBER_MODULES.map((m) => m.cover), MEMBER_ASSETS.banner, MEMBER_ASSETS.logo]) {
      assert.ok(existsSync(join("public", path)), `arquivo ausente: ${path}`);
    }
  });

  test("IDs de módulo únicos e cada módulo em um trilho existente", () => {
    assert.equal(new Set(MEMBER_MODULES.map((m) => m.id)).size, MEMBER_MODULES.length);
    const rails = new Set(MEMBER_RAILS.map((r) => r.id));
    assert.ok(MEMBER_MODULES.every((m) => rails.has(m.railId)));
    assert.ok(MEMBER_RAILS.every((r) => MEMBER_MODULES.some((m) => m.railId === r.id)), "trilho vazio");
  });

  test("cada aula de exemplo pertence a exatamente um módulo", () => {
    const ids = new Set(DEMO_LESSONS.map((l) => l.id));
    const mapped = MEMBER_MODULES.flatMap((m) => m.lessonIds);
    assert.equal(mapped.length, new Set(mapped).size, "aula em dois módulos");
    assert.ok(mapped.every((id) => ids.has(id)), "ID de aula inexistente");
    for (const l of DEMO_LESSONS) assert.ok(moduleOfLesson(l.id), `aula sem módulo: ${l.id}`);
  });
});

describe("área de membros: recomendação", () => {
  test("sem perfil: trilho de primeiros passos", () => {
    const r = recommendModules(null);
    assert.ok(r.modules.every((m) => m.railId === "primeiros-passos"));
  });

  test("perfil sem aparecer + avatar recebe módulos de avatar e sem aparecer, sem repetir", () => {
    const r = recommendModules(EXAMPLE_PROFILE);
    const ids = r.modules.map((m) => m.id);
    assert.equal(ids.length, new Set(ids).size);
    assert.ok(ids.includes("m-influenciador-digital") && ids.includes("m-venda-sem-aparecer"));
    assert.ok(!ids.includes("m-venda-sua-imagem"));
    assert.match(r.reason, /avatar/);
    assert.deepEqual(recommendModules(EXAMPLE_PROFILE), r, "determinístico");
  });

  test("quem quer aparecer recebe o módulo de usar a própria imagem", () => {
    const p: OnboardingProfile = { ...EXAMPLE_PROFILE, wantsToAppear: "sim", formats: [], experience: "ja_vendi" };
    const ids = recommendModules(p).modules.map((m) => m.id);
    assert.ok(ids.includes("m-venda-sua-imagem"));
    assert.ok(!ids.includes("m-primeiros-passos"));
  });

  test("bloqueio em roteiros coloca o Roteirista invisível primeiro", () => {
    const p: OnboardingProfile = { ...EXAMPLE_PROFILE, mainBlocker: "roteiros" };
    assert.equal(recommendModules(p).modules[0].id, "m-roteirista-invisivel");
  });
});
