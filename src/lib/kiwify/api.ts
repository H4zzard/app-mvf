/**
 * Cliente mínimo da API pública da Kiwify (somente servidor/CLI).
 *
 * - Base: https://public-api.kiwify.com/v1 · headers Authorization Bearer + x-kiwify-account-id.
 * - Token OAuth: POST /oauth/token (form-urlencoded client_id, client_secret),
 *   reutilizado até 5 min antes de `expires_in` (não emite token a cada chamada).
 * - Limite oficial: 100 req/min → janela local de 90 req/min + backoff em 429/5xx.
 * Módulo puro com `fetch`, relógio e `sleep` injetáveis (testável sem rede).
 */
import type { KiwifySale } from "./types.ts";
import { normalizeEmail } from "./rules.ts";

export type KiwifyErrorKind = "not_found" | "transient" | "auth" | "bad_request";

export class KiwifyApiError extends Error {
  readonly kind: KiwifyErrorKind;
  readonly status: number | null;
  constructor(kind: KiwifyErrorKind, status: number | null, message: string) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

export interface KiwifyApiConfig {
  clientId: string;
  clientSecret: string;
  accountId: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  maxPerMinute?: number;
  maxRetries?: number;
}

export interface SalesPage {
  sales: KiwifySale[];
  pageNumber: number;
  /** page_size efetivamente devolvido pela API (pode ser menor que o pedido). */
  pageSize: number;
  /** pagination.count (total de vendas do filtro), quando a API informar. */
  count: number | null;
}

/** Formato das datas enviadas em start_date/end_date (não confirmado na doc; ver `kiwify probe`). */
export type KiwifyDateStyle = "space" | "iso";

const TOKEN_MARGIN_MS = 5 * 60 * 1000;

export class KiwifyApi {
  private readonly cfg: Required<Omit<KiwifyApiConfig, "fetch" | "now" | "sleep">>;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private token: { value: string; expiresAt: number } | null = null;
  private calls: number[] = [];

  constructor(config: KiwifyApiConfig) {
    this.cfg = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      accountId: config.accountId,
      baseUrl: (config.baseUrl ?? "https://public-api.kiwify.com/v1").replace(/\/$/, ""),
      maxPerMinute: config.maxPerMinute ?? 90,
      maxRetries: config.maxRetries ?? 3,
    };
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    this.now = config.now ?? Date.now;
    this.sleep = config.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  private async throttle(): Promise<void> {
    const windowStart = this.now() - 60_000;
    this.calls = this.calls.filter((t) => t > windowStart);
    if (this.calls.length >= this.cfg.maxPerMinute) {
      await this.sleep(this.calls[0] - windowStart + 50);
      return this.throttle();
    }
    this.calls.push(this.now());
  }

