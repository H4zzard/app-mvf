/**
 * Suporte inteligente — RLS e funções SQL (PGlite com as migrations reais).
 * Nada aqui toca o Supabase remoto.
 */
import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { PGlite } from "@electric-sql/pglite";
import { asAnon, asUser, createAuthUser, createTestDb, expectError, grantEntitlement } from "./pg-harness.ts";

let db: PGlite;
let ana: string; // aluna ativa
let bia: string; // aluna ativa
let sem: string; // sem compra
let staff: string; // suporte
let mod: string; // moderação (sem acesso ao suporte)

type J = Record<string, unknown>;
const rpc = async (uid: string, sql: string, params: unknown[] = []) =>
  asUser(db, uid, async (tx) => (await tx.query<{ r: J }>(sql, params)).rows[0]?.r);
const asService = async <T,>(fn: (q: PGlite) => Promise<T>) => fn(db); // superusuário ≈ service_role (bypass RLS)

before(async () => {
  db = await createTestDb();
  ana = await createAuthUser(db, "ana@example.com");
  bia = await createAuthUser(db, "bia@example.com");
  sem = await createAuthUser(db, "sem@example.com");
  staff = await createAuthUser(db, "staff@example.com");
  mod = await createAuthUser(db, "mod@example.com");
  await grantEntitlement(db, ana, "o-ana", "ana@example.com");
  await grantEntitlement(db, bia, "o-bia", "bia@example.com");
  await db.query("insert into public.user_roles (user_id, role, granted_by) values ($1, 'support', 'teste'), ($2, 'moderator', 'teste')", [staff, mod]);
});

const start = (uid: string) =>
  asUser(db, uid, async (tx) => (await tx.query<{ id: string }>("select public.support_start_conversation('Ana', 'Oii! Como posso ajudar?') as id")).rows[0].id);
const send = (uid: string, conv: string, text: string) => rpc(uid, "select public.support_append_student_message($1, $2) as r", [conv, text]);

describe("suporte: abertura e isolamento", () => {
  test("aluna ativa abre atendimento com a saudação na ordem 1", async () => {
    const id = await start(ana);
    const rows = await asUser(db, ana, async (tx) => (await tx.query<{ seq: number; sender: string }>("select seq, sender from public.support_messages where conversation_id = $1", [id])).rows);
    assert.deepEqual(rows, [{ seq: 1, sender: "assistant" }]);
  });

  test("conta sem compra não abre atendimento; anon não lê nada", async () => {
    assert.match(await expectError(start(sem)), /forbidden/);
    assert.match(await expectError(asAnon(db, (tx) => tx.query("select * from public.support_conversations"))), /permission denied/);
  });

  test("uma aluna não lê nem escreve no atendimento de outra", async () => {
    const idAna = await start(ana);
    await send(ana, idAna, "Não consigo entrar na minha conta");
    await asUser(db, bia, async (tx) => {
      assert.equal((await tx.query("select * from public.support_conversations where id = $1", [idAna])).rows.length, 0);
      assert.equal((await tx.query("select * from public.support_messages where conversation_id = $1", [idAna])).rows.length, 0);
    });
    assert.equal((await send(bia, idAna, "intrusa")).error, "not_found");
  });

  test("aluna não insere direto nas tabelas nem forja resposta do assistente", async () => {
    const id = await start(ana);
    assert.match(
      await expectError(asUser(db, ana, (tx) => tx.query("insert into public.support_messages (conversation_id, seq, sender, content) values ($1, 9, 'assistant', 'falso')", [id]))),
      /permission denied/,
    );
    assert.match(
      await expectError(asUser(db, ana, (tx) => tx.query("select public.support_append_assistant_message($1, 'falso', '[]', '{}')", [id]))),
      /permission denied/,
    );
    assert.match(await expectError(asUser(db, ana, (tx) => tx.query("update public.support_conversations set status = 'open' where id = $1", [id]))), /permission denied/);
  });
});

describe("suporte: mensagens, pendência e limites (vindos do banco)", () => {
  test("ordem consistente e uma resposta por vez", async () => {
    const id = await start(ana);
    assert.equal((await send(ana, id, "Primeira")).seq, 2);
    assert.equal((await send(ana, id, "Segunda sem resposta")).error, "busy");
    await asService((q) => q.query("select public.support_append_assistant_message($1, 'Resposta', '[]', '{}')", [id]));
    assert.equal((await send(ana, id, "Terceira")).seq, 4);
  });

  test("limite por atendimento e mensagem longa demais", async () => {
    await db.query("update public.support_settings set max_messages_per_conversation = 2");
    const id = await start(bia);
    await send(bia, id, "um");
    await asService((q) => q.query("select public.support_release_pending($1)", [id]));
    await send(bia, id, "dois");
    await asService((q) => q.query("select public.support_release_pending($1)", [id]));
    assert.equal((await send(bia, id, "três")).error, "conversation_limit");
    assert.equal((await send(bia, id, "x".repeat(1001))).error, "invalid");
    await db.query("update public.support_settings set max_messages_per_conversation = 30");
  });

  test("limite diário por aluna (somado entre atendimentos)", async () => {
    await db.query("update public.support_settings set daily_messages_per_user = 1");
    const u = await createAuthUser(db, "limite@example.com");
    await grantEntitlement(db, u, "o-lim", "limite@example.com");
    const a = await start(u);
    assert.equal((await send(u, a, "uma")).ok, true);
    const b = await start(u);
    assert.equal((await send(u, b, "outra")).error, "daily_limit");
    await db.query("update public.support_settings set daily_messages_per_user = 60");
  });
});

