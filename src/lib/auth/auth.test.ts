import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readConfig } from "../config/env.ts";
import { isPrivatePath, sanitizeReturnTo } from "./return-to.ts";
import { adminRequestStatus, can, parseRoles, primaryRole } from "./permissions.ts";
import { toPersistedState } from "../data/student-state.ts";
import { sanitizeDraft } from "../../config/onboarding-questions.ts";
import { EXAMPLE_PROFILES } from "../../demo/example-profiles.ts";

describe("configuração e modo demo", () => {
  const supa = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk" };

  test("demo só em development com a flag", () => {
    assert.equal(readConfig({ NODE_ENV: "development", MVF_DEMO_MODE: "true" }).authMode, "demo");
    assert.equal(readConfig({ NODE_ENV: "development" }).authMode, "unconfigured");
  });

  test("em produção a flag demo é ignorada e, sem Supabase, falha fechado", () => {
    const c = readConfig({ NODE_ENV: "production", MVF_DEMO_MODE: "true" });
    assert.equal(c.authMode, "unconfigured");
    assert.equal(c.demoFlagIgnored, true);
    assert.equal(readConfig({ NODE_ENV: "production", MVF_DEMO_MODE: "true", ...supa }).authMode, "supabase");
  });

  test("credenciais Kiwify só contam completas; allowlist vazia = nada liberado", () => {
    const c = readConfig({ KIWIFY_CLIENT_ID: "a", KIWIFY_CLIENT_SECRET: "b" });
    assert.equal(c.kiwify.api, null);
    assert.deepEqual(c.kiwify.allowedProductIds, []);
    assert.deepEqual(readConfig({ KIWIFY_WEBHOOK_TOKEN: "t", KIWIFY_WEBHOOK_TOKEN_PREVIOUS: " " }).kiwify.webhookTokens, ["t"]);
  });
});

describe("returnTo", () => {
  test("aceita só caminhos internos permitidos", () => {
    assert.equal(sanitizeReturnTo("/meu-plano"), "/meu-plano");
    assert.equal(sanitizeReturnTo("/admin?x=1"), "/admin");
    for (const bad of [
      "https://evil.com", "//evil.com", "/\\evil.com", "%2F%2Fevil.com", "javascript:alert(1)",
      "/login", "/api/webhooks/kiwify", "/inicio\n", "", null, 42, "/INICIO",
    ]) {
      assert.equal(sanitizeReturnTo(bad), "/inicio", String(bad));
    }
  });
  test("rotas privadas", () => {
    assert.equal(isPrivatePath("/admin"), true);
    assert.equal(isPrivatePath("/onboarding"), true);
    assert.equal(isPrivatePath("/login"), false);
    assert.equal(isPrivatePath("/api/webhooks/kiwify"), false);
  });
});

describe("papéis e permissões", () => {
  test("aluna não entra em /admin; equipe entra; integração só admin/suporte", () => {
    assert.equal(can(["student"], "admin:access"), false);
    assert.equal(can([], "admin:access"), false);
    assert.equal(can(["moderator"], "admin:access"), true);
    assert.equal(can(["moderator"], "integration:read"), false);
    assert.equal(can(["support"], "integration:read"), true);
    assert.equal(primaryRole(["support", "admin"]), "admin");
    assert.deepEqual(parseRoles(["admin", "hacker", 1]), ["admin"]);
  });
  test("rotas de gestão: 401 sem login, 403 para aluna/demo/sem acesso, 200 para equipe autorizada", () => {
    assert.equal(adminRequestStatus({ kind: "anonymous" }, "integration:read"), 401);
    assert.equal(adminRequestStatus({ kind: "denied" }, "integration:read"), 403);
    assert.equal(adminRequestStatus({ kind: "demo" }, "integration:read"), 403);
    assert.equal(adminRequestStatus({ kind: "member", roles: ["student"] }, "integration:read"), 403);
    assert.equal(adminRequestStatus({ kind: "member", roles: ["admin"] }, "integration:read"), 200);
  });
});

describe("estado persistido", () => {
  const profile = EXAMPLE_PROFILES[0].profile;

  test("onboarding concluído vira perfil; progresso por ID; status desconhecido descartado", () => {
    const s = toPersistedState({
      submission: { answers: profile, status: "completed" },
      activeRevision: 3,
      progress: [
        { task_id: "t-fundamentos", status: "completed" },
        { task_id: "t-fora-do-plano", status: "completed" },
        { task_id: "t-x", status: "hackeado" },
      ],
    });
    assert.deepEqual(s.profile, profile);
    assert.equal(s.revision, 3);
    assert.deepEqual(s.statusMap, { "t-fundamentos": "completed", "t-fora-do-plano": "completed" });
  });

  test("rascunho e respostas inválidas não viram plano", () => {
    const draft = toPersistedState({ submission: { answers: { experience: "ja_vendi", lixo: 1 }, status: "draft" }, activeRevision: null, progress: [] });
    assert.equal(draft.profile, null);
    assert.deepEqual(draft.draft, { experience: "ja_vendi" });
    const broken = toPersistedState({ submission: { answers: { experience: "ja_vendi" }, status: "completed" }, activeRevision: 1, progress: [] });
    assert.equal(broken.profile, null);
    assert.deepEqual(broken.draft, { experience: "ja_vendi" });
    assert.deepEqual(toPersistedState({ submission: null, activeRevision: null, progress: [] }), { profile: null, draft: null, statusMap: {}, revision: 0 });
  });

  test("sanitizeDraft descarta valores inválidos e incoerentes", () => {
    assert.deepEqual(sanitizeDraft({ wantsToAppear: "sim", formats: ["avatar_ia"], dailyMinutes: "45", device: "celular" }), {
      wantsToAppear: "sim",
      device: "celular",
    });
    assert.deepEqual(sanitizeDraft("x"), {});
    assert.deepEqual(sanitizeDraft([1]), {});
  });
});
