import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeKiwifySignature, verifyKiwifySignature } from "./signature.ts";
import { decideAccess, normalizeEmail, parseIdList, sanitizeError, webhookDedupKey } from "./rules.ts";
import { KiwifyApi, KiwifyApiError, describeShape, kiwifyDate, normalizeSale, parseKiwifyTime } from "./api.ts";
import { handleKiwifyWebhook, type SaleFetcher } from "./webhook.ts";
import { buildWindows, hasNextPage, runImport, type ImportApi } from "./importer.ts";
import { MemoryAccessStore } from "../access/memory-store.ts";
import type { KiwifySale } from "./types.ts";

const enc = (s: string) => new TextEncoder().encode(s);

// Vetor publicado em docs.kiwify.com.br/api-reference/webhooks/receiving (conferido byte a byte).
const DOC_TOKEN = "kiwify-token-de-teste";
const DOC_BODY = '{"order_id":"9b1c2d3e-0000-4000-8000-000000000001","order_status":"paid","webhook_event_type":"order_approved"}';
const DOC_SIGNATURE = "bf18f352a4f981b91dfa3f6d8742a81080ab8c86";

describe("assinatura do webhook", () => {
  test("vetor oficial da documentação", () => {
    assert.equal(computeKiwifySignature(enc(DOC_BODY), DOC_TOKEN), DOC_SIGNATURE);
    assert.equal(verifyKiwifySignature(enc(DOC_BODY), DOC_SIGNATURE, [DOC_TOKEN]), true);
    assert.equal(verifyKiwifySignature(enc(DOC_BODY), DOC_SIGNATURE.toUpperCase(), [DOC_TOKEN]), true);
  });

  test("rejeita ausente, errada, malformada, corpo alterado e token vazio", () => {
    assert.equal(verifyKiwifySignature(enc(DOC_BODY), null, [DOC_TOKEN]), false);
    assert.equal(verifyKiwifySignature(enc(DOC_BODY), "0".repeat(40), [DOC_TOKEN]), false);
    assert.equal(verifyKiwifySignature(enc(DOC_BODY), "xyz", [DOC_TOKEN]), false);
    assert.equal(verifyKiwifySignature(enc(DOC_BODY + " "), DOC_SIGNATURE, [DOC_TOKEN]), false);
    assert.equal(verifyKiwifySignature(enc(DOC_BODY), computeKiwifySignature(enc(DOC_BODY), ""), [""]), false);
  });

  test("aceita o token anterior durante rotação", () => {
    assert.equal(verifyKiwifySignature(enc(DOC_BODY), DOC_SIGNATURE, ["novo-token", DOC_TOKEN]), true);
  });
});

describe("regras", () => {
  test("status → decisão conservadora", () => {
    assert.equal(decideAccess("paid"), "grant");
    assert.equal(decideAccess("approved"), "grant");
    for (const s of ["refunded", "chargedback"]) assert.equal(decideAccess(s), "revoke");
    for (const s of ["waiting_payment", "refused", "pending", "authorized", "refund_requested", "pending_refund", "x"]) {
      assert.equal(decideAccess(s), "hold", s);
    }
  });
  test("allowlist vazia não libera nada; e-mails normalizados; dedup e erros sem PII", () => {
    assert.deepEqual(parseIdList(""), []);
    assert.deepEqual(parseIdList(" a, b ,,"), ["a", "b"]);
    assert.equal(normalizeEmail("  Ana@Exemplo.COM "), "ana@exemplo.com");
    assert.equal(normalizeEmail("sem-arroba"), null);
    assert.equal(webhookDedupKey({ order_id: "o1", webhook_event_type: "order_approved" }), "o1:order_approved");
    assert.equal(webhookDedupKey({ subscription_id: "s1", webhook_event_type: "subscription_trial_started" }), "s1:subscription_trial_started");
    assert.equal(sanitizeError(new Error("falhou para ana@x.com cpf 12345678901")), "falhou para [email] cpf [número]");
  });
  test("normaliza venda só com campos documentados e datas da Kiwify", () => {
    const s = normalizeSale({ id: "o1", status: "PAID", product: { id: "p1" }, customer: { email: " A@B.com " }, updated_at: "2026-01-02 10:00:00" });
    assert.deepEqual(s, { id: "o1", status: "paid", productId: "p1", customerEmail: "a@b.com", createdAt: null, updatedAt: "2026-01-02 10:00:00" });
    assert.equal(parseKiwifyTime("2026-01-02 10:00:00"), Date.UTC(2026, 0, 2, 10));
  });
});

