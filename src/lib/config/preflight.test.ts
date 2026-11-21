import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkEnv, classifySupabaseKey, evaluateAnonRead, evaluateAuthSettings, summarize } from "./preflight.ts";
import { parseConfirmParams } from "../auth/confirm-params.ts";

// JWTs FICTÍCIOS (assinatura inválida), só para classificar o papel declarado.
const fakeJwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.assinatura-ficticia`;

const GOOD_HOMOLOG = {
  NEXT_PUBLIC_SUPABASE_URL: "https://projeto-ficticio.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ficticia",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_ficticia",
  APP_BASE_URL: "https://homolog.exemplo.com.br",
  MVF_SUPPORT_CONTACT_URL: "https://exemplo.com.br/suporte",
  KIWIFY_ACCOUNT_ID: "conta-ficticia",
  KIWIFY_CLIENT_ID: "cliente-ficticio",
  KIWIFY_CLIENT_SECRET: "segredo-ficticio",
  KIWIFY_WEBHOOK_TOKEN: "token-ficticio-bem-longo-123",
  KIWIFY_ALLOWED_PRODUCT_IDS: "prod-ficticio-1",
};

describe("preflight de configuração", () => {
  test("ambiente de homologação coerente não tem erros nem avisos", () => {
    const f = checkEnv(GOOD_HOMOLOG, "homologacao");
    assert.deepEqual(summarize(f), { errors: 0, warnings: 0 }, JSON.stringify(f.filter((x) => x.level !== "ok")));
  });

  test("nunca devolve valores das variáveis", () => {
    const text = JSON.stringify(checkEnv(GOOD_HOMOLOG, "homologacao"));
    for (const v of ["sb_secret_ficticia", "segredo-ficticio", "token-ficticio-bem-longo-123", "sb_publishable_ficticia", "conta-ficticia"]) {
      assert.ok(!text.includes(v), `vazou ${v}`);
    }
  });

  test("chave elevada em variável pública é erro", () => {
    const f = checkEnv({ ...GOOD_HOMOLOG, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fakeJwt("service_role") }, "homologacao");
    assert.ok(f.some((x) => x.level === "error" && x.key === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
    const g = checkEnv({ ...GOOD_HOMOLOG, NEXT_PUBLIC_KIWIFY_TOKEN: "x" }, "homologacao");
    assert.ok(g.some((x) => x.level === "error" && x.key === "NEXT_PUBLIC_KIWIFY_TOKEN"));
  });

  test("homologação exige https público, sem demo, credenciais completas", () => {
    const f = checkEnv(
      { ...GOOD_HOMOLOG, APP_BASE_URL: "http://localhost:3000", MVF_DEMO_MODE: "true", KIWIFY_CLIENT_SECRET: "" },
      "homologacao",
    );
    const errs = f.filter((x) => x.level === "error").map((x) => x.key);
    assert.ok(errs.includes("APP_BASE_URL") && errs.includes("MVF_DEMO_MODE") && errs.includes("KIWIFY_*"));
  });

  test("development sem nada só avisa (área privada fica fechada)", () => {
    assert.equal(summarize(checkEnv({}, "development")).errors, 0);
    assert.ok(summarize(checkEnv({}, "homologacao")).errors >= 3);
  });

  test("classifica chaves do Supabase", () => {
    assert.equal(classifySupabaseKey("sb_publishable_x"), "publishable");
    assert.equal(classifySupabaseKey("sb_secret_x"), "secret");
    assert.equal(classifySupabaseKey(fakeJwt("anon")), "legacy_anon");
    assert.equal(classifySupabaseKey(fakeJwt("service_role")), "legacy_service_role");
    assert.equal(classifySupabaseKey("qualquer"), "unknown");
  });

  test("avaliadores remotos: cadastro aberto e leitura anônima com linhas são erro", () => {
    assert.deepEqual(evaluateAuthSettings({ disable_signup: true, external: { email: true } }).map((f) => f.level), ["ok", "ok"]);
    assert.equal(evaluateAuthSettings({ disable_signup: false, external: { email: true } })[0].level, "error");
    assert.equal(evaluateAnonRead("profiles", 200, []).level, "ok");
    assert.equal(evaluateAnonRead("profiles", 401, { code: "42501" }).level, "ok");
    assert.equal(evaluateAnonRead("profiles", 200, [{ x: 1 }]).level, "error");
    assert.equal(evaluateAnonRead("profiles", 404, { code: "PGRST205" }).level, "error");
  });
});

describe("parâmetros do link mágico", () => {
  test("aceita token_hash com type email/magiclink e code PKCE", () => {
    assert.deepEqual(parseConfirmParams({ token_hash: "abcDEF123_-xyz", type: "email" }), { kind: "token_hash", tokenHash: "abcDEF123_-xyz", type: "email" });
    assert.deepEqual(parseConfirmParams({ code: "codigo-ficticio-123" }), { kind: "code", code: "codigo-ficticio-123" });
  });

  test("recusa type não permitido, token malformado e vazio", () => {
    assert.equal(parseConfirmParams({ token_hash: "abcDEF123", type: "signup" }), null);
    assert.equal(parseConfirmParams({ token_hash: "abc", type: "email" }), null);
    assert.equal(parseConfirmParams({ token_hash: "<script>alert(1)</script>", type: "email" }), null);
    assert.equal(parseConfirmParams({}), null);
  });
});
