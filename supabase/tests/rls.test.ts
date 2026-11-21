/**
 * Testes de RLS e funções SQL contra Postgres real (PGlite) com as migrations
 * do projeto. Cada operação roda como o papel do PostgREST (authenticated/anon).
 */
import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { PGlite } from "@electric-sql/pglite";
import { asAnon, asUser, createAuthUser, createTestDb, expectError, grantEntitlement, migrationSql } from "./pg-harness.ts";

let db: PGlite;
let alice: string; // compradora ativa
let bruna: string; // compradora ativa
let carla: string; // conta Auth sem compra
let equipe: string; // suporte, sem compra

before(async () => {
  db = await createTestDb();
  alice = await createAuthUser(db, "alice@example.com");
  bruna = await createAuthUser(db, "bruna@example.com");
  carla = await createAuthUser(db, "carla@example.com");
  equipe = await createAuthUser(db, "suporte@example.com");
  await grantEntitlement(db, alice, "order-a", "alice@example.com");
  await grantEntitlement(db, bruna, "order-b", "bruna@example.com");
  await db.query("insert into public.user_roles (user_id, role, granted_by) values ($1, 'support', 'teste')", [equipe]);
  // Bruna já tem progresso e plano.
  await asUser(db, bruna, async (tx) => {
    await tx.query("select public.set_task_status('t-fundamentos', 'completed')");
  });
});

const access = async (uid: string) =>
  asUser(db, uid, async (tx) => (await tx.query<{ a: { has_access: boolean; roles: string[] } }>("select public.my_access() as a")).rows[0].a);

describe("migration", () => {
  test("é idempotente (reaplicar não falha)", async () => {
    await db.exec(migrationSql());
  });
});

describe("acesso derivado de direito ativo", () => {
  test("compradora ativa tem acesso; conta sem compra não; equipe sim (papel)", async () => {
    assert.equal((await access(alice)).has_access, true);
    assert.equal((await access(carla)).has_access, false);
    const e = await access(equipe);
    assert.equal(e.has_access, true);
    assert.deepEqual(e.roles, ["support"]);
  });

  test("conta sem compra não lê nem escreve dados privados", async () => {
    await asUser(db, carla, async (tx) => {
      assert.equal((await tx.query("select * from public.profiles")).rows.length, 0);
    });
    const msg = await expectError(
      asUser(db, carla, (tx) => tx.query("select public.set_task_status('t-fundamentos', 'completed')")),
    );
    assert.match(msg, /row-level security/);
  });
});

describe("isolamento entre alunas", () => {
  test("A não lê o progresso de B", async () => {
    const rows = await asUser(db, alice, (tx) => tx.query("select * from public.user_task_progress"));
    assert.equal(rows.rows.length, 0);
  });

  test("A não insere linha com user_id de B", async () => {
    const msg = await expectError(
      asUser(db, alice, (tx) =>
        tx.query("insert into public.user_task_progress (user_id, task_id, status) values ($1, 't-perfil', 'completed')", [bruna]),
      ),
    );
    assert.match(msg, /row-level security/);
  });

  test("A não altera linhas de B (0 linhas afetadas) nem move a própria linha para B", async () => {
    const r = await asUser(db, alice, (tx) =>
      tx.query("update public.user_task_progress set status = 'pending' where user_id = $1", [bruna]),
    );
    assert.equal(r.affectedRows, 0);
    await asUser(db, alice, (tx) => tx.query("select public.set_task_status('t-perfil', 'completed')"));
    const msg = await expectError(
      asUser(db, alice, (tx) => tx.query("update public.user_task_progress set user_id = $1 where task_id = 't-perfil'", [bruna])),
    );
    assert.match(msg, /row-level security/);
  });
});

describe("tabelas restritas ao servidor", () => {
  test("aluna não lê nem cria compras, eventos, importações ou auditoria", async () => {
    for (const table of ["purchase_entitlements", "webhook_events", "import_runs", "admin_audit_log"]) {
      const msg = await expectError(asUser(db, alice, (tx) => tx.query(`select * from public.${table}`)));
      assert.match(msg, /permission denied/, table);
    }
    const msg = await expectError(
      asUser(db, alice, (tx) =>
        tx.query(
          "insert into public.purchase_entitlements (order_id, product_id, customer_email, user_id, kiwify_status, access_state, source) values ('x','p','alice@example.com',$1,'paid','active','manual')",
          [alice],
        ),
      ),
    );
    assert.match(msg, /permission denied/);
  });

  test("aluna não se atribui papel nem troca o e-mail do perfil", async () => {
    const m1 = await expectError(
      asUser(db, alice, (tx) => tx.query("insert into public.user_roles (user_id, role, granted_by) values ($1, 'admin', 'eu')", [alice])),
    );
    assert.match(m1, /permission denied/);
    const m2 = await expectError(
      asUser(db, alice, (tx) => tx.query("update public.profiles set email = 'outra@example.com' where user_id = $1", [alice])),
    );
    assert.match(m2, /permission denied/);
    const ok = await asUser(db, alice, (tx) =>
      tx.query("update public.profiles set display_name = 'Ali' where user_id = $1", [alice]),
    );
    assert.equal(ok.affectedRows, 1);
  });

  test("busca de usuário por e-mail só para service_role", async () => {
    const msg = await expectError(
      asUser(db, alice, (tx) => tx.query("select public.admin_find_user_id_by_email('bruna@example.com')")),
    );
    assert.match(msg, /permission denied/);
  });

  test("anon não acessa nada", async () => {
    for (const q of ["select * from public.profiles", "select public.my_access()", "select * from public.user_task_progress"]) {
      const msg = await expectError(asAnon(db, (tx) => tx.query(q)));
      assert.match(msg, /permission denied/, q);
    }
  });
});

