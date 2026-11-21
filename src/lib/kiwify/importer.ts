/**
 * Importação de compradoras antigas via GET /sales (webhooks não são retroativos).
 *
 * - Janelas de no máximo 90 dias (restrição documentada), por produto permitido, paginadas.
 * - DRY-RUN por padrão: só lê e conta. Nada é gravado e nenhuma conta é criada.
 * - Execução: confirma cada venda elegível com GET /sales/{id} (estado atual)
 *   antes de conceder; idempotente (pode rodar de novo); retomável por cursor.
 * - Relatório só com contagens e IDs de pedido — nunca e-mails/CPF.
 * Módulo puro (API e store injetados).
 */
import type { AccessStore, ImportCursor, KiwifySale } from "./types.ts";
import { decideAccess, isAllowedProduct, sanitizeError } from "./rules.ts";
import { KiwifyApiError, kiwifyDate, type KiwifyDateStyle } from "./api.ts";
import { reconcileSale } from "../access/provisioning.ts";

export const MAX_WINDOW_DAYS = 90;

export interface ImportApi {
  listSales(p: { startDate: string; endDate: string; productId: string; pageNumber: number; pageSize: number }): Promise<{
    sales: KiwifySale[];
    pageSize?: number | null;
    count?: number | null;
  }>;
  getSale(orderId: string): Promise<KiwifySale>;
}

/**
 * Decide se há próxima página. Não confia só em “veio menos que o pedido”:
 * a API pode limitar o page_size (máximo não documentado). Usa, nesta ordem,
 * pagination.count, o page_size devolvido e página vazia como fim.
 */
export function hasNextPage(p: { pageNumber: number; received: number; requestedPageSize: number; returnedPageSize?: number | null; count?: number | null }): boolean {
  if (p.received === 0) return false;
  const effective = p.returnedPageSize && p.returnedPageSize > 0 ? p.returnedPageSize : p.requestedPageSize;
  if (typeof p.count === "number") return p.pageNumber * effective < p.count;
  return p.received >= effective;
}

export interface ImportOptions {
  api: ImportApi;
  /** Obrigatório para execução; opcional no dry-run (sem ele, não checa contas existentes). */
  store: AccessStore | null;
  allowedProductIds: string[];
  start: Date;
  end: Date;
  execute: boolean;
  pageSize?: number;
  resumeRunId?: string;
  dateStyle?: KiwifyDateStyle;
  log?: (line: string) => void;
}

export interface ImportReport {
  runId: string | null;
  mode: "dry_run" | "execute";
  windows: number;
  counts: Record<string, number>;
  /** IDs de pedido que precisam de revisão humana (sem dados pessoais). */
  review: { orderId: string; reason: string }[];
  /** Contagem por status Kiwify das vendas dos produtos permitidos (sem duplicatas). */
  byStatus: Record<string, number>;
}

/** Divide [start, end] em janelas de até 90 dias (inclusive). */
export function buildWindows(start: Date, end: Date, maxDays = MAX_WINDOW_DAYS): { start: Date; end: Date }[] {
  if (end < start) throw new Error("Data final anterior à inicial.");
  const day = 86_400_000;
  const windows: { start: Date; end: Date }[] = [];
  let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  while (cursor <= last) {
    const windowEnd = Math.min(cursor + (maxDays - 1) * day, last);
    windows.push({ start: new Date(cursor), end: new Date(windowEnd) });
    cursor = windowEnd + day;
  }
  return windows;
}

