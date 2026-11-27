-- =====================================================================
-- App MVF — Suporte inteligente (Assistente MVF): conversas, mensagens,
-- transcrições TXT, base de conhecimento e memória autorizada.
-- Migration idempotente. NÃO APLICAR NO REMOTO SEM AUTORIZAÇÃO (docs/SUPORTE_IA.md).
--
-- Princípios:
--  * A aluna só lê os PRÓPRIOS atendimentos, e só com acesso ativo (RLS).
--  * Escritas da aluna só por funções (sem INSERT/UPDATE direto nas tabelas).
--  * Respostas do assistente, resumo e arquivamento: só service_role (servidor),
--    para que ninguém forje mensagens do assistente pela API.
--  * Limites de uso vêm do BANCO (support_settings), nunca do cliente.
--  * Encerramento em duas fases e idempotente: closing (bloqueia mensagens)
--    → TXT gerado no servidor → closed, conferindo que nenhuma mensagem se perdeu.
--  * Base de conhecimento: só service_role; o modelo só recebe trechos APROVADOS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configuração (uma linha; editável só pelo servidor/SQL)
-- ---------------------------------------------------------------------
create table if not exists public.support_settings (
  id boolean primary key default true check (id),
  max_messages_per_conversation integer not null default 30 check (max_messages_per_conversation between 1 and 200),
  daily_messages_per_user integer not null default 60 check (daily_messages_per_user between 1 and 1000),
  pending_stale_seconds integer not null default 120 check (pending_stale_seconds between 10 and 3600),
  max_message_chars integer not null default 1000 check (max_message_chars between 100 and 8000),
  -- null = política de retenção ainda não aprovada: nada é apagado automaticamente.
  retention_days integer check (retention_days is null or retention_days between 1 and 3650),
  updated_at timestamptz not null default now()
);
insert into public.support_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Conversas e mensagens
-- ---------------------------------------------------------------------
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner_label text not null check (char_length(owner_label) between 1 and 120),
  status text not null default 'open' check (status in ('open', 'closing', 'closed')),
  origin text not null default 'central_de_ajuda' check (origin in ('central_de_ajuda')),
  category text check (category is null or char_length(category) <= 60),
  summary text check (summary is null or char_length(summary) <= 4000),
  summary_up_to_seq integer not null default 0,
  handoff_requested_at timestamptz,
  handoff_topic text check (handoff_topic is null or char_length(handoff_topic) <= 60),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  pending_since timestamptz,
  message_count integer not null default 0,
  transcript text,
  transcript_generated_at timestamptz,
  retention_until timestamptz,
  constraint support_closed_has_transcript check (status <> 'closed' or (closed_at is not null and transcript is not null))
);
create index if not exists support_conversations_user_idx on public.support_conversations (user_id, started_at desc);
create index if not exists support_conversations_status_idx on public.support_conversations (status, started_at desc);
create index if not exists support_conversations_handoff_idx on public.support_conversations (handoff_requested_at) where handoff_requested_at is not null;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations (id) on delete cascade,
  seq integer not null check (seq >= 1),
  sender text not null check (sender in ('student', 'assistant', 'system')),
  content text not null check (char_length(content) between 1 and 8000),
  sources jsonb not null default '[]'::jsonb,
  -- Metadados técnicos mínimos (provedor, tokens). Nunca o prompt completo.
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (conversation_id, seq)
);
create index if not exists support_messages_conv_idx on public.support_messages (conversation_id, seq);