  private async getToken(force = false): Promise<string> {
    if (!force && this.token && this.now() < this.token.expiresAt - TOKEN_MARGIN_MS) return this.token.value;
    await this.throttle();
    const res = await this.fetchImpl(`${this.cfg.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: this.cfg.clientId, client_secret: this.cfg.clientSecret }).toString(),
    });
    if (!res.ok) {
      throw new KiwifyApiError(res.status >= 500 ? "transient" : "auth", res.status, `oauth_token_${res.status}`);
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number | string };
    if (!json.access_token) throw new KiwifyApiError("auth", res.status, "oauth_token_missing");
    const seconds = Number(json.expires_in) > 0 ? Number(json.expires_in) : 3600;
    this.token = { value: json.access_token, expiresAt: this.now() + seconds * 1000 };
    return this.token.value;
  }

  private async request(path: string, query?: Record<string, string>): Promise<unknown> {
    const url = new URL(`${this.cfg.baseUrl}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        const token = await this.getToken();
        await this.throttle();
        res = await this.fetchImpl(url, {
          headers: { authorization: `Bearer ${token}`, "x-kiwify-account-id": this.cfg.accountId },
        });
      } catch (e) {
        if (e instanceof KiwifyApiError && e.kind !== "transient") throw e;
        if (attempt >= this.cfg.maxRetries) throw new KiwifyApiError("transient", null, "network_error");
        await this.sleep(1000 * 2 ** attempt);
        continue;
      }
      if (res.ok) return res.json();
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        await this.getToken(true);
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= this.cfg.maxRetries) throw new KiwifyApiError("transient", res.status, `http_${res.status}`);
        const retryAfter = Number(res.headers.get("retry-after"));
        await this.sleep(retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt);
        continue;
      }
      if (res.status === 404) throw new KiwifyApiError("not_found", 404, "http_404");
      if (res.status === 401 || res.status === 403) throw new KiwifyApiError("auth", res.status, `http_${res.status}`);
      throw new KiwifyApiError("bad_request", res.status, `http_${res.status}`);
    }
  }

  /** Resposta crua de GET /sales (só para `kiwify probe`; nunca logar o conteúdo, só a forma). */
  async rawListSales(query: Record<string, string>): Promise<unknown> {
    return this.request("/sales", query);
  }

  /** Estado ATUAL de uma venda (fonte da verdade para conceder acesso). */
  async getSale(orderId: string): Promise<KiwifySale> {
    try {
      return normalizeSale(await this.request(`/sales/${encodeURIComponent(orderId)}`));
    } catch (e) {
      // A doc lista 400 para consultas inválidas: ID inexistente/fictício é tratado como não encontrado.
      if (e instanceof KiwifyApiError && e.kind === "bad_request") throw new KiwifyApiError("not_found", e.status, e.message);
      throw e;
    }
  }

  async listSales(params: {
    startDate: string;
    endDate: string;
    productId: string;
    pageNumber: number;
    pageSize: number;
  }): Promise<SalesPage> {
    const json = (await this.request("/sales", {
      start_date: params.startDate,
      end_date: params.endDate,
      product_id: params.productId,
      page_number: String(params.pageNumber),
      page_size: String(params.pageSize),
    })) as { data?: unknown[]; pagination?: { page_number?: unknown; page_size?: unknown; count?: unknown } };
    const num = (v: unknown) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
    return {
      sales: (json.data ?? []).map(normalizeSale),
      pageNumber: num(json.pagination?.page_number) ?? params.pageNumber,
      pageSize: num(json.pagination?.page_size) ?? params.pageSize,
      count: num(json.pagination?.count),
    };
  }
}

/** Normaliza um item de venda usando apenas campos documentados. */
export function normalizeSale(raw: unknown): KiwifySale {
  const r = (raw ?? {}) as Record<string, unknown>;
  const product = (r.product ?? {}) as Record<string, unknown>;
  const customer = (r.customer ?? {}) as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : typeof r.order_id === "string" ? r.order_id : null;
  if (!id) throw new KiwifyApiError("bad_request", null, "sale_without_id");
  return {
    id,
    status: typeof r.status === "string" ? r.status.toLowerCase() : "unknown",
    productId: product.id != null ? String(product.id) : null,
    customerEmail: normalizeEmail(customer.email),
    createdAt: typeof r.created_at === "string" ? r.created_at : null,
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : null,
  };
}

/**
 * Formato de data das consultas. Padrão "space" = exemplo da doc geral
 * ("2020-07-10 15:00:00.000"); "iso" = "2020-07-10T15:00:00.000Z". A doc de
 * GET /sales não confirma qual é aceito: conferir com `npm run kiwify -- probe`.
 */
export function kiwifyDate(d: Date, endOfDay = false, style: KiwifyDateStyle = "space"): string {
  const day = d.toISOString().slice(0, 10);
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return style === "iso" ? `${day}T${time}Z` : `${day} ${time}`;
}

/** Converte datas da Kiwify ("YYYY-MM-DD HH:mm:ss" ou ISO) em ms, tratando como UTC. */
export function parseKiwifyTime(value: string | null): number | null {
  if (!value) return null;
  const v = value.includes("T") ? value : value.replace(" ", "T");
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Descreve a FORMA de um JSON sem expor valores: tipos, nomes de campos e, para
 * strings com cara de data, o padrão (dígitos viram "9"). Usado por `kiwify probe`
 * para confirmar o contrato real sem imprimir e-mail, CPF, nome ou IDs.
 */
/** Campos de enumeração sem dado pessoal cujo valor pode ser exibido no probe. */
const ENUM_KEYS = new Set(["status", "type", "sale_type", "payment_method", "currency"]);

export function describeShape(value: unknown, depth = 0, key = ""): unknown {
  if (depth > 6) return "…";
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length === 0 ? ["(vazio)"] : [describeShape(value[0], depth + 1)];
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = describeShape(v, depth + 1, k);
    return out;
  }
  if (typeof value === "string") {
    if (ENUM_KEYS.has(key) && /^[a-z_]{1,30}$/i.test(value)) return `enum:${value}`;
    if (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2})?$/.test(value)) {
      return `data:${value.replace(/\d/g, "9")}`;
    }
    return `string(${value.length})`;
  }
  return typeof value;
}
