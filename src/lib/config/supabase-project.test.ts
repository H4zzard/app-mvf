import { test } from "node:test";
import assert from "node:assert/strict";
import { identify, maskRef, parseEnvFile, projectRefFromKey, projectRefFromUrl } from "./supabase-project.ts";

const jwt = (payload: object) => `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

test("ref vem da URL do Supabase; outras URLs não contam", () => {
  assert.equal(projectRefFromUrl("https://abcdefghijklmnopqrst.supabase.co"), "abcdefghijklmnopqrst");
  assert.equal(projectRefFromUrl("https://example.com"), null);
  assert.equal(projectRefFromUrl(""), null);
});

test("chave antiga traz o ref; chave nova não; nunca devolve a chave", () => {
  assert.equal(projectRefFromKey(jwt({ ref: "abcdefghijklmnopqrst", role: "service_role" })), "abcdefghijklmnopqrst");
  assert.equal(projectRefFromKey("sb_secret_xyz"), null);
  const p = identify("x", { NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co", SUPABASE_SERVICE_ROLE_KEY: jwt({ ref: "outroprojetoqualquer1" }) });
  assert.equal(p.serviceKeyMatches, false);
  assert.ok(!JSON.stringify(p).includes("eyJ") && !JSON.stringify(p).includes("x."), "nada da chave no resultado");
});

test("máscara e leitura do .env só das chaves pedidas", () => {
  assert.equal(maskRef("abcdefghijklmnopqrst"), "abcd…qrst");
  const env = parseEnvFile('NEXT_PUBLIC_SUPABASE_URL="https://a.supabase.co"\nDEEPSEEK_API_KEY=segredo\n# comentário', ["NEXT_PUBLIC_SUPABASE_URL"]);
  assert.deepEqual(env, { NEXT_PUBLIC_SUPABASE_URL: "https://a.supabase.co" });
});
