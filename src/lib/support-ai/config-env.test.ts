import { test } from "node:test";
import assert from "node:assert/strict";
import { chatAvailability, readSupportConfig } from "./config.ts";

const base = { MVF_SUPPORT_AI_ENABLED: "true", MVF_SUPPORT_STORE: "supabase", MVF_SUPPORT_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "sk-teste" };

test("valores colados com maiúsculas, espaços ou aspas no painel ainda ativam o chat", () => {
  for (const env of [
    base,
    { ...base, MVF_SUPPORT_AI_ENABLED: "True" },
    { ...base, MVF_SUPPORT_AI_ENABLED: " true\n", MVF_SUPPORT_STORE: "Supabase ", MVF_SUPPORT_PROVIDER: "DeepSeek" },
    { ...base, MVF_SUPPORT_AI_ENABLED: '"true"', DEEPSEEK_API_KEY: '"sk-teste"' },
  ]) {
    const c = readSupportConfig(env);
    assert.deepEqual(chatAvailability(c, "member"), { available: true }, JSON.stringify(env));
    assert.equal(c.deepseek?.apiKey, "sk-teste");
  }
});

test("continua fechado quando falta algo, dizendo o motivo", () => {
  assert.equal(chatAvailability(readSupportConfig({ ...base, MVF_SUPPORT_AI_ENABLED: "false" }), "member").reason, "disabled");
  assert.equal(chatAvailability(readSupportConfig({ ...base, MVF_SUPPORT_AI_ENABLED: undefined }), "member").reason, "disabled");
  assert.equal(chatAvailability(readSupportConfig({ ...base, MVF_SUPPORT_STORE: undefined }), "member").reason, "no_store");
  assert.equal(chatAvailability(readSupportConfig({ ...base, MVF_SUPPORT_PROVIDER: "local" }), "member").reason, "local_provider");
  assert.equal(chatAvailability(readSupportConfig({ ...base, DEEPSEEK_API_KEY: '""' }), "member").reason, "missing_key");
});