/* ------------------------------ Webhook ------------------------------ */

const TOKEN = "segredo-do-webhook";
const PRODUCT = "prod-mvf";

function signed(payload: object) {
  const body = enc(JSON.stringify(payload));
  return { body, sig: computeKiwifySignature(body, TOKEN) };
}

class FakeSales implements SaleFetcher, ImportApi {
  sales = new Map<string, KiwifySale>();
  calls = 0;
  failing = false;
  set(id: string, status: string, email: string | null = `${id}@exemplo.com`, productId = PRODUCT, updatedAt = "2026-01-01 10:00:00") {
    this.sales.set(id, { id, status, productId, customerEmail: email, createdAt: "2025-01-01 10:00:00", updatedAt });
  }
  async getSale(id: string) {
    this.calls++;
    if (this.failing) throw new KiwifyApiError("transient", 503, "http_503");
    const s = this.sales.get(id);
    if (!s) throw new KiwifyApiError("not_found", 404, "http_404");
    return { ...s };
  }
  async listSales(p: { startDate: string; endDate: string; productId: string; pageNumber: number; pageSize: number }) {
    // Como a API real: só vendas criadas dentro da janela consultada.
    const inWindow = (s: KiwifySale) => (s.createdAt ?? "") >= p.startDate && (s.createdAt ?? "") <= p.endDate;
    const all = [...this.sales.values()].filter((s) => s.productId === p.productId && inWindow(s));
    return { sales: all.slice((p.pageNumber - 1) * p.pageSize, p.pageNumber * p.pageSize) };
  }
}

function setup(apiConfigured = true) {
  const store = new MemoryAccessStore();
  const api = new FakeSales();
  const deps = { tokens: [TOKEN], allowedProductIds: [PRODUCT], store, api: apiConfigured ? api : null };
  const send = (payload: object, sigOverride?: string | null) => {
    const { body, sig } = signed(payload);
    return handleKiwifyWebhook(body, sigOverride === undefined ? sig : sigOverride, deps);
  };
  return { store, api, deps, send };
}

const approved = (id: string) => ({ order_id: id, order_status: "paid", webhook_event_type: "order_approved" });

