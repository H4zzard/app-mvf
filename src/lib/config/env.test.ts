import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { canPreviewModules, readConfig } from "./env.ts";

describe("prévia de módulos para contas reais (MVF_PREVIEW_MODULES)", () => {
  test("vazio = ninguém (padrão)", () => {
    const c = readConfig({ NODE_ENV: "production" });
    assert.equal(canPreviewModules(c, "alguem@exemplo.com"), false);
  });

  test("lista de e-mails: só quem está na lista, sem diferenciar maiúsculas", () => {
    const c = readConfig({ NODE_ENV: "production", MVF_PREVIEW_MODULES: " Teste.Um@Exemplo.com , teste.dois@exemplo.com,invalido " });
    assert.deepEqual(c.modulesPreview, { all: false, emails: ["teste.um@exemplo.com", "teste.dois@exemplo.com"] });
    assert.equal(canPreviewModules(c, "TESTE.UM@exemplo.com"), true);
    assert.equal(canPreviewModules(c, "outra@exemplo.com"), false);
    assert.equal(canPreviewModules(c, ""), false);
    assert.equal(canPreviewModules(c, null), false);
  });

  test("“all” libera para todas as contas com acesso", () => {
    const c = readConfig({ NODE_ENV: "production", MVF_PREVIEW_MODULES: "ALL" });
    assert.equal(canPreviewModules(c, "qualquer@exemplo.com"), true);
  });

  test("a prévia não muda o modo de autenticação nem abre o app sem Supabase", () => {
    const c = readConfig({ NODE_ENV: "production", MVF_PREVIEW_MODULES: "all", MVF_DEMO_MODE: "true" });
    assert.equal(c.authMode, "unconfigured");
  });
});
