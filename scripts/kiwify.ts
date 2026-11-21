/**
 * CLI da integração Kiwify (somente servidor/terminal do operador).
 *
 *   npm run kiwify -- import --from 2024-01-01 --to 2026-11-21            # DRY-RUN (padrão)
 *   npm run kiwify -- import --from 2024-01-01 --to 2026-11-21 --execute  # grava
 *   npm run kiwify -- import --resume <runId> --from … --to … --execute   # retoma
 *   npm run kiwify -- reconcile                                            # DRY-RUN
 *   npm run kiwify -- reconcile --execute [--active]                       # reprocessa
 *   npm run kiwify -- probe --from 2026-11-01 --to 2026-11-07                # SÓ LEITURA: forma da resposta, sem valores
 *   npm run kiwify -- grant-order --order <id>[,<id>] [--execute]          # piloto: libera pedidos específicos
 *   (import/probe aceitam --date-style space|iso; padrão space)
 *
 * Lê variáveis de .env.local (nunca commitado). Relatórios sem e-mails/CPF.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { readConfig } from "../src/lib/config/env.ts";
import { KiwifyApi, describeShape, kiwifyDate, type KiwifyDateStyle } from "../src/lib/kiwify/api.ts";
import { decideAccess, isAllowedProduct } from "../src/lib/kiwify/rules.ts";
import { runImport } from "../src/lib/kiwify/importer.ts";
import { processOrderEvent } from "../src/lib/kiwify/webhook.ts";
import { reconcileSale } from "../src/lib/access/provisioning.ts";
import { SupabaseAccessStore } from "../src/lib/access/supabase-store.ts";
import { KiwifyApiError } from "../src/lib/kiwify/api.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    from: { type: "string" },
    to: { type: "string" },
    execute: { type: "boolean", default: false },
    resume: { type: "string" },
    active: { type: "boolean", default: false },
    offline: { type: "boolean", default: false },
    order: { type: "string" },
    product: { type: "string" },
    "date-style": { type: "string", default: "space" },
  },
});

const config = readConfig({ ...process.env, NODE_ENV: "production" });
const command = positionals[0];

function die(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function makeStore() {
  if (!config.supabase || !config.serviceRoleKey) return null;
  const client = createClient(config.supabase.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new SupabaseAccessStore(client);
}

function makeApi() {
  if (!config.kiwify.api) die("Credenciais da API Kiwify ausentes (KIWIFY_CLIENT_ID, KIWIFY_CLIENT_SECRET, KIWIFY_ACCOUNT_ID).");
  return new KiwifyApi(config.kiwify.api);
}

function parseDate(value: string | undefined, name: string): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) die(`Informe --${name} no formato AAAA-MM-DD.`);
  return new Date(`${value}T00:00:00Z`);
}

function dateStyle(): KiwifyDateStyle {
  const v = values["date-style"];
  if (v !== "space" && v !== "iso") die("--date-style deve ser space ou iso.");
  return v;
}

async function importCommand() {
  if (config.kiwify.allowedProductIds.length === 0) die("KIWIFY_ALLOWED_PRODUCT_IDS está vazio: nada pode ser importado.");
  const start = parseDate(values.from, "from");
  const end = parseDate(values.to, "to");
  const store = values.offline ? null : makeStore();
  if (values.execute && !store) die("Execução real exige NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  console.log(
    `${values.execute ? "EXECUÇÃO REAL" : "DRY-RUN (nada será gravado)"} · ${config.kiwify.allowedProductIds.length} produto(s) · ${values.from} → ${values.to}` +
      (store ? ` · banco: ${new URL(config.supabase!.url).host}` : " · sem banco (não checa contas existentes)"),
  );
  const report = await runImport({
    api: makeApi(),
    store,
    allowedProductIds: config.kiwify.allowedProductIds,
    start,
    end,
    execute: values.execute,
    resumeRunId: values.resume,
    dateStyle: dateStyle(),
    log: (l) => console.log(`  ${l}`),
  });
  console.log(`\nResumo (${report.mode}, ${report.windows} janela(s) de até 90 dias${report.runId ? `, execução ${report.runId}` : ""}):`);
  for (const [k, v] of Object.entries(report.counts)) if (v > 0 || !values.execute) console.log(`  ${k.padEnd(30)} ${v}`);
  if (Object.keys(report.byStatus).length) {
    console.log("\nVendas dos produtos permitidos por status Kiwify (compare com o painel):");
    for (const [k, v] of Object.entries(report.byStatus).sort()) console.log(`  ${k.padEnd(30)} ${v}`);
  }
  if (report.review.length) {
    console.log(`\nPara revisão humana (${report.review.length}) — IDs de pedido, sem dados pessoais:`);
    for (const r of report.review.slice(0, 50)) console.log(`  ${r.orderId}  ${r.reason}`);
  }
  if (!values.execute) console.log("\nNada foi gravado. Para aplicar, repita com --execute.");
}

async function reconcileCommand() {
  const store = makeStore();
  if (!store) die("Reconciliação exige NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  const api = makeApi();
  const events = await store.listReprocessableEvents(500);
  console.log(`${values.execute ? "EXECUÇÃO REAL" : "DRY-RUN"} · eventos pendentes: ${events.length}`);
  if (values.execute) {
    for (const e of events) {
      const r = await processOrderEvent(e.orderId, e.eventType, { store, api, allowedProductIds: config.kiwify.allowedProductIds });
      await store.updateWebhookEvent(e.id, { status: r.eventStatus, error: r.error ?? null });
      console.log(`  evento ${e.id} (${e.eventType}) → ${r.result}`);
    }
  }
  if (values.active) {
    const orders = await store.listActiveOrderIds();
    console.log(`Acessos ativos a reverificar na Kiwify: ${orders.length}`);
    const tally: Record<string, number> = {};
    for (const orderId of orders) {
      try {
        const sale = await api.getSale(orderId);
        if (!values.execute) {
          tally[`status_${sale.status}`] = (tally[`status_${sale.status}`] ?? 0) + 1;
          continue;
        }
        const r = await reconcileSale(sale, { store, allowedProductIds: config.kiwify.allowedProductIds, source: "reconcile" });
        tally[r.outcome] = (tally[r.outcome] ?? 0) + 1;
      } catch (e) {
        const kind = e instanceof KiwifyApiError ? e.kind : "erro";
        tally[`falha_${kind}`] = (tally[`falha_${kind}`] ?? 0) + 1;
      }
    }
    console.log(tally);
  }
  if (!values.execute) console.log("Nada foi gravado. Para aplicar, repita com --execute.");
}

/**
 * SÓ LEITURA. Confirma o contrato real de GET /sales antes de importar:
 * formato de data aceito, campos e paginação. Imprime apenas a FORMA (tipos e
 * padrões de data), nunca valores — sem e-mail, nome, CPF ou IDs.
 */