describe("webhook Kiwify", () => {
  test("sem token configurado falha fechado (503)", async () => {
    const r = await handleKiwifyWebhook(enc("{}"), "x", { tokens: [], allowedProductIds: [PRODUCT], store: new MemoryAccessStore(), api: null });
    assert.equal(r.status, 503);
  });

  test("assinatura ausente/incorreta → 401 sem registrar nada", async () => {
    const { send, store } = setup();
    assert.equal((await send(approved("o1"), null)).status, 401);
    assert.equal((await send(approved("o1"), "f".repeat(40))).status, 401);
    assert.equal(store.events.length, 0);
  });

  test("payload inválido → 400", async () => {
    const { deps } = setup();
    const bad = enc("não é json");
    assert.equal((await handleKiwifyWebhook(bad, computeKiwifySignature(bad, TOKEN), deps)).status, 400);
    const { body, sig } = signed({ order_id: "../../etc", webhook_event_type: "order_approved" });
    assert.equal((await handleKiwifyWebhook(body, sig, deps)).status, 400);
  });

  test("compra aprovada e confirmada na API provisiona conta e acesso", async () => {
    const { send, store, api } = setup();
    api.set("o1", "paid");
    const r = await send(approved("o1"));
    assert.deepEqual([r.status, r.body.result], [200, "granted"]);
    assert.equal(store.createdAccounts, 1);
    assert.equal(store.entitlements.get("o1")?.accessState, "active");
    assert.equal(store.events[0].status, "processed");
  });

  test("reenvio do mesmo evento não duplica conta nem compra", async () => {
    const { send, store, api } = setup();
    api.set("o1", "paid");
    await send(approved("o1"));
    const r = await send(approved("o1"));
    assert.equal(r.body.result, "duplicate");
    assert.equal(store.createdAccounts, 1);
    assert.equal(store.events.length, 1);
    assert.equal(api.calls, 1);
  });

  test("dois pedidos da mesma pessoa = uma conta; um estornado mantém o outro ativo", async () => {
    const { send, store, api } = setup();
    api.set("o1", "paid", "ana@exemplo.com");
    api.set("o2", "paid", "ana@exemplo.com");
    await send(approved("o1"));
    await send(approved("o2"));
    assert.equal(store.createdAccounts, 1);
    await send({ order_id: "o1", order_status: "refunded", webhook_event_type: "order_refunded" });
    assert.equal(store.entitlements.get("o1")?.accessState, "revoked");
    assert.equal(store.activeUserIds().size, 1, "ainda tem acesso pelo pedido o2");
  });

  test("reembolso e chargeback revogam; aprovação antiga reenviada depois NÃO reativa", async () => {
    const { send, store, api } = setup();
    api.set("o1", "paid");
    await send(approved("o1"));
    await send({ order_id: "o1", order_status: "chargedback", webhook_event_type: "chargeback" });
    assert.equal(store.entitlements.get("o1")?.accessState, "revoked");
    // Replay fora de ordem: a API agora diz chargedback → não concede.
    api.set("o1", "chargedback");
    store.events.length = 0; // simula evento nunca visto (ex.: novo dedup)
    const r = await send(approved("o1"));
    assert.notEqual(r.body.result, "granted");
    assert.equal(store.entitlements.get("o1")?.accessState, "revoked");
    // Mesmo que a API voltasse a dizer "paid", pedido estornado vai para revisão humana.
    api.set("o1", "paid");
    store.events.length = 0;
    const r2 = await send(approved("o1"));
    assert.equal(r2.body.result, "needs_review");
    assert.equal(store.entitlements.get("o1")?.accessState, "revoked");
  });

  test("produto não autorizado e status não pago não concedem", async () => {
    const { send, store, api } = setup();
    api.set("o1", "paid", "a@exemplo.com", "outro-produto");
    api.set("o2", "waiting_payment");
    assert.equal((await send(approved("o1"))).body.result, "ignored_product");
    assert.equal((await send(approved("o2"))).body.result, "held");
    assert.equal(store.createdAccounts, 0);
  });

  test("“Testar Webhook” (ID fictício) não provisiona", async () => {
    const { send, store } = setup();
    const r = await send(approved("00000000-0000-4000-8000-000000000000"));
    assert.deepEqual([r.status, r.body.result], [200, "sale_not_found"]);
    assert.equal(store.createdAccounts, 0);
    assert.equal(store.events[0].status, "failed");
  });

  test("API indisponível: aprovação fica pendente e pede retry (503); reenvio processa", async () => {
    const { send, store, api } = setup();
    api.set("o1", "paid");
    api.failing = true;
    const r = await send(approved("o1"));
    assert.equal(r.status, 503);
    assert.equal(store.events[0].status, "pending_verification");
    assert.equal(store.createdAccounts, 0);
    api.failing = false;
    const retry = await send(approved("o1"));
    assert.equal(retry.body.result, "granted");
  });

  test("sem credenciais da API: aprovação nunca concede; reembolso revoga mesmo assim", async () => {
    const { send, store } = setup(false);
    const r = await send(approved("o9"));
    assert.equal(r.body.result, "pending_api_not_configured");
    assert.equal(store.createdAccounts, 0);
    store.entitlements.set("o8", {
      orderId: "o8", productId: PRODUCT, customerEmail: "b@exemplo.com", userId: "u", kiwifyStatus: "paid",
      accessState: "active", source: "import", kiwifyUpdatedAt: null, revokedReason: null,
    });
    await send({ order_id: "o8", order_status: "refunded", webhook_event_type: "order_refunded" });
    assert.equal(store.entitlements.get("o8")?.accessState, "revoked");
  });

  test("eventos não tratados são registrados e ignorados", async () => {
    const { send, store } = setup();
    const r = await send({ order_id: "o1", order_status: "waiting_payment", webhook_event_type: "pix_created" });
    assert.equal(r.body.result, "ignored_event_type");
    assert.equal(store.events[0].status, "ignored");
  });
});