describe("plano e progresso", () => {
  const apply = (uid: string, expected: number, ids = ["t-boas-vindas"]) =>
    asUser(db, uid, async (tx) =>
      (
        await tx.query<{ r: number }>(
          "select public.apply_onboarding($1::jsonb, 1, '1.0.0', $2::text[], $3::jsonb, $4) as r",
          [JSON.stringify({ experience: "nunca_vendi" }), ids, JSON.stringify({ tasks: ids }), expected],
        )
      ).rows[0].r,
    );

  test("cria revisão 1, depois 2; revisão desatualizada é rejeitada (outro dispositivo)", async () => {
    assert.equal(await apply(alice, 0), 1);
    assert.equal(await apply(alice, 1, ["t-boas-vindas", "t-perfil"]), 2);
    const msg = await expectError(apply(alice, 1));
    assert.match(msg, /revision_conflict/);
    const rows = await asUser(db, alice, (tx) =>
      tx.query<{ revision: number }>("select revision from public.user_plan_snapshots where is_active"),
    );
    assert.deepEqual(rows.rows.map((r) => r.revision), [2]);
  });

  test("rascunho não sobrescreve onboarding concluído", async () => {
    await asUser(db, alice, (tx) => tx.query("select public.save_onboarding_draft('{\"experience\":\"ja_vendi\"}'::jsonb, 1)"));
    const r = await asUser(db, alice, (tx) =>
      tx.query<{ status: string; answers: { experience: string } }>("select status, answers from public.onboarding_submissions"),
    );
    assert.equal(r.rows[0].status, "completed");
    assert.equal(r.rows[0].answers.experience, "nunca_vendi");
  });

  test("uma tarefa em andamento por vez; conclusão guarda data", async () => {
    await asUser(db, alice, async (tx) => {
      await tx.query("select public.set_task_status('t-fundamentos', 'in_progress')");
      await tx.query("select public.set_task_status('t-escolher-produto', 'in_progress')");
      await tx.query("select public.set_task_status('t-boas-vindas', 'completed')");
    });
    const rows = await asUser(db, alice, (tx) =>
      tx.query<{ task_id: string; status: string; completed_at: Date | null }>(
        "select task_id, status, completed_at from public.user_task_progress order by task_id",
      ),
    );
    const by = Object.fromEntries(rows.rows.map((r) => [r.task_id, r]));
    assert.equal(by["t-fundamentos"].status, "pending");
    assert.equal(by["t-escolher-produto"].status, "in_progress");
    assert.ok(by["t-boas-vindas"].completed_at);
  });

  test("ID de tarefa inválido é rejeitado pelo banco", async () => {
    const msg = await expectError(asUser(db, alice, (tx) => tx.query("select public.set_task_status('DROP TABLE', 'completed')")));
    assert.match(msg, /check constraint/);
  });
});

describe("revogação com sessão ainda válida", () => {
  test("após reembolso, a aluna perde leitura e escrita, mas os dados continuam guardados", async () => {
    await db.query(
      "update public.purchase_entitlements set access_state = 'revoked', revoked_at = now() where order_id = 'order-b'",
    );
    assert.equal((await access(bruna)).has_access, false);
    const rows = await asUser(db, bruna, (tx) => tx.query("select * from public.user_task_progress"));
    assert.equal(rows.rows.length, 0);
    const msg = await expectError(
      asUser(db, bruna, (tx) => tx.query("select public.set_task_status('t-perfil', 'completed')")),
    );
    assert.match(msg, /row-level security/);
    const kept = await db.query("select * from public.user_task_progress where user_id = $1", [bruna]);
    assert.equal(kept.rows.length, 1, "progresso preservado para eventual reativação");
  });

  test("dois pedidos: um estornado e outro ativo mantém acesso", async () => {
    await grantEntitlement(db, bruna, "order-b2", "bruna@example.com");
    assert.equal((await access(bruna)).has_access, true);
  });
});