async function probeCommand() {
  const productId = values.product ?? config.kiwify.allowedProductIds[0];
  if (!productId) die("Informe --product ou configure KIWIFY_ALLOWED_PRODUCT_IDS.");
  const start = parseDate(values.from, "from");
  const end = parseDate(values.to, "to");
  if (end.getTime() - start.getTime() > 89 * 86_400_000) die("Use uma janela pequena (≤ 90 dias; sugerido: 7).");
  const api = makeApi();
  console.log("PROBE (somente leitura) · GET /sales · 1 página de até 5 vendas");
  for (const style of ["space", "iso"] as KiwifyDateStyle[]) {
    const query = {
      start_date: kiwifyDate(start, false, style),
      end_date: kiwifyDate(end, true, style),
      product_id: productId,
      page_number: "1",
      page_size: "5",
    };
    try {
      const raw = (await api.rawListSales(query)) as { pagination?: unknown; data?: unknown[] };
      console.log(`\n✔ Formato de data aceito: ${style}  (ex.: ${query.start_date})`);
      console.log("pagination:", JSON.stringify(raw?.pagination ?? null));
      console.log("forma de cada venda (sem valores):");
      console.log(JSON.stringify(describeShape(raw?.data?.[0] ?? null), null, 2));
      console.log(`\nUse --date-style ${style} no import. Registre o resultado em docs/RELATORIO_PILOTO_04.md.`);
      return;
    } catch (e) {
      const kind = e instanceof KiwifyApiError ? `${e.kind}/${e.status ?? "-"}` : "erro";
      console.log(`✖ Formato ${style} recusado ou falhou (${kind}).`);
      if (e instanceof KiwifyApiError && e.kind === "auth") die("Falha de autenticação: confira as credenciais (não cole no chat).");
    }
  }
  die("Nenhum formato de data funcionou. Não importe; registre o bloqueio.");
}

/**
 * Piloto: concede acesso a pedidos ESPECÍFICOS (até 10), confirmando cada um em
 * GET /sales/{id}. Dry-run por padrão. Mesmas regras do webhook/importação.
 */
async function grantOrderCommand() {
  const ids = (values.order ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0 || ids.length > 10) die("Informe --order com 1 a 10 IDs de pedido separados por vírgula.");
  if (config.kiwify.allowedProductIds.length === 0) die("KIWIFY_ALLOWED_PRODUCT_IDS está vazio.");
  const store = makeStore();
  if (values.execute && !store) die("Execução real exige NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  const api = makeApi();
  console.log(`${values.execute ? "EXECUÇÃO REAL" : "DRY-RUN (nada será gravado)"} · ${ids.length} pedido(s)`);
  for (const id of ids) {
    try {
      const sale = await api.getSale(id);
      const allowed = isAllowedProduct(sale.productId, config.kiwify.allowedProductIds);
      const decision = decideAccess(sale.status);
      const hasAccount = store && sale.customerEmail ? Boolean(await store.findUserIdByEmail(sale.customerEmail)) : null;
      if (!values.execute || !store) {
        console.log(`  ${id}: status=${sale.status} produto_permitido=${allowed} decisao=${decision} e-mail=${sale.customerEmail ? "sim" : "não"} conta_existente=${hasAccount ?? "?"}`);
        continue;
      }
      const r = await reconcileSale(sale, { store, allowedProductIds: config.kiwify.allowedProductIds, source: "manual" });
      console.log(`  ${id}: ${r.outcome}${r.reason ? ` (${r.reason})` : ""}${r.createdAccount ? " · conta criada (sem e-mail enviado)" : ""}`);
    } catch (e) {
      console.log(`  ${id}: falha ${e instanceof KiwifyApiError ? e.kind : "erro"}`);
    }
  }
  if (!values.execute) console.log("Nada foi gravado. Para aplicar, repita com --execute.");
}

if (command === "import") await importCommand();
else if (command === "reconcile") await reconcileCommand();
else if (command === "probe") await probeCommand();
else if (command === "grant-order") await grantOrderCommand();
else die("Comando: import | reconcile | probe | grant-order (veja docs/KIWIFY.md).");