/* ----------------------------- Importação ----------------------------- */

describe("importação de compradoras antigas", () => {
  test("janelas de até 90 dias cobrindo todo o período", () => {
    const w = buildWindows(new Date("2024-01-01"), new Date("2024-12-31"));
    assert.equal(w.length, 5);
    assert.equal(w[0].end.toISOString().slice(0, 10), "2024-03-30");
    assert.equal(w[4].end.toISOString().slice(0, 10), "2024-12-31");
    for (const x of w) assert.ok((x.end.getTime() - x.start.getTime()) / 86_400_000 <= 89);
  });

  function seed() {
    const api = new FakeSales();
    api.set("a1", "paid", "ana@exemplo.com");
    api.set("a2", "paid", "ana@exemplo.com"); // mesma aluna, 2 pedidos
    api.set("b1", "refunded", "bia@exemplo.com");
    api.set("c1", "paid", null); // sem e-mail
    api.set("d1", "waiting_payment", "duda@exemplo.com");
    api.set("e1", "paid", "eva@exemplo.com");
    return api;
  }

  test("dry-run é o padrão: conta, não grava, não cria contas", async () => {
    const api = seed();
    const store = new MemoryAccessStore();
    const r = await runImport({ api, store, allowedProductIds: [PRODUCT], start: new Date("2025-01-01"), end: new Date("2025-12-31"), execute: false, pageSize: 2 });
    assert.equal(r.mode, "dry_run");
    assert.equal(r.counts.vendas_lidas, 6);
    assert.equal(r.counts.elegiveis_pagas, 4);
    assert.equal(r.counts.alunas_unicas_elegiveis, 2);
    assert.equal(r.counts.sem_email, 1);
    assert.equal(r.counts.reembolsadas_ou_chargeback, 1);
    assert.equal(r.counts.outros_status, 1);
    assert.equal(store.createdAccounts, 0);
    assert.equal(store.entitlements.size, 0);
    assert.deepEqual(r.review, [{ orderId: "c1", reason: "sale_without_email" }]);
  });

  test("execução concede, é idempotente ao reexecutar e confirma status atual", async () => {
    const api = seed();
    const store = new MemoryAccessStore();
    const opts = { api, store, allowedProductIds: [PRODUCT], start: new Date("2025-01-01"), end: new Date("2025-06-30"), execute: true, pageSize: 2 };
    const first = await runImport(opts);
    assert.equal(first.counts.concedidas, 3);
    assert.equal(store.createdAccounts, 2);
    // Entre execuções, a1 foi reembolsado: a confirmação via API pega o estado atual.
    api.set("a1", "refunded", "ana@exemplo.com", PRODUCT, "2026-02-01 10:00:00");
    const second = await runImport(opts);
    assert.equal(store.createdAccounts, 2, "não duplica contas");
    assert.equal(second.counts.concedidas, 0);
    assert.equal(store.entitlements.get("a1")?.accessState, "revoked");
    assert.equal(store.entitlements.get("a2")?.accessState, "active");
  });

  test("retoma uma execução interrompida a partir do cursor salvo", async () => {
    const api = seed();
    const store = new MemoryAccessStore();
    let pages = 0;
    const flaky: ImportApi = {
      getSale: (id) => api.getSale(id),
      async listSales(p) {
        if (++pages === 2) throw new KiwifyApiError("transient", 503, "http_503");
        return api.listSales(p);
      },
    };
    const base = { store, allowedProductIds: [PRODUCT], start: new Date("2025-01-01"), end: new Date("2025-01-31"), execute: true, pageSize: 2 };
    await assert.rejects(runImport({ ...base, api: flaky }));
    const runId = [...store.runs.keys()][0];
    assert.equal(store.runs.get(runId)?.status, "failed");
    assert.deepEqual(store.runs.get(runId)?.cursor, { productIndex: 0, windowIndex: 0, pageNumber: 2 });
    const resumed = await runImport({ ...base, api, resumeRunId: runId });
    assert.equal(store.runs.get(runId)?.status, "completed");
    assert.equal(resumed.runId, runId);
    assert.equal(store.activeUserIds().size, 2);
  });

  test("sem produtos permitidos, recusa importar", async () => {
    await assert.rejects(
      runImport({ api: seed(), store: null, allowedProductIds: [], start: new Date("2025-01-01"), end: new Date("2025-01-31"), execute: false }),
      /KIWIFY_ALLOWED_PRODUCT_IDS/,
    );
  });
});

