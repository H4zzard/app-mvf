/**
 * Postgres local para testes (PGlite = Postgres em WASM, sem Docker).
 *
 * Cria um STUB mínimo do ambiente Supabase — papéis anon/authenticated/
 * service_role, schema auth com auth.users e auth.uid() lendo o claim do
 * JWT como o Supabase faz — e aplica as migrations reais de supabase/migrations.
 * Não substitui um teste contra o Supabase de verdade (ver docs/BANCO.md).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "migrations");

const SUPABASE_STUB = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table if not exists auth.users (id uuid primary key, email text unique);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Como no Supabase: privilégios padrão amplos em public (a migration deve revogá-los).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export function migrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(migrationSql());
  return db;
}

export async function createAuthUser(db: PGlite, email: string): Promise<string> {
  const id = randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  await db.query("insert into public.profiles (user_id, email) values ($1, $2)", [id, email]);
  return id;
}

export async function grantEntitlement(db: PGlite, userId: string, orderId: string, email: string) {
  await db.query(
    `insert into public.purchase_entitlements
       (order_id, product_id, customer_email, user_id, kiwify_status, access_state, source, granted_at)
     values ($1, 'prod-mvf', $2, $3, 'paid', 'active', 'import', now())`,
    [orderId, email, userId],
  );
}

/** Executa como usuária autenticada (role authenticated + claim sub), como o PostgREST faz. */
export async function asUser<T>(db: PGlite, userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    return fn(tx);
  });
}

export async function asAnon<T>(db: PGlite, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return fn(tx);
  });
}

/** Captura o erro de uma operação que DEVE falhar. */
export async function expectError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error("Era esperado um erro, mas a operação foi aceita.");
}
