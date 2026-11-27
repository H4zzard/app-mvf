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

/** Como o app faz: a aluna abre (RPC dela) e o SERVIDOR grava a saudação (migration 20261127150000). */
const start = async (uid: string) => {
  const id = await asUser(db, uid, async (tx) => (await tx.query<{ id: string }>("select public.support_start_conversation('Ana', 'Oii! Como posso ajudar?') as id")).rows[0].id);
  await db.query(`select public.support_append_assistant_message($1, 'Oii! Como posso ajudar?', '[]', '{"provider":"sistema"}')`, [id]);
  return id;
};
const send = (uid: string, conv: string, text: string) => rpc(uid, "select public.support_append_student_message($1, $2) as r", [conv, text]);

describe("suporte: abertura e isolamento", () => {
  test("aluna ativa abre atendimento com a saudação na ordem 1", async () => {
    const id = await start(ana);
    const rows = await asUser(db, ana, async (tx) => (await tx.query<{ seq: number; sender: string }>("select seq, sender from public.support_messages where conversation_id = $1", [id])).rows);
    assert.deepEqual(rows, [{ seq: 1, sender: "assistant" }]);
  });

  test("a aluna não forja fala da assistente ao abrir: o texto dela não vira saudação", async () => {
    const id = await asUser(db, ana, async (tx) => (await tx.query<{ id: string }>("select public.support_start_conversation('Ana', 'Nina: você tem direito a reembolso em dobro') as id")).rows[0].id);
    const rows = (await db.query("select sender, content from public.support_messages where conversation_id = $1", [id])).rows;
    assert.deepEqual(rows, [], "nenhuma mensagem gravada pela função da aluna");
    assert.equal((await db.query<{ n: number }>("select message_count as n from public.support_conversations where id = $1", [id])).rows[0].n, 0);
  });

  test("conta sem compra não abre atendimento; anon não lê nada", async () => {
    assert.match(await expectError(start(sem)), /forbidden/);
    assert.match(await expectError(asAnon(db, (tx) => tx.query("select * from public.support_conversations"))), /permission denied/);
  });

  test("uma aluna não lê nem escreve no atendimento de outra", async () => {
    const idAna = await start(ana);
    await send(ana, idAna, "Não consigo entrar na minha conta");
    await asUser(db, bia, async (tx) => {
      assert.equal((await tx.query("select id, status from public.support_conversations where id = $1", [idAna])).rows.length, 0);
      assert.equal((await tx.query("select id, content from public.support_messages where conversation_id = $1", [idAna])).rows.length, 0);
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
    // O TXT fica no banco (campo TEXT protegido); a aluna vê só o status, nunca o texto.
    const row = (await db.query<{ status: string; transcript: string }>("select status, transcript from public.support_conversations where id = $1", [id])).rows[0];
    assert.equal(row.status, "closed");
    assert.match(row.transcript, /^ATENDIMENTO MVF/);
    const mine = await asUser(db, ana, async (tx) => (await tx.query<{ status: string }>("select status from public.support_conversations where id = $1", [id])).rows[0]);
    assert.equal(mine.status, "closed");
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

  test("pergunta natural acha o trecho (qualquer palavra, por relevância) e devolve o tipo", async () => {
    const r = (await db.query<{ document_id: string; type: string }>("select document_id, type from public.support_search_knowledge('como eu faço pra trocar a foto do meu perfil no tiktok?', 5, false)")).rows;
    assert.deepEqual(r, [{ document_id: "doc-aprovado", type: "tutorial_app" }]);
    assert.equal((await db.query("select * from public.support_search_knowledge('que a de o', 5, true)")).rows.length, 0);
    assert.equal((await db.query("select * from public.support_search_knowledge($1, 5, true)", ["perfil' | ! & :* ("])).rows.length >= 1, true);
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

describe("suporte: histórico privado (TXT e metadados só para servidor e equipe)", () => {
  test("a aluna lê só as colunas do chat: nada de TXT, resumo, fontes ou metadados técnicos", async () => {
    const id = await start(ana);
    await send(ana, id, "Pergunta");
    await asService((q) => q.query(`select public.support_append_assistant_message($1, 'Resposta', '[{"docId":"d"}]', '{"provider":"deepseek","model":"m","tokensIn":10}')`, [id]));
    const ok = await asUser(db, ana, async (tx) => (await tx.query("select id, status, close_reason, message_count from public.support_conversations where id = $1", [id])).rows);
    assert.equal(ok.length, 1);
    const msgs = await asUser(db, ana, async (tx) => (await tx.query("select seq, sender, content, actions, created_at from public.support_messages where conversation_id = $1 order by seq", [id])).rows);
    assert.equal(msgs.length, 3);
    for (const sql of [
      "select transcript from public.support_conversations",
      "select summary from public.support_conversations",
      "select * from public.support_conversations",
      "select meta from public.support_messages",
      "select sources from public.support_messages",
      "select * from public.support_messages",
    ]) {
      assert.match(await expectError(asUser(db, ana, (tx) => tx.query(sql))), /permission denied/, sql);
    }
  });

  test("exportação do TXT: equipe exporta com registro; aluna, moderação e conversa aberta não", async () => {
    const id = await start(ana);
    await send(ana, id, "Pergunta privada");
    assert.equal((await rpc(staff, "select public.support_admin_export($1) as r", [id])).error, "not_closed");
    await rpc(ana, "select public.support_begin_close($1) as r", [id]);
    await db.query("select public.support_finish_close($1, $2, now(), 2)", [id, "ATENDIMENTO MVF\nPergunta privada\nFIM DO ATENDIMENTO"]);
    const before = (await db.query<{ n: number }>("select count(*)::int as n from public.admin_audit_log where action = 'support.export'")).rows[0].n;
    const exp = await rpc(staff, "select public.support_admin_export($1) as r", [id]);
    assert.equal(exp.ok, true);
    assert.match(String(exp.transcript), /Pergunta privada/);
    const after = (await db.query<{ n: number }>("select count(*)::int as n from public.admin_audit_log where action = 'support.export'")).rows[0].n;
    assert.equal(after, before + 1, "acesso registrado");
    assert.match(await expectError(asUser(db, ana, (tx) => tx.query("select public.support_admin_export($1)", [id]))), /forbidden/, "nem a própria aluna exporta");
    assert.match(await expectError(asUser(db, bia, (tx) => tx.query("select public.support_admin_export($1)", [id]))), /forbidden/);
    assert.match(await expectError(asUser(db, mod, (tx) => tx.query("select public.support_admin_export($1)", [id]))), /forbidden/);
    assert.match(await expectError(asAnon(db, (tx) => tx.query("select public.support_admin_export($1)", [id]))), /permission denied/);
  });
});

describe("suporte: Nina 2.0 (motivo de encerramento, eventos e botões)", () => {
  test("motivo registrado; aluna não consegue gravar “resolvido”; o primeiro motivo vale", async () => {
    const id = await start(ana);
    await rpc(ana, "select public.support_begin_close($1, 'resolvido') as r", [id]);
    const row = (await db.query<{ close_reason: string }>("select close_reason from public.support_conversations where id = $1", [id])).rows[0];
    assert.equal(row.close_reason, "manual", "“resolvido” vindo da aluna vira manual");
    const id2 = await start(ana);
    await db.query("select public.support_set_close_reason($1, 'resolvido')", [id2]);
    await rpc(ana, "select public.support_begin_close($1, 'abriu_aula') as r", [id2]);
    assert.equal((await db.query<{ close_reason: string }>("select close_reason from public.support_conversations where id = $1", [id2])).rows[0].close_reason, "resolvido");
    assert.match(await expectError(asUser(db, ana, (tx) => tx.query("select public.support_set_close_reason($1, 'resolvido')", [id2]))), /permission denied/);
  });

  test("evento do sistema só pelo servidor e só com atendimento aberto; botões gravados na mensagem", async () => {
    const id = await start(bia);
    await send(bia, id, "qual aula de roteiro?");
    const actions = JSON.stringify([{ type: "open_lesson", lessonId: "l-roteiro", title: "Roteiro", moduleTitle: null, href: "/aulas/l-roteiro" }]);
    await db.query("select public.support_append_assistant_message($1, 'Achei!', '[]', '{\"provider\":\"local\"}', $2::jsonb)", [id, actions]);
    const saved = (await db.query<{ actions: { lessonId: string }[]; meta: { provider: string } }>("select actions, meta from public.support_messages where conversation_id = $1 and seq = 3", [id])).rows[0];
    assert.equal(saved.actions[0].lessonId, "l-roteiro");
    assert.equal(saved.meta.provider, "local");
    assert.match(await expectError(asUser(db, bia, (tx) => tx.query("select public.support_append_system_message($1, 'falso')", [id]))), /permission denied/);
    const ev = (await db.query<{ r: J }>("select public.support_append_system_message($1, 'A aluna abriu a aula “Roteiro”.') as r", [id])).rows[0].r;
    assert.equal(ev.seq, 4);
    await rpc(bia, "select public.support_begin_close($1, 'abriu_aula') as r", [id]);
    const after = (await db.query<{ r: J }>("select public.support_append_system_message($1, 'depois') as r", [id])).rows[0].r;
    assert.equal(after.error, "closed");
  });
});

describe("suporte: upgrade de banco com a versão anterior da migration", () => {
  test("versão antiga + complemento Nina 2.0 = mesmas colunas e funções do banco novo", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { readFileSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(import.meta.dirname, "..", "migrations");
    const fresh = await createTestDb();
    const stub = readFileSync(join(import.meta.dirname, "pg-harness.ts"), "utf8").match(/const SUPABASE_STUB = `([\s\S]*?)`;/)![1];
    const old = new PGlite();
    await old.exec(stub);
    const files = readdirSync(dir).filter((x) => x.endsWith(".sql")).sort();
    const complementAt = files.indexOf("20261127120000_nina_2_complemento.sql");
    for (const f of files.slice(0, complementAt)) {
      await old.exec(f === "20261126120000_suporte_ia.sql" ? readFileSync(join(import.meta.dirname, "fixtures", "suporte_ia_v1.sql"), "utf8") : readFileSync(join(dir, f), "utf8"));
    }
    // Banco antigo: falta a coluna nova.
    await assert.rejects(old.query("select close_reason from public.support_conversations limit 0"));
    const complement = readFileSync(join(dir, files[complementAt]), "utf8");
    await old.exec(complement);
    await old.exec(complement); // idempotente
    for (const f of files.slice(complementAt + 1)) {
      const sql = readFileSync(join(dir, f), "utf8");
      await old.exec(sql);
      await old.exec(sql); // idempotente
    }
    const columnGrants = async (db: PGlite) =>
      (await db.query<{ g: string }>("select table_name || '.' || column_name || ':' || grantee || ':' || privilege_type as g from information_schema.column_privileges where table_schema = 'public' and table_name like 'support_%' and grantee in ('anon', 'authenticated') order by 1")).rows.map((r) => r.g);
    assert.deepEqual(await columnGrants(old), await columnGrants(fresh), "mesmas colunas liberadas para a aluna");
    const shape = async (db: PGlite) => ({
      cols: (await db.query<{ c: string }>("select table_name || '.' || column_name as c from information_schema.columns where table_schema = 'public' and table_name like 'support_%' order by 1")).rows.map((r) => r.c),
      fns: (await db.query<{ f: string }>("select p.oid::regprocedure::text as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'support_%' order by 1")).rows.map((r) => r.f),
      grants: (await db.query<{ g: string }>("select routine_name || ':' || grantee as g from information_schema.routine_privileges where routine_schema = 'public' and routine_name like 'support_%' order by 1")).rows.map((r) => r.g),
    });
    assert.deepEqual(await shape(old), await shape(fresh));
  });
});

describe("suporte: auditoria de permissões (papéis reais do banco)", () => {
  const STUDENT_FNS = [
    "support_start_conversation(text,text)",
    "support_append_student_message(uuid,text)",
    "support_request_handoff(uuid,text)",
    "support_begin_close(uuid,text)",
  ];
  const STAFF_FNS = ["support_admin_list(text,timestamp with time zone,timestamp with time zone,text,boolean,integer)", "support_admin_get(uuid)", "support_admin_export(uuid)"];

  test("anon não executa nenhuma função do suporte; authenticated só as da aluna e as da equipe (que checam o papel)", async () => {
    const fns = (await db.query<{ f: string; anon: boolean; auth: boolean; svc: boolean }>(
      `select replace(p.oid::regprocedure::text, 'public.', '') as f,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as auth,
              has_function_privilege('service_role', p.oid, 'execute') as svc
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname like 'support_%' order by 1`,
    )).rows;
    assert.equal(fns.length, 16, "todas as funções do suporte conferidas (nova função = rever esta lista)");
    for (const f of fns) {
      assert.equal(f.anon, false, `anon executa ${f.f}`);
      assert.equal(f.auth, STUDENT_FNS.includes(f.f) || STAFF_FNS.includes(f.f), `authenticated executa ${f.f}?`);
    }
    // Nenhuma assinatura antiga sobrou (a versão anterior tinha begin_close(uuid) e append_assistant com 4 argumentos).
    assert.ok(!fns.some((f) => f.f === "support_begin_close(uuid)" || f.f === "support_append_assistant_message(uuid,text,jsonb,jsonb)"));
  });

  test("toda função SECURITY DEFINER (public e private) fixa search_path", async () => {
    const bad = (await db.query<{ f: string }>(
      `select p.oid::regprocedure::text as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private') and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
    )).rows.map((r) => r.f);
    assert.deepEqual(bad, []);
  });

  test("tabelas: a aluna não insere, altera nem apaga; só lê colunas do chat; base e configurações fechadas", async () => {
    const priv = async (sql: string) => (await db.query<{ v: boolean }>(`select ${sql} as v`)).rows[0].v;
    for (const t of ["support_conversations", "support_messages", "support_knowledge_documents", "support_knowledge_chunks", "support_settings"]) {
      for (const p of ["INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
        assert.equal(await priv(`has_table_privilege('authenticated', 'public.${t}', '${p}')`), false, `${t} ${p}`);
        assert.equal(await priv(`has_table_privilege('anon', 'public.${t}', '${p}')`), false, `anon ${t} ${p}`);
      }
      assert.equal(await priv(`has_table_privilege('anon', 'public.${t}', 'SELECT')`), false, `anon lê ${t}`);
    }
    for (const t of ["support_knowledge_documents", "support_knowledge_chunks", "support_settings"]) {
      assert.equal(await priv(`has_any_column_privilege('authenticated', 'public.${t}', 'SELECT')`), false, `aluna lê ${t}`);
    }
    for (const c of ["transcript", "summary", "summary_up_to_seq", "pending_since", "transcript_generated_at", "retention_until"]) {
      assert.equal(await priv(`has_column_privilege('authenticated', 'public.support_conversations', '${c}', 'SELECT')`), false, c);
    }
    for (const c of ["meta", "sources"]) {
      assert.equal(await priv(`has_column_privilege('authenticated', 'public.support_messages', '${c}', 'SELECT')`), false, c);
    }
  });

  test("trocar o ID não dá acesso: outra aluna não encerra, não pede equipe, não lê e não exporta", async () => {
    const id = await start(bia);
    await send(bia, id, "Minha dúvida particular");
    assert.equal((await rpc(ana, "select public.support_begin_close($1) as r", [id])).error, "not_found");
    assert.equal((await rpc(ana, "select public.support_request_handoff($1, 'acesso') as r", [id])).error, "not_found");
    assert.equal((await send(ana, id, "intrusa")).error, "not_found");
    await asUser(db, ana, async (tx) => {
      assert.equal((await tx.query("select id from public.support_conversations where id = $1", [id])).rows.length, 0);
      assert.equal((await tx.query("select content from public.support_messages where conversation_id = $1", [id])).rows.length, 0);
    });
    assert.match(await expectError(asUser(db, ana, (tx) => tx.query("select public.support_admin_get($1)", [id]))), /forbidden/);
    const st = (await db.query<{ status: string; handoff_requested_at: string | null }>("select status, handoff_requested_at from public.support_conversations where id = $1", [id])).rows[0];
    assert.equal(st.status, "open");
    assert.equal(st.handoff_requested_at, null);
  });

  test("acesso revogado: a aluna deixa de ler e de escrever nos próprios atendimentos", async () => {
    const u = await createAuthUser(db, "revogada@example.com");
    await grantEntitlement(db, u, "o-rev", "revogada@example.com");
    const id = await start(u);
    await db.query("update public.purchase_entitlements set access_state = 'revoked', revoked_at = now() where order_id = 'o-rev'");
    await asUser(db, u, async (tx) => {
      assert.equal((await tx.query("select id from public.support_conversations where id = $1", [id])).rows.length, 0);
    });
    assert.match(await expectError(send(u, id, "ainda estou aqui")), /forbidden/);
  });

  test("equipe não lê as tabelas direto (só pelas funções auditadas); aluna não lê a auditoria", async () => {
    await start(ana);
    await asUser(db, staff, async (tx) => {
      assert.equal((await tx.query("select id from public.support_conversations")).rows.length, 0, "sem RLS para a equipe: leitura só pelas funções");
      assert.equal((await tx.query("select id from public.support_messages")).rows.length, 0);
    });
    const r = await asUser(db, ana, (tx) => tx.query("select * from public.admin_audit_log").then((x) => x.rows.length)).catch((e: Error) => e.message);
    assert.ok(r === 0 || /permission denied/.test(String(r)), "aluna não enxerga a auditoria");
  });

  test("cada leitura e exportação da equipe registra quem, o quê e de qual aluna", async () => {
    const id = await start(bia);
    await rpc(bia, "select public.support_begin_close($1) as r", [id]);
    await db.query("select public.support_finish_close($1, 'ATENDIMENTO MVF\nsó o TXT\nFIM DO ATENDIMENTO', now(), 1)", [id]);
    await rpc(staff, "select public.support_admin_get($1) as r", [id]);
    await rpc(staff, "select public.support_admin_export($1) as r", [id]);
    const log = (await db.query<{ action: string; actor: string; target_user_id: string; cid: string }>(
      "select action, actor, target_user_id, details ->> 'conversation_id' as cid from public.admin_audit_log where details ->> 'conversation_id' = $1 order by id",
      [id],
    )).rows;
    assert.deepEqual(log.map((l) => l.action), ["support.read", "support.export"]);
    for (const l of log) {
      assert.equal(l.actor, staff);
      assert.equal(l.target_user_id, bia);
    }
  });
});

describe("suporte: arquivamento — falha, repetição e simultâneo", () => {
  test("TXT inválido não fecha (continua 'encerrando'); repetir depois grava; duas gravações simultâneas viram uma", async () => {
    const id = await start(ana);
    await send(ana, id, "Pergunta");
    await db.query("select public.support_append_assistant_message($1, 'Resposta', '[]', '{}')", [id]);
    await rpc(ana, "select public.support_begin_close($1) as r", [id]);
    const fail = (await db.query<{ r: J }>("select public.support_finish_close($1, '', now(), 3) as r", [id])).rows[0].r;
    assert.equal(fail.error, "archive_failed");
    const mid = (await db.query<{ status: string; transcript: string | null }>("select status, transcript from public.support_conversations where id = $1", [id])).rows[0];
    assert.deepEqual(mid, { status: "closing", transcript: null }, "nada é dado como salvo");
    assert.equal((await send(ana, id, "durante a falha")).error, "closed", "mensagens seguem bloqueadas");
    const txt = "ATENDIMENTO MVF\nPergunta\nResposta\nFIM DO ATENDIMENTO";
    const [a, b] = await Promise.all([
      db.query<{ r: J }>("select public.support_finish_close($1, $2, now(), 3) as r", [id, txt]),
      db.query<{ r: J }>("select public.support_finish_close($1, $2, now(), 3) as r", [id, txt + " (segunda)"]),
    ]);
    const outs = [a.rows[0].r, b.rows[0].r];
    assert.ok(outs.every((o) => o.ok === true));
    assert.equal(outs.filter((o) => o.already_closed === true).length, 1, "só uma gravação vale");
    const row = (await db.query<{ transcript: string }>("select transcript from public.support_conversations where id = $1", [id])).rows[0];
    assert.equal(row.transcript, txt, "a segunda não sobrescreve");
  });
});

describe("suporte: verificação somente leitura (supabase/checks/nina_estado_somente_leitura.sql)", () => {
  test("detecta antigo → complemento → histórico privado, sem escrever nada", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { readFileSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(import.meta.dirname, "..", "migrations");
    const check = readFileSync(join(import.meta.dirname, "..", "checks", "nina_estado_somente_leitura.sql"), "utf8");
    const stub = readFileSync(join(import.meta.dirname, "pg-harness.ts"), "utf8").match(/const SUPABASE_STUB = `([\s\S]*?)`;/)![1];
    const pg = new PGlite();
    await pg.exec(stub);
    const files = readdirSync(dir).filter((x) => x.endsWith(".sql")).sort();
    const run = async () => {
      // Transação READ ONLY: se a consulta tentasse escrever, falharia aqui.
      const rows = await pg.transaction(async (tx) => {
        await tx.exec("set transaction read only");
        return (await tx.query<{ item: string; valor: string }>(check)).rows;
      });
      return Object.fromEntries(rows.map((r) => [r.item.split(" ")[0] + (r.item.match(/\d{14}/)?.[0] ?? ""), r.valor]));
    };
    const at = files.indexOf("20261127120000_nina_2_complemento.sql");
    for (const f of files.slice(0, at)) {
      await pg.exec(f === "20261126120000_suporte_ia.sql" ? readFileSync(join(import.meta.dirname, "fixtures", "suporte_ia_v1.sql"), "utf8") : readFileSync(join(dir, f), "utf8"));
    }
    await pg.query("insert into public.support_knowledge_documents (id, title, origin, type, version, updated_on, status, text_hash) values ('app-pedir-ajuda', 'Ajuda', 'app', 'tutorial_app', 1, '2026-11-26', 'aprovado', 'h')");
    await pg.query("insert into public.support_knowledge_chunks (id, document_id, ord, content, content_hash) values ('app-pedir-ajuda-1', 'app-pedir-ajuda', 1, 'Ao encerrar, você pode baixar a conversa em TXT.', 'h')");
    let s = await run();
    assert.equal(s.complemento20261127120000, "PENDENTE");
    assert.equal(s["histórico20261127150000"], "PENDENTE");
    assert.match(s["aluna"], /^SIM/);
    assert.equal(s["documentos"], "app-pedir-ajuda");
    await pg.exec(readFileSync(join(dir, files[at]), "utf8"));
    s = await run();
    assert.equal(s.complemento20261127120000, "APLICADO");
    assert.equal(s["histórico20261127150000"], "PENDENTE");
    for (const f of files.slice(at + 1)) await pg.exec(readFileSync(join(dir, f), "utf8"));
    s = await run();
    assert.equal(s["histórico20261127150000"], "APLICADO");
    assert.equal(s["aluna"], "não");
    const all = await pg.transaction(async (tx) => (await tx.query<{ item: string; valor: string }>(check)).rows);
    const byItem = Object.fromEntries(all.map((r) => [r.item, r.valor]));
    assert.equal(byItem["funções executáveis por anon (esperado: nenhuma)"], "nenhuma");
    assert.equal(byItem["SECURITY DEFINER sem search_path fixo (esperado: nenhuma)"], "nenhuma");
    assert.doesNotMatch(JSON.stringify(all), /baixar a conversa|@example/, "não devolve conteúdo nem e-mail");
  });
});