/* ------------------------------ Cliente API ------------------------------ */

describe("cliente da API", () => {
  function fakeFetch(handler: (url: string, init?: RequestInit) => Response) {
    const calls: string[] = [];
    const f = (async (url: string | URL, init?: RequestInit) => {
      calls.push(String(url));
      return handler(String(url), init);
    }) as typeof fetch;
    return { f, calls };
  }
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  test("reutiliza o token OAuth e envia os headers documentados", async () => {
    const seen: Record<string, string>[] = [];
    const { f, calls } = fakeFetch((url, init) => {
      if (url.endsWith("/oauth/token")) {
        assert.match(String(init?.body), /client_id=id&client_secret=sec/);
        return json(200, { access_token: "tok", expires_in: 86400 });
      }
      seen.push(Object.fromEntries(new Headers(init?.headers).entries()));
      return json(200, { id: "o1", status: "paid", product: { id: "p" }, customer: { email: "a@b.com" } });
    });
    const api = new KiwifyApi({ clientId: "id", clientSecret: "sec", accountId: "acc", fetch: f, sleep: async () => {} });
    await api.getSale("o1");
    await api.getSale("o1");
    assert.equal(calls.filter((c) => c.endsWith("/oauth/token")).length, 1);
    assert.equal(seen[0].authorization, "Bearer tok");
    assert.equal(seen[0]["x-kiwify-account-id"], "acc");
  });

  test("429 faz backoff e tenta de novo; 404 vira not_found; 5xx persistente vira transient", async () => {
    let n = 0;
    const { f } = fakeFetch((url) => {
      if (url.endsWith("/oauth/token")) return json(200, { access_token: "t", expires_in: 3600 });
      if (url.includes("/sales/retry")) return ++n === 1 ? json(429, {}) : json(200, { id: "retry", status: "paid" });
      if (url.includes("/sales/missing")) return json(404, {});
      return json(503, {});
    });
    const api = new KiwifyApi({ clientId: "i", clientSecret: "s", accountId: "a", fetch: f, sleep: async () => {}, maxRetries: 2 });
    assert.equal((await api.getSale("retry")).status, "paid");
    await assert.rejects(api.getSale("missing"), (e: KiwifyApiError) => e.kind === "not_found");
    await assert.rejects(api.getSale("down"), (e: KiwifyApiError) => e.kind === "transient");
  });

  test("respeita o limite por minuto", async () => {
    let clock = 0;
    const slept: number[] = [];
    const { f } = fakeFetch((url) =>
      url.endsWith("/oauth/token") ? json(200, { access_token: "t", expires_in: 3600 }) : json(200, { id: "x", status: "paid" }),
    );
    const api = new KiwifyApi({
      clientId: "i", clientSecret: "s", accountId: "a", fetch: f, maxPerMinute: 3,
      now: () => clock,
      sleep: async (ms) => { slept.push(ms); clock += ms; },
    });
    for (let i = 0; i < 4; i++) await api.getSale("x");
    assert.ok(slept.length >= 1, "deve esperar ao atingir o limite");
  });
});