-- ---------------------------------------------------------------------
-- Base de conhecimento (RAG) — 1ª fase: busca textual em português
-- ---------------------------------------------------------------------
create table if not exists public.support_knowledge_documents (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  title text not null,
  origin text not null,
  type text not null check (type in ('transcricao', 'pdf', 'material', 'faq', 'documento_interno', 'tutorial_app', 'guia_tiktok_shop', 'regras', 'produto', 'procedimento_atendimento')),
  module_id text,
  lesson_id text,
  version integer not null check (version >= 1),
  updated_on date not null,
  status text not null check (status in ('rascunho', 'em_revisao', 'aprovado', 'arquivado')),
  access text not null default 'alunas' check (access in ('alunas', 'equipe')),
  text_hash text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_knowledge_chunks (
  id text primary key,
  document_id text not null references public.support_knowledge_documents (id) on delete cascade,
  ord integer not null,
  content text not null,
  content_hash text not null,
  tsv tsvector generated always as (to_tsvector('portuguese', content)) stored,
  unique (document_id, ord)
);
create index if not exists support_knowledge_chunks_tsv_idx on public.support_knowledge_chunks using gin (tsv);

-- ---------------------------------------------------------------------
-- Memória entre atendimentos: só o que a ALUNA autorizou manter (preparado; desligado no app)
-- ---------------------------------------------------------------------
create table if not exists public.support_user_memory (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 60),
  value text not null check (char_length(value) between 1 and 500),
  consented_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------------------------------------------------------------------
-- Funções (aluna)
-- ---------------------------------------------------------------------
create or replace function public.support_start_conversation(p_owner_label text, p_greeting text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.has_active_access(v_user) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.support_conversations (user_id, owner_label, message_count)
  values (v_user, left(coalesce(nullif(trim(p_owner_label), ''), 'Aluna'), 120), 1)
  returning id into v_id;
  insert into public.support_messages (conversation_id, seq, sender, content)
  values (v_id, 1, 'assistant', left(p_greeting, 8000));
  return v_id;
end;
$$;

create or replace function public.support_append_student_message(p_conversation uuid, p_content text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conv public.support_conversations;
  v_cfg public.support_settings;
  v_mine integer;
  v_today integer;
  v_seq integer;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.has_active_access(v_user) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_cfg from public.support_settings where id;
  if p_content is null or char_length(trim(p_content)) = 0 or char_length(p_content) > v_cfg.max_message_chars then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  -- Trava a conversa: mensagens e encerramento simultâneos ficam em fila.
  select * into v_conv from public.support_conversations where id = p_conversation and user_id = v_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_conv.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if v_conv.pending_since is not null and v_conv.pending_since > now() - make_interval(secs => v_cfg.pending_stale_seconds) then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;
  select count(*) into v_mine from public.support_messages where conversation_id = p_conversation and sender = 'student';
  if v_mine >= v_cfg.max_messages_per_conversation then return jsonb_build_object('ok', false, 'error', 'conversation_limit'); end if;
  select count(*) into v_today
    from public.support_messages m join public.support_conversations c on c.id = m.conversation_id
   where c.user_id = v_user and m.sender = 'student' and m.created_at >= now() - interval '24 hours';
  if v_today >= v_cfg.daily_messages_per_user then return jsonb_build_object('ok', false, 'error', 'daily_limit'); end if;
  v_seq := v_conv.message_count + 1;
  insert into public.support_messages (conversation_id, seq, sender, content) values (p_conversation, v_seq, 'student', p_content);
  update public.support_conversations set message_count = v_seq, pending_since = now() where id = p_conversation;
  return jsonb_build_object('ok', true, 'seq', v_seq);
end;
$$;

create or replace function public.support_request_handoff(p_conversation uuid, p_topic text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.has_active_access(v_user) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.support_conversations
     set handoff_requested_at = coalesce(handoff_requested_at, now()),
         handoff_topic = coalesce(handoff_topic, left(p_topic, 60)),
         category = coalesce(category, left(p_topic, 60))
   where id = p_conversation and user_id = v_user and status = 'open';
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 1ª fase do encerramento: bloqueia novas mensagens. Idempotente.
create or replace function public.support_begin_close(p_conversation uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conv public.support_conversations;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.has_active_access(v_user) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_conv from public.support_conversations where id = p_conversation and user_id = v_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_conv.status = 'closed' then return jsonb_build_object('ok', true, 'status', 'closed', 'message_count', v_conv.message_count); end if;
  update public.support_conversations set status = 'closing', pending_since = null where id = p_conversation;
  return jsonb_build_object('ok', true, 'status', 'closing', 'message_count', v_conv.message_count);
end;
$$;

-- ---------------------------------------------------------------------
-- Funções (somente servidor / service_role)
-- ---------------------------------------------------------------------
create or replace function public.support_append_assistant_message(p_conversation uuid, p_content text, p_sources jsonb, p_meta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.support_conversations;
  v_seq integer;
begin
  select * into v_conv from public.support_conversations where id = p_conversation for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_conv.status <> 'open' then
    update public.support_conversations set pending_since = null where id = p_conversation;
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;
  v_seq := v_conv.message_count + 1;
  insert into public.support_messages (conversation_id, seq, sender, content, sources, meta)
  values (p_conversation, v_seq, 'assistant', left(p_content, 8000), coalesce(p_sources, '[]'::jsonb), coalesce(p_meta, '{}'::jsonb));
  update public.support_conversations set message_count = v_seq, pending_since = null where id = p_conversation;
  return jsonb_build_object('ok', true, 'seq', v_seq);
end;
$$;

create or replace function public.support_release_pending(p_conversation uuid)
returns void language sql security definer set search_path = '' as $$
  update public.support_conversations set pending_since = null where id = p_conversation;
$$;

create or replace function public.support_set_summary(p_conversation uuid, p_summary text, p_up_to_seq integer)
returns void language sql security definer set search_path = '' as $$
  update public.support_conversations
     set summary = left(p_summary, 4000), summary_up_to_seq = p_up_to_seq
   where id = p_conversation and p_up_to_seq > summary_up_to_seq;
$$;

-- 2ª fase: grava o TXT gerado no servidor. Só fecha se NENHUMA mensagem faltar.
create or replace function public.support_finish_close(p_conversation uuid, p_transcript text, p_closed_at timestamptz, p_message_count integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.support_conversations;
  v_days integer;
  v_count integer;
begin
  select * into v_conv from public.support_conversations where id = p_conversation for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_conv.status = 'closed' then return jsonb_build_object('ok', true, 'already_closed', true); end if;
  if v_conv.status <> 'closing' then return jsonb_build_object('ok', false, 'error', 'not_closing'); end if;
  select count(*) into v_count from public.support_messages where conversation_id = p_conversation;
  if v_count <> p_message_count or v_count <> v_conv.message_count then
    return jsonb_build_object('ok', false, 'error', 'archive_failed');
  end if;
  if p_transcript is null or char_length(p_transcript) < 20 then return jsonb_build_object('ok', false, 'error', 'archive_failed'); end if;
  select retention_days into v_days from public.support_settings where id;
  update public.support_conversations
     set status = 'closed', closed_at = p_closed_at, transcript = p_transcript, transcript_generated_at = now(),
         retention_until = case when v_days is null then null else p_closed_at + make_interval(days => v_days) end
   where id = p_conversation;
  return jsonb_build_object('ok', true, 'already_closed', false);
end;
$$;

-- Busca na base (só documentos aprovados; rascunhos apenas se pedido explicitamente pelo servidor).
create or replace function public.support_search_knowledge(p_query text, p_limit integer default 4, p_include_drafts boolean default false)
returns table (chunk_id text, document_id text, title text, lesson_id text, status text, content text, rank real)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, d.id, d.title, d.lesson_id, d.status, c.content,
         ts_rank(c.tsv, websearch_to_tsquery('portuguese', p_query)) as rank
    from public.support_knowledge_chunks c
    join public.support_knowledge_documents d on d.id = c.document_id
   where d.access = 'alunas'
     and (d.status = 'aprovado' or (p_include_drafts and d.status in ('rascunho', 'em_revisao')))
     and c.tsv @@ websearch_to_tsquery('portuguese', p_query)
   order by rank desc
   limit least(greatest(p_limit, 1), 8);
$$;

-- Conversas paradas (para o job de encerramento por inatividade — ver docs).
create or replace function public.support_list_inactive(p_minutes integer)
returns table (conversation_id uuid, user_id uuid)
language sql stable security definer set search_path = '' as $$
  select c.id, c.user_id from public.support_conversations c
   where c.status in ('open', 'closing')
     and coalesce((select max(m.created_at) from public.support_messages m where m.conversation_id = c.id), c.started_at)
         < now() - make_interval(mins => p_minutes);
$$;

-- Retenção: apaga só o que venceu pela política aprovada (retention_until definido).
create or replace function public.support_purge_expired()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  delete from public.support_conversations where status = 'closed' and retention_until is not null and retention_until < now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- Funções (equipe: admin/support) — autorização no banco + registro de acesso
-- ---------------------------------------------------------------------
create or replace function private.is_support_staff(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (select 1 from public.user_roles r where r.user_id = p_user and r.role in ('admin', 'support'));
$$;

create or replace function public.support_admin_list(p_status text default null, p_from timestamptz default null, p_to timestamptz default null, p_id_prefix text default null, p_handoff_only boolean default false, p_limit integer default 50)
returns table (id uuid, user_id uuid, owner_label text, status text, category text, handoff_requested_at timestamptz, started_at timestamptz, closed_at timestamptz, message_count integer, summary text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_support_staff(auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.admin_audit_log (actor, action, details)
  values (auth.uid()::text, 'support.list', jsonb_build_object('status', p_status, 'from', p_from, 'to', p_to, 'handoff_only', p_handoff_only));
  return query
    select c.id, c.user_id, c.owner_label, c.status, c.category, c.handoff_requested_at, c.started_at, c.closed_at, c.message_count, c.summary
      from public.support_conversations c
     where (p_status is null or c.status = p_status)
       and (p_from is null or c.started_at >= p_from)
       and (p_to is null or c.started_at < p_to)
       and (p_id_prefix is null or c.id::text like (lower(p_id_prefix) || '%'))
       and (not p_handoff_only or c.handoff_requested_at is not null)
     order by c.started_at desc
     limit least(greatest(p_limit, 1), 200);
end;
$$;

create or replace function public.support_admin_get(p_conversation uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  if not private.is_support_staff(auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'conversation', to_jsonb(c),
    'messages', coalesce((select jsonb_agg(to_jsonb(m) order by m.seq) from public.support_messages m where m.conversation_id = c.id), '[]'::jsonb)
  ) into v from public.support_conversations c where c.id = p_conversation;
  if v is null then return null; end if;
  insert into public.admin_audit_log (actor, action, target_user_id, details)
  values (auth.uid()::text, 'support.read', (v -> 'conversation' ->> 'user_id')::uuid, jsonb_build_object('conversation_id', p_conversation));
  return v;
end;
$$;

-- ---------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------
revoke all on function private.is_support_staff(uuid) from public, anon;
grant execute on function private.is_support_staff(uuid) to authenticated, service_role;

revoke all on function public.support_start_conversation(text, text) from public, anon;
revoke all on function public.support_append_student_message(uuid, text) from public, anon;
revoke all on function public.support_request_handoff(uuid, text) from public, anon;
revoke all on function public.support_begin_close(uuid) from public, anon;
grant execute on function public.support_start_conversation(text, text) to authenticated;
grant execute on function public.support_append_student_message(uuid, text) to authenticated;
grant execute on function public.support_request_handoff(uuid, text) to authenticated;
grant execute on function public.support_begin_close(uuid) to authenticated;

revoke all on function public.support_append_assistant_message(uuid, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.support_release_pending(uuid) from public, anon, authenticated;
revoke all on function public.support_set_summary(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.support_finish_close(uuid, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.support_search_knowledge(text, integer, boolean) from public, anon, authenticated;
revoke all on function public.support_list_inactive(integer) from public, anon, authenticated;
revoke all on function public.support_purge_expired() from public, anon, authenticated;
grant execute on function public.support_append_assistant_message(uuid, text, jsonb, jsonb) to service_role;
grant execute on function public.support_release_pending(uuid) to service_role;
grant execute on function public.support_set_summary(uuid, text, integer) to service_role;
grant execute on function public.support_finish_close(uuid, text, timestamptz, integer) to service_role;
grant execute on function public.support_search_knowledge(text, integer, boolean) to service_role;
grant execute on function public.support_list_inactive(integer) to service_role;
grant execute on function public.support_purge_expired() to service_role;

revoke all on function public.support_admin_list(text, timestamptz, timestamptz, text, boolean, integer) from public, anon;
revoke all on function public.support_admin_get(uuid) from public, anon;
grant execute on function public.support_admin_list(text, timestamptz, timestamptz, text, boolean, integer) to authenticated;
grant execute on function public.support_admin_get(uuid) to authenticated;

alter table public.support_settings enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_knowledge_documents enable row level security;
alter table public.support_knowledge_chunks enable row level security;
alter table public.support_user_memory enable row level security;

revoke all on table
  public.support_settings, public.support_conversations, public.support_messages,
  public.support_knowledge_documents, public.support_knowledge_chunks, public.support_user_memory
from anon, authenticated;

-- Aluna: só LÊ os próprios atendimentos (escrita só pelas funções acima).
grant select on public.support_conversations to authenticated;
grant select on public.support_messages to authenticated;
-- Memória autorizada: a aluna consulta e apaga a própria.
grant select, delete on public.support_user_memory to authenticated;

grant all on table
  public.support_settings, public.support_conversations, public.support_messages,
  public.support_knowledge_documents, public.support_knowledge_chunks, public.support_user_memory
to service_role;

drop policy if exists support_conversations_select_own on public.support_conversations;
create policy support_conversations_select_own on public.support_conversations for select to authenticated
  using (user_id = auth.uid() and private.has_active_access(auth.uid()));

drop policy if exists support_messages_select_own on public.support_messages;
create policy support_messages_select_own on public.support_messages for select to authenticated
  using (
    private.has_active_access(auth.uid())
    and exists (select 1 from public.support_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

drop policy if exists support_memory_select_own on public.support_user_memory;
create policy support_memory_select_own on public.support_user_memory for select to authenticated
  using (user_id = auth.uid() and private.has_active_access(auth.uid()));
drop policy if exists support_memory_delete_own on public.support_user_memory;
create policy support_memory_delete_own on public.support_user_memory for delete to authenticated
  using (user_id = auth.uid());
