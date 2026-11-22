import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import raw from "../../content/catalogo-oficial.json" with { type: "json" };
import { parseCatalogFile } from "./schema.ts";
import { buildCatalog, createCatalogApi } from "./build.ts";
import { playbackState } from "./media.ts";
import { profileTags } from "./profile-tags.ts";
import { catalog } from "./index.ts";
import { DEMO_OVERLAY } from "../../demo/catalog-demo.ts";
import { DEMO_LESSONS } from "../../demo/lessons.ts";
import { TASK_CATALOG } from "../../demo/task-catalog.ts";
import { EXAMPLE_PROFILE } from "../../demo/plan.ts";
import { normalizeSearch } from "../demo/filters.ts";
import type { CatalogFile, CatalogLesson } from "@/types/catalog";

const clone = (): Record<string, any> => JSON.parse(JSON.stringify(raw)); // eslint-disable-line @typescript-eslint/no-explicit-any
const officialLesson = (over: Partial<CatalogLesson> = {}): CatalogLesson => ({
  id: "l-oficial-roteiro",
  moduleId: "m-roteirista-invisivel",
  title: "Aula oficial (fixture de teste)",
  order: 1,
  durationMinutes: 12,
  level: "fundamento",
  tags: ["roteiro"],
  prerequisites: [],
  summary: "",
  practice: "",
  media: { kind: "none" },
  materialIds: [],
  origin: "oficial",
  availability: "disponivel",
  ...over,
});

describe("catálogo oficial (arquivo)", () => {
  test("o arquivo atual é válido e só contém conteúdo oficial", () => {
    const r = parseCatalogFile(raw);
    assert.ok(r.ok, r.ok ? "" : r.errors.join("\n"));
    assert.equal(r.file.modules.length, 23);
    assert.ok(r.file.modules.every((m) => m.origin === "oficial"));
    assert.equal(r.file.lessons.length, 0, "aulas oficiais ainda não fornecidas");
  });

  test("toda capa aponta para um arquivo existente em public/", () => {
    for (const m of (raw as CatalogFile).modules) assert.ok(existsSync(join("public", m.cover)), m.cover);
  });

  test("recusa URL no lugar de referência de mídia (nunca expor link privado)", () => {
    const f = clone();
    f.lessons = [{ ...officialLesson(), media: { kind: "externo", provider: "kiwify", ref: "https://members.kiwify.com/aula/123" } }];
    const r = parseCatalogFile(f);
    assert.equal(r.ok, false);
    assert.ok(!r.ok && r.errors.some((e) => e.includes("IDENTIFICADOR")));
  });

  test("recusa IDs duplicados, módulo inexistente, pré-requisito inexistente e conteúdo demonstrativo", () => {
    const f = clone();
    f.lessons = [
      officialLesson(),
      officialLesson(),
      officialLesson({ id: "l-x", moduleId: "m-nao-existe" }),
      officialLesson({ id: "l-y", prerequisites: ["l-fantasma"] }),
      officialLesson({ id: "l-z", origin: "demonstrativo" }),
    ];
    const r = parseCatalogFile(f);
    assert.equal(r.ok, false);
    const errs = r.ok ? [] : r.errors.join("\n");
    assert.match(String(errs), /duplicado/);
    assert.match(String(errs), /moduleId inexistente/);
    assert.match(String(errs), /aula inexistente l-fantasma/);
    assert.match(String(errs), /só aceita "oficial"/);
  });

  test("recusa capa fora de /public e alias para aula inexistente", () => {
    const f = clone();
    f.modules[0].cover = "https://cdn.exemplo.com/capa.png";
    f.lessonAliases = { "l-roteiro": "l-nao-existe" };
    const r = parseCatalogFile(f);
    assert.equal(r.ok, false);
  });
});

describe("mesclagem oficial + exemplo e compatibilidade de IDs", () => {
  test("aula oficial num módulo substitui as de exemplo; alias preserva o ID antigo do plano", () => {
    const f = clone();
    f.lessons = [officialLesson()];
    f.lessonAliases = { "l-roteiro": "l-oficial-roteiro" };
    const parsed = parseCatalogFile(f);
    assert.ok(parsed.ok);
    const api = createCatalogApi(buildCatalog(parsed.file, DEMO_OVERLAY));
    assert.deepEqual(api.lessonsOfModule("m-roteirista-invisivel").map((l) => l.id), ["l-oficial-roteiro"]);
    assert.equal(api.getLesson("l-roteiro")?.id, "l-oficial-roteiro", "ID antigo resolve para a aula oficial");
    assert.equal(api.resolveLessonId("l-roteiro"), "l-oficial-roteiro");
    assert.ok(!api.lessons().some((l) => l.id === "l-roteiro"), "aula de exemplo substituída some");
    assert.ok(api.lessonsOfModule("m-protocolo").every((l) => l.origin === "demonstrativo"), "outros módulos seguem com exemplo");
  });

  test("oculto não aparece; em breve aparece mas não é sugerido como próxima aula", () => {
    const f = clone();
    f.lessons = [officialLesson({ id: "l-a", order: 1, availability: "em_breve" }), officialLesson({ id: "l-b", order: 2, availability: "oculto" })];
    const parsed = parseCatalogFile(f);
    assert.ok(parsed.ok);
    const api = createCatalogApi(buildCatalog(parsed.file, null));
    assert.deepEqual(api.lessons().map((l) => l.id), ["l-a"]);
    assert.equal(api.nextLesson({ preferred: ["l-a"], isDone: () => false }), undefined);
  });

  test("módulo oculto some dos trilhos", () => {
    const f = clone();
    f.modules[0].availability = "oculto";
    const parsed = parseCatalogFile(f);
    assert.ok(parsed.ok);
    const api = createCatalogApi(buildCatalog(parsed.file, DEMO_OVERLAY));
    assert.ok(!api.modules().some((m) => m.id === f.modules[0].id));
  });
});

