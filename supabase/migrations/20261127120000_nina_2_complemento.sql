-- Nina 2.0 — complemento da 20261126120000_suporte_ia.sql.
-- Para bancos que receberam a versão ANTERIOR daquela migration (sem motivo de encerramento,
-- botões de aula e mensagens de sistema). Idempotente: num banco novo não muda nada.

alter table public.support_conversations add column if not exists close_reason text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_conversations_close_reason_check') then
    alter table public.support_conversations add constraint support_conversations_close_reason_check
      check (close_reason is null or close_reason in ('manual', 'resolvido', 'abriu_aula', 'inatividade'));
  end if;
end $$;
alter table public.support_messages add column if not exists actions jsonb not null default '[]'::jsonb;

-- Assinaturas antigas saem para não existirem duas versões da mesma função.
drop function if exists public.support_begin_close(uuid);
drop function if exists public.support_append_assistant_message(uuid, text, jsonb, jsonb);

-- 1ª fase do encerramento: bloqueia novas mensagens e registra o motivo (o primeiro vale). Idempotente.
create or replace function public.support_begin_close(p_conversation uuid, p_reason text default 'manual')
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
  -- A aluna só pode pedir encerramento manual ou abertura de aula; "resolvido" exige o servidor.
  if p_reason not in ('manual', 'abriu_aula') then p_reason := 'manual'; end if;
  update public.support_conversations
     set status = 'closing', pending_since = null, close_reason = coalesce(close_reason, p_reason)
   where id = p_conversation;
  return jsonb_build_object('ok', true, 'status', 'closing', 'message_count', v_conv.message_count);
end;
$$;

create or replace function public.support_append_assistant_message(p_conversation uuid, p_content text, p_sources jsonb, p_meta jsonb, p_actions jsonb default '[]'::jsonb)
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
  insert into public.support_messages (conversation_id, seq, sender, content, sources, meta, actions)
  values (p_conversation, v_seq, 'assistant', left(p_content, 8000), coalesce(p_sources, '[]'::jsonb), coalesce(p_meta, '{}'::jsonb), coalesce(p_actions, '[]'::jsonb));
  update public.support_conversations set message_count = v_seq, pending_since = null where id = p_conversation;
  return jsonb_build_object('ok', true, 'seq', v_seq);
end;
$$;

-- Evento do sistema no histórico (ex.: "A aluna abriu a aula …"). Só com o atendimento aberto.
create or replace function public.support_append_system_message(p_conversation uuid, p_content text)
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
  if v_conv.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  v_seq := v_conv.message_count + 1;
  insert into public.support_messages (conversation_id, seq, sender, content) values (p_conversation, v_seq, 'system', left(p_content, 2000));
  update public.support_conversations set message_count = v_seq where id = p_conversation;
  return jsonb_build_object('ok', true, 'seq', v_seq);
end;
$$;

-- Motivo "resolvido" (encerramento automático) só pode ser registrado pelo servidor.
create or replace function public.support_set_close_reason(p_conversation uuid, p_reason text)
returns void language sql security definer set search_path = '' as $$
  update public.support_conversations set close_reason = p_reason
   where id = p_conversation and status in ('open', 'closing') and close_reason is null
     and p_reason in ('manual', 'resolvido', 'abriu_aula', 'inatividade');
$$;

revoke all on function public.support_begin_close(uuid, text) from public, anon;
grant execute on function public.support_begin_close(uuid, text) to authenticated;
revoke all on function public.support_append_assistant_message(uuid, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.support_append_system_message(uuid, text) from public, anon, authenticated;
revoke all on function public.support_set_close_reason(uuid, text) from public, anon, authenticated;
grant execute on function public.support_append_assistant_message(uuid, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.support_append_system_message(uuid, text) to service_role;
grant execute on function public.support_set_close_reason(uuid, text) to service_role;

-- Busca: devolve o tipo do documento e aceita qualquer palavra da pergunta (antes exigia todas).
drop function if exists public.support_search_knowledge(text, integer, boolean);
-- Busca por QUALQUER palavra da pergunta (OR), ordenada por relevância: perguntas naturais
-- raramente têm todas as palavras no mesmo trecho. Os termos vêm já normalizados pelo
-- dicionário português e entram citados (sem operadores vindos da aluna).
create or replace function public.support_search_knowledge(p_query text, p_limit integer default 4, p_include_drafts boolean default false)
returns table (chunk_id text, document_id text, title text, lesson_id text, status text, content text, rank real, type text)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select to_tsquery('simple', string_agg(quote_literal(l), ' | ')) as tsq
      from unnest(tsvector_to_array(to_tsvector('portuguese', left(coalesce(p_query, ''), 500)))) as l
  )
  select c.id, d.id, d.title, d.lesson_id, d.status, c.content,
         ts_rank(c.tsv, q.tsq) as rank, d.type
    from q, public.support_knowledge_chunks c
    join public.support_knowledge_documents d on d.id = c.document_id
   where q.tsq is not null
     and d.access = 'alunas'
     and (d.status = 'aprovado' or (p_include_drafts and d.status in ('rascunho', 'em_revisao')))
     and c.tsv @@ q.tsq
   order by rank desc, c.id
   limit least(greatest(p_limit, 1), 8);
$$;
revoke all on function public.support_search_knowledge(text, integer, boolean) from public, anon, authenticated;
grant execute on function public.support_search_knowledge(text, integer, boolean) to service_role;

-- PostgREST passa a enxergar as colunas e funções novas sem esperar.
notify pgrst, 'reload schema';