describe("suporte: encerramento e TXT", () => {
  test("duas fases, idempotente, bloqueia mensagens e confere a contagem", async () => {
    const id = await start(ana);
    await send(ana, id, "Pergunta");
    await asService((q) => q.query("select public.support_append_assistant_message($1, 'Resposta', '[]', '{}')", [id]));
    const begin = await rpc(ana, "select public.support_begin_close($1) as r", [id]);
    assert.equal(begin.status, "closing");
    assert.equal((await send(ana, id, "depois de encerrar")).error, "closed");
    // contagem errada (mensagem perdida) → não fecha
    const bad = (await db.query<{ r: J }>("select public.support_finish_close($1, $2, now(), 2) as r", [id, "ATENDIMENTO MVF\nID: x\nFIM DO ATENDIMENTO"])).rows[0].r;
    assert.equal(bad.error, "archive_failed");
    const ok = (await db.query<{ r: J }>("select public.support_finish_close($1, $2, now(), 3) as r", [id, "ATENDIMENTO MVF\nID: x\nFIM DO ATENDIMENTO"])).rows[0].r;
    assert.equal(ok.ok, true);
    const again = (await db.query<{ r: J }>("select public.support_finish_close($1, $2, now(), 3) as r", [id, "outro texto qualquer que não deve entrar"])).rows[0].r;
    assert.equal(again.already_closed, true);
    const row = await asUser(db, ana, async (tx) => (await tx.query<{ status: string; transcript: string }>("select status, transcript from public.support_conversations where id = $1", [id])).rows[0]);
    assert.equal(row.status, "closed");
    assert.match(row.transcript, /^ATENDIMENTO MVF/);
    assert.equal((await rpc(ana, "select public.support_begin_close($1) as r", [id])).status, "closed");
  });

  test("aluna não grava o TXT nem fecha pelo servidor", async () => {
    const id = await start(bia);
    await rpc(bia, "select public.support_begin_close($1) as r", [id]);
    assert.match(await expectError(asUser(db, bia, (tx) => tx.query("select public.support_finish_close($1, 'x', now(), 1)", [id]))), /permission denied/);
  });

  test("retenção só quando a política existe", async () => {
    await db.query("update public.support_settings set retention_days = 30");
    const id = await start(ana);
    await rpc(ana, "select public.support_begin_close($1) as r", [id]);
    await db.query("select public.support_finish_close($1, 'ATENDIMENTO MVF fim do atendimento', now(), 1)", [id]);
    const r = (await db.query<{ d: number }>("select extract(day from retention_until - closed_at)::int as d from public.support_conversations where id = $1", [id])).rows[0];
    assert.equal(r.d, 30);
    await db.query("update public.support_settings set retention_days = null");
  });
});

describe("suporte: base de conhecimento", () => {
  before(async () => {
    await db.query(
      `insert into public.support_knowledge_documents (id, title, origin, type, version, updated_on, status, access, text_hash) values
       ('doc-aprovado', 'Configurar perfil', 'teste', 'tutorial_app', 1, '2026-11-26', 'aprovado', 'alunas', 'h1'),
       ('doc-rascunho', 'Rascunho perfil', 'teste', 'tutorial_app', 1, '2026-11-26', 'rascunho', 'alunas', 'h2'),
       ('doc-equipe', 'Interno perfil', 'teste', 'documento_interno', 1, '2026-11-26', 'aprovado', 'equipe', 'h3')
       on conflict do nothing`,
    );
    await db.query(
      `insert into public.support_knowledge_chunks (id, document_id, ord, content, content_hash) values
       ('doc-aprovado#0', 'doc-aprovado', 0, 'Para configurar o perfil do TikTok, abra a edição do perfil e troque a foto.', 'a'),
       ('doc-rascunho#0', 'doc-rascunho', 0, 'Rascunho: configurar perfil do TikTok com bio.', 'b'),
       ('doc-equipe#0', 'doc-equipe', 0, 'Procedimento interno para configurar perfil.', 'c')
       on conflict do nothing`,
    );
  });

  test("busca em português retorna só aprovados para alunas", async () => {
    const r = (await db.query<{ document_id: string }>("select document_id from public.support_search_knowledge('configurar perfil', 5, false)")).rows.map((x) => x.document_id);
    assert.deepEqual(r, ["doc-aprovado"]);
    const withDrafts = (await db.query<{ document_id: string }>("select document_id from public.support_search_knowledge('configurar perfil', 5, true)")).rows.map((x) => x.document_id);
    assert.ok(withDrafts.includes("doc-rascunho") && !withDrafts.includes("doc-equipe"));
  });

  test("alunas não leem a base direto nem chamam a busca", async () => {
    assert.match(await expectError(asUser(db, ana, (tx) => tx.query("select * from public.support_knowledge_chunks"))), /permission denied/);
    assert.match(await expectError(asUser(db, ana, (tx) => tx.query("select * from public.support_search_knowledge('perfil')"))), /permission denied/);
  });
});

describe("suporte: equipe", () => {
  test("suporte lista e lê com registro de acesso; aluna e moderação não", async () => {
    const id = await start(bia);
    const list = await asUser(db, staff, async (tx) => (await tx.query<{ id: string }>("select id from public.support_admin_list()")).rows.map((r) => r.id));
    assert.ok(list.includes(id));
    const one = await rpc(staff, "select public.support_admin_get($1) as r", [id]);
    assert.equal((one.messages as unknown[]).length, 1);
    const log = (await db.query<{ n: number }>("select count(*)::int as n from public.admin_audit_log where action in ('support.list', 'support.read')")).rows[0].n;
    assert.ok(log >= 2);
    assert.match(await expectError(asUser(db, ana, (tx) => tx.query("select * from public.support_admin_list()"))), /forbidden/);
    assert.match(await expectError(asUser(db, mod, (tx) => tx.query("select public.support_admin_get($1)", [id]))), /forbidden/);
  });
});