describe("catálogo do app (oficial + exemplo)", () => {
  test("todas as 19 aulas de exemplo estão em módulos oficiais, uma vez cada", () => {
    const ids = catalog.lessons().map((l) => l.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const l of DEMO_LESSONS) assert.ok(catalog.getLesson(l.id), l.id);
    assert.ok(catalog.lessons().every((l) => l.origin === "demonstrativo"), "hoje não há aula oficial cadastrada");
  });

  test("NENHUMA tarefa do checklist aponta para aula inexistente (todos os modelos do motor)", () => {
    for (const t of TASK_CATALOG) {
      if (!t.lessonId) continue;
      assert.ok(catalog.getLesson(t.lessonId), `tarefa ${t.id} → aula inexistente ${t.lessonId}`);
    }
  });

  test("ordem dos trilhos, módulos e aulas vem dos dados", () => {
    const rails = catalog.rails();
    assert.ok(rails.every((r, i) => i === 0 || rails[i - 1].order <= r.order));
    for (const r of rails) {
      const ms = catalog.modulesOfRail(r.id);
      assert.ok(ms.every((m, i) => i === 0 || ms[i - 1].order <= m.order));
    }
    const ls = catalog.lessonsOfModule("m-primeiros-passos");
    assert.deepEqual(ls.map((l) => l.order), [1, 2, 3]);
  });

  test("próxima aula: segue o plano, depois a ordem do catálogo; trilha avança para o próximo módulo", () => {
    const done = new Set(["l-boas-vindas"]);
    assert.equal(catalog.nextLesson({ preferred: ["l-roteiro"], isDone: (id) => done.has(id) })?.id, "l-roteiro");
    assert.equal(catalog.nextLesson({ preferred: [], isDone: (id) => done.has(id) })?.id, "l-fundamentos-shop");
    const lastOfModule = catalog.lessonsOfModule("m-primeiro-acesso").at(-1)!;
    assert.equal(catalog.nextInTrail(lastOfModule.id)?.moduleId, "m-primeiros-passos");
  });

  test("busca ignora acentos e encontra pelo título do módulo", () => {
    assert.ok(catalog.searchLessons("narracao", normalizeSearch).some((l) => l.id === "l-narracao"));
    assert.ok(catalog.searchLessons("roteirista", normalizeSearch).some((l) => l.id === "l-roteiro"));
  });

  test("recomendações usam o onboarding (marcadores do catálogo)", () => {
    const r = catalog.recommendModules(EXAMPLE_PROFILE);
    assert.ok(r.modules.some((m) => m.id === "m-influenciador-digital"));
    assert.ok(r.modules.some((m) => m.id === "m-venda-sem-aparecer"));
    assert.ok(!r.modules.some((m) => m.id === "m-venda-sua-imagem"));
    assert.deepEqual(catalog.recommendModules(EXAMPLE_PROFILE), r, "determinístico");
  });

  test("relatório de pendências identifica o que falta sem inventar conteúdo", () => {
    const g = catalog.gaps();
    assert.equal(g.officialLessons, 0);
    assert.equal(g.demoLessons, 19);
    assert.ok(g.modulesWithoutLessons.includes("m-live-shop"));
    assert.ok(!g.modulesWithoutLessons.includes("m-aulas-ao-vivo"), "módulo que abre outra área não é pendência de aula");
  });
});

describe("reprodução e perfis", () => {
  test("estado do player a partir da referência", () => {
    assert.deepEqual(playbackState({ kind: "none" }, "disponivel"), { state: "sem_video" });
    assert.deepEqual(playbackState({ kind: "none" }, "em_breve"), { state: "em_breve" });
    assert.equal(playbackState({ kind: "externo", provider: "kiwify", ref: "abc123" }, "disponivel").state, "integracao_pendente");
    assert.equal(playbackState({ kind: "proprio", assetId: "video-1" }, "disponivel").state, "integracao_pendente");
    const yt = playbackState({ kind: "externo", provider: "youtube", ref: "dQw4w9WgXcQ" }, "disponivel");
    assert.ok(yt.state === "embed" && yt.src.startsWith("https://www.youtube-nocookie.com/embed/"));
    assert.equal(playbackState({ kind: "externo", provider: "youtube", ref: "x\" onerror" }, "disponivel").state, "integracao_pendente");
  });

  test("marcadores de perfil preservam as regras de formato", () => {
    assert.deepEqual(profileTags(EXAMPLE_PROFILE).sort(), ["avatar_ia", "bloqueio_produto", "iniciante", "sem_aparecer"]);
    const aparece = profileTags({ ...EXAMPLE_PROFILE, wantsToAppear: "sim", formats: [], experience: "ja_vendi", mainBlocker: "roteiros" });
    assert.deepEqual(aparece.sort(), ["aparecer", "bloqueio_roteiro", "experiente"]);
    const explora = profileTags({ ...EXAMPLE_PROFILE, wantsToAppear: "talvez", formats: ["quero_explorar"] });
    assert.ok(explora.includes("explorar") && !explora.includes("sem_aparecer"));
  });
});