export async function runImport(opts: ImportOptions): Promise<ImportReport> {
  const { api, store, allowedProductIds, execute } = opts;
  const log = opts.log ?? (() => {});
  const pageSize = opts.pageSize ?? 50;
  if (allowedProductIds.length === 0) throw new Error("KIWIFY_ALLOWED_PRODUCT_IDS vazio: nada pode ser importado.");
  if (execute && !store) throw new Error("Execução real exige acesso ao banco (service role).");

  const windows = buildWindows(opts.start, opts.end);
  const counts: Record<string, number> = {
    vendas_lidas: 0,
    duplicadas_na_leitura: 0,
    produto_nao_permitido: 0,
    elegiveis_pagas: 0,
    reembolsadas_ou_chargeback: 0,
    outros_status: 0,
    sem_email: 0,
    alunas_unicas_elegiveis: 0,
    contas_ja_existentes: 0,
    contas_a_criar: 0,
    concedidas: 0,
    ja_ativas: 0,
    revogadas: 0,
    status_mudou_na_confirmacao: 0,
    pendentes_api_indisponivel: 0,
    paginacao_divergente: 0,
  };
  /** Totais por status bruto da Kiwify (sem PII), para conferir com o painel. */
  const byStatus: Record<string, number> = {};
  const review: ImportReport["review"] = [];
  const seenOrders = new Set<string>();
  const eligibleEmails = new Set<string>();

  let runId: string | null = null;
  let cursor: ImportCursor = { productIndex: 0, windowIndex: 0, pageNumber: 1 };
  if (execute && store) {
    if (opts.resumeRunId) {
      const run = await store.getImportRun(opts.resumeRunId);
      if (!run) throw new Error("Execução para retomar não encontrada.");
      runId = run.id;
      cursor = run.cursor;
      log(`Retomando execução ${runId} (produto ${cursor.productIndex + 1}, janela ${cursor.windowIndex + 1}, página ${cursor.pageNumber}).`);
    } else {
      runId = await store.createImportRun({
        mode: "execute",
        rangeStart: kiwifyDate(opts.start).slice(0, 10),
        rangeEnd: kiwifyDate(opts.end).slice(0, 10),
        cursor,
      });
    }
  }

  try {
    for (let p = cursor.productIndex; p < allowedProductIds.length; p++) {
      const productId = allowedProductIds[p];
      const firstWindow = p === cursor.productIndex ? cursor.windowIndex : 0;
      for (let w = firstWindow; w < windows.length; w++) {
        let page = p === cursor.productIndex && w === cursor.windowIndex ? cursor.pageNumber : 1;
        let readInWindow = 0;
        for (;;) {
          const res = await api.listSales({
            startDate: kiwifyDate(windows[w].start, false, opts.dateStyle),
            endDate: kiwifyDate(windows[w].end, true, opts.dateStyle),
            productId,
            pageNumber: page,
            pageSize,
          });
          const { sales } = res;
          readInWindow += sales.length;
          for (const sale of sales) await handleSale(sale);
          log(`Produto ${p + 1}/${allowedProductIds.length} · janela ${w + 1}/${windows.length} · página ${page}: ${sales.length} vendas`);
          if (execute && store && runId) {
            await store.updateImportRun(runId, { cursor: { productIndex: p, windowIndex: w, pageNumber: page + 1 }, counts });
          }
          const more = hasNextPage({ pageNumber: page, received: sales.length, requestedPageSize: pageSize, returnedPageSize: res.pageSize, count: res.count });
          if (!more) {
            // Sem retomada no meio da janela, o total lido deve bater com pagination.count.
            const fromStart = !(p === cursor.productIndex && w === cursor.windowIndex && cursor.pageNumber > 1);
            if (fromStart && typeof res.count === "number" && res.count !== readInWindow) {
              counts.paginacao_divergente++;
              review.push({ orderId: `(produto ${p + 1}, janela ${w + 1})`, reason: `paginacao_lidas_${readInWindow}_count_${res.count}` });
            }
            break;
          }
          page += 1;
        }
      }
    }
    counts.alunas_unicas_elegiveis = eligibleEmails.size;
    if (execute && store && runId) await store.updateImportRun(runId, { status: "completed", counts });
  } catch (e) {
    if (execute && store && runId) await store.updateImportRun(runId, { status: "failed", counts, error: sanitizeError(e) });
    throw e;
  }

  return { runId, mode: execute ? "execute" : "dry_run", windows: windows.length, counts, review, byStatus };

  async function handleSale(listed: KiwifySale) {
    counts.vendas_lidas++;
    if (seenOrders.has(listed.id)) {
      counts.duplicadas_na_leitura++;
      return;
    }
    seenOrders.add(listed.id);
    if (!isAllowedProduct(listed.productId, allowedProductIds)) {
      counts.produto_nao_permitido++;
      return;
    }
    byStatus[listed.status] = (byStatus[listed.status] ?? 0) + 1;
    const decision = decideAccess(listed.status);
    if (decision === "revoke") counts.reembolsadas_ou_chargeback++;
    else if (decision === "hold") counts.outros_status++;
    else {
      counts.elegiveis_pagas++;
      if (!listed.customerEmail) {
        counts.sem_email++;
        review.push({ orderId: listed.id, reason: "sale_without_email" });
        return;
      }
      if (!eligibleEmails.has(listed.customerEmail)) {
        eligibleEmails.add(listed.customerEmail);
        if (store) {
          const existing = await store.findUserIdByEmail(listed.customerEmail);
          if (existing) counts.contas_ja_existentes++;
          else counts.contas_a_criar++;
        }
      }
    }

    if (!execute || !store) return;
    if (decision === "hold") return;

    // Confirma o estado atual antes de qualquer gravação.
    let current: KiwifySale;
    try {
      current = await api.getSale(listed.id);
    } catch (e) {
      if (e instanceof KiwifyApiError && e.kind === "not_found") {
        review.push({ orderId: listed.id, reason: "sale_not_found_on_confirm" });
      } else {
        counts.pendentes_api_indisponivel++;
        review.push({ orderId: listed.id, reason: "api_unavailable" });
      }
      return;
    }
    if (decideAccess(current.status) !== decision) counts.status_mudou_na_confirmacao++;
    const r = await reconcileSale(current, { store, allowedProductIds, source: "import" });
    if (r.outcome === "granted") counts.concedidas++;
    else if (r.outcome === "already_active") counts.ja_ativas++;
    else if (r.outcome === "revoked") counts.revogadas++;
    else if (r.outcome === "needs_review") review.push({ orderId: current.id, reason: r.reason ?? "needs_review" });
  }
}
