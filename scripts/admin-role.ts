/**
 * Atribuição de papéis de equipe — ÚNICO caminho de bootstrap administrativo.
 * Sem endpoint público. Dry-run por padrão; grava auditoria em admin_audit_log.
 *
 *   npm run admin:role -- grant  --email pessoa@dominio --role admin --actor "Nome do operador"
 *   npm run admin:role -- grant  --email … --role admin --actor "…" --execute [--create-user]
 *   npm run admin:role -- revoke --email … --role admin --actor "…" --execute
 *
 * --create-user cria a identidade Auth SEM enviar e-mail (para equipe que não é compradora).
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { readConfig } from "../src/lib/config/env.ts";
import { normalizeEmail } from "../src/lib/kiwify/rules.ts";

const ROLES = ["admin", "expert", "moderator", "support", "partner"];

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string" },
    role: { type: "string" },
    actor: { type: "string" },
    execute: { type: "boolean", default: false },
    "create-user": { type: "boolean", default: false },
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
if (!values.role || !ROLES.includes(values.role)) die(`--role deve ser um de: ${ROLES.join(", ")}`);
if (!values.actor || values.actor.trim().length < 3) die("Informe --actor (quem está executando, para auditoria).");

const config = readConfig({ ...process.env, NODE_ENV: "production" });
if (!config.supabase || !config.serviceRoleKey) die("Exige NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
const db = createClient(config.supabase.url, config.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: found, error: findError } = await db.rpc("admin_find_user_id_by_email", { p_email: email });
if (findError) die(`Falha ao buscar usuária: ${findError.message}`);
let userId = (found as string | null) ?? null;

console.log(
  `${values.execute ? "EXECUÇÃO REAL" : "DRY-RUN"} · ${command} papel "${values.role}" · banco ${new URL(config.supabase.url).host} · conta ${userId ? "encontrada" : "inexistente"}`,
);
if (!values.execute) {
  console.log("Nada foi gravado. Para aplicar, repita com --execute.");
  process.exit(0);
}

if (!userId) {
  if (command === "revoke") die("Conta não encontrada.");
  if (!values["create-user"]) die("Conta não encontrada. Use --create-user para criar a identidade (sem enviar e-mail).");
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true, app_metadata: { provisioned_by: "admin-cli" } });
  if (error) die(`Falha ao criar conta: ${error.message}`);
  userId = data.user.id;
  const { error: pErr } = await db.from("profiles").upsert({ user_id: userId, email }, { onConflict: "user_id" });
  if (pErr) die(`Falha ao criar perfil: ${pErr.message}`);
}

const op =
  command === "grant"
    ? db.from("user_roles").upsert({ user_id: userId, role: values.role, granted_by: values.actor }, { onConflict: "user_id,role" })
    : db.from("user_roles").delete().eq("user_id", userId).eq("role", values.role);
const { error: opError } = await op;
if (opError) die(`Falha ao ${command === "grant" ? "conceder" : "remover"} papel: ${opError.message}`);

const { error: auditError } = await db.from("admin_audit_log").insert({
  actor: values.actor,
  action: `role_${command}`,
  target_user_id: userId,
  details: { role: values.role, via: "admin-cli" },
});
if (auditError) die(`Papel aplicado, mas a auditoria falhou: ${auditError.message}`);
console.log(`✓ Papel "${values.role}" ${command === "grant" ? "concedido" : "removido"} e registrado na auditoria.`);