/* ------------------- Homologação (Prompt 04): contrato e piloto ------------------- */

describe("paginação e relatório do importador", () => {
  test("hasNextPage usa count e page_size devolvido, não só o tamanho pedido", () => {
    assert.equal(hasNextPage({ pageNumber: 1, received: 20, requestedPageSize: 50, returnedPageSize: 20, count: 45 }), true);
    assert.equal(hasNextPage({ pageNumber: 3, received: 5, requestedPageSize: 50, returnedPageSize: 20, count: 45 }), false);
    assert.equal(hasNextPage({ pageNumber: 1, received: 20, requestedPageSize: 50, returnedPageSize: 20 }), true);
    assert.equal(hasNextPage({ pageNumber: 1, received: 0, requestedPageSize: 50, count: 10 }), false);
    assert.equal(hasNextPage({ pageNumber: 1, received: 10, requestedPageSize: 50 }), false);
  });

  test("API que limita o page_size abaixo do pedido: lê todas as páginas e totaliza por status", async () => {
    const base = new FakeSales();
    for (let i = 1; i <= 5; i++) base.set(`p${i}`, i === 5 ? "refunded" : "paid");
    // Simula a API devolvendo no máximo 2 por página (pedido: 50), com pagination.count.
    const capped: ImportApi = {
      getSale: (id) => base.getSale(id),
      async listSales(p) {
        const r = await base.listSales({ ...p, pageSize: 2 });
        const total = (await base.listSales({ ...p, pageNumber: 1, pageSize: 1000 })).sales.length;
        return { sales: r.sales, pageSize: 2, count: total };
      },
    };
    const r = await runImport({ api: capped, store: null, allowedProductIds: [PRODUCT], start: new Date("2025-01-01"), end: new Date("2025-01-31"), execute: false, pageSize: 50 });
    assert.equal(r.counts.vendas_lidas, 5);
    assert.equal(r.counts.paginacao_divergente, 0);
    assert.deepEqual(r.byStatus, { paid: 4, refunded: 1 });
  });

  test("divergência entre lidas e pagination.count vai para revisão", async () => {
    const base = new FakeSales();
    base.set("q1", "paid");
    // A API afirma 3 vendas no filtro, mas só entrega 1.
    const odd: ImportApi = {
      getSale: (id) => base.getSale(id),
      async listSales(p) {
        return { ...(await base.listSales(p)), pageSize: p.pageSize, count: 3 };
      },
    };
    const r = await runImport({ api: odd, store: null, allowedProductIds: [PRODUCT], start: new Date("2025-01-01"), end: new Date("2025-01-31"), execute: false, pageSize: 50 });
    assert.equal(r.counts.paginacao_divergente, 1);
    assert.match(r.review[0].reason, /paginacao_lidas_1_count_3/);
  });

  test("formatos de data das consultas", () => {
    const d = new Date("2026-11-01T00:00:00Z");
    assert.equal(kiwifyDate(d), "2026-11-01 00:00:00.000");
    assert.equal(kiwifyDate(d, true, "iso"), "2026-11-01T23:59:59.999Z");
  });
});

describe("probe do contrato (sem PII)", () => {
  test("describeShape mostra tipos e padrões de data, nunca valores pessoais", () => {
    const sale = {
      id: "ord-123",
      status: "paid",
      created_at: "2023-10-31T16:53:05.119Z",
      product: { id: "prod-1", name: "Produto" },
      customer: { email: "pessoa@exemplo.com", cpf: "12345678900", name: "Fulana" },
      tags: [],
      net_amount: 100,
    };
    const shape = JSON.stringify(describeShape(sale));
    assert.ok(!shape.includes("pessoa@exemplo.com") && !shape.includes("12345678900") && !shape.includes("Fulana") && !shape.includes("ord-123"));
    assert.ok(shape.includes("enum:paid"));
    assert.ok(shape.includes("data:9999-99-99T99:99:99.999Z"));
    assert.ok(shape.includes('"email":"string(18)"'));
  });
});
