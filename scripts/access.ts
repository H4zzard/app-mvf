/**
 * Acesso MANUAL de aluna (testes e casos aprovados pelo operador), sem pedido Kiwify.
 * Dry-run por padrão; grava auditoria em admin_audit_log; não envia e-mail; não loga e-mails.
 *
 *   node --env-file=.env.homolog scripts/access.ts grant  --email pessoa@dominio --actor "Nome" [--reason "teste"]
 *   node --env-file=.env.homolog scripts/access.ts grant  --email … --actor "…" --execute
 *   node --env-file=.env.homolog scripts/access.ts revoke --email … --actor "…" --execute
 *
 * - grant: cria a conta Auth se não existir (e-mail confirmado, sem envio) e um direito
 *   `purchase_entitlements` com source = "manual" (pedido sintético `manual-<hash>`), ativo.
 * - revoke: marca esse direito manual como revogado (não apaga conta nem progresso).
 * Idempotente: repetir não duplica conta nem direito.
 */
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { readConfig } from "../src/lib/config/env.ts";
import { normalizeEmail } from "../src/lib/kiwify/rules.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string" },
    actor: { type: "string" },
    reason: { type: "string", default: "acesso manual de teste" },
    execute: { type: "boolean", default: false },
  },
});

function die(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

const command = positionals[0];
if (command !== "grant" && command !== "revoke") die("Comando: grant | revoke");
const email = normalizeEmail(values.email);
if (!email) die("Informe --email válido.");
if (!values.actor || values.actor.trim().length < 3) die("Informe --actor (quem está executando, para auditoria).");

const config = readConfig({ ...process.env, NODE_ENV: "production" });
if (!config.supabase || !config.serviceRoleKey) die("Exige NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (use --env-file).");
const db = createClient(config.supabase.url, config.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Pedido sintético estável por e-mail (sem expor o e-mail).
const orderId = `manual-${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;
const masked = email.replace(/^(.).*(@.*)$/, "$1***$2");

const { data: found, error: findError } = await db.rpc("admin_find_user_id_by_email", { p_email: email });
if (findError) die(`Falha ao buscar conta: ${findError.message}`);
let userId = (found as string | null) ?? null;
const { data: existing, error: entError } = await db.from("purchase_entitlements").select("access_state").eq("order_id", orderId).maybeSingle();
if (entError) die(`Falha ao ler direito: ${entError.message}`);

console.log(
  `${values.execute ? "EXECUÇÃO REAL" : "DRY-RUN"} · ${command} · ${masked} · banco ${new URL(config.supabase.url).host} · ` +
    `conta ${userId ? "encontrada" : "inexistente"} · direito manual ${existing ? existing.access_state : "inexistente"}`,
);
if (!values.execute) {
  console.log("Nada foi gravado. Para aplicar, repita com --execute.");
  process.exit(0);
}

if (command === "grant") {
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true, app_metadata: { provisioned_by: "access-cli" } });
    if (error && error.code !== "email_exists") die(`Falha ao criar conta: ${error.message}`);
    userId = data?.user?.id ?? null;
    if (!userId) {
      const again = await db.rpc("admin_find_user_id_by_email", { p_email: email });
      userId = (again.data as string | null) ?? null;
    }
    if (!userId) die("Conta não pôde ser criada nem encontrada.");
  }
  const { error: pErr } = await db.from("profiles").upsert({ user_id: userId, email }, { onConflict: "user_id", ignoreDuplicates: true });
  if (pErr) die(`Falha ao criar perfil: ${pErr.message}`);
  const now = new Date().toISOString();
  const { error: eErr } = await db.from("purchase_entitlements").upsert(
    {
      order_id: orderId,
      product_id: "manual",
      customer_email: email,
      user_id: userId,
      kiwify_status: "manual",
      access_state: "active",
      source: "manual",
      granted_at: now,
      revoked_at: null,
      revoked_reason: null,
      last_verified_at: now,
      updated_at: now,
    },
    { onConflict: "order_id" },
  );
  if (eErr) die(`Falha ao conceder acesso: ${eErr.message}`);
} else {
  if (!existing) die("Não há acesso manual para este e-mail.");
  const now = new Date().toISOString();
  const { error } = await db
    .from("purchase_entitlements")
    .update({ access_state: "revoked", revoked_reason: "manual", revoked_at: now, updated_at: now })
    .eq("order_id", orderId);
  if (error) die(`Falha ao revogar: ${error.message}`);
}

const { error: auditError } = await db.from("admin_audit_log").insert({
  actor: values.actor,
  action: command === "grant" ? "manual_access_grant" : "manual_access_revoke",
  target_user_id: userId,
  details: { order_id: orderId, reason: values.reason, via: "access-cli" },
});
if (auditError) die(`Acesso aplicado, mas a auditoria falhou: ${auditError.message}`);
console.log(`✔ ${command === "grant" ? "Acesso manual ativo" : "Acesso manual revogado"} para ${masked}.`);
