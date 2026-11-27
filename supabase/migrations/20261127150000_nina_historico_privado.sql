-- Nina — histórico privado (PROPOSTA LOCAL; aplicar só com autorização do operador).
--
-- Por quê: a aluna lia as próprias linhas com `select *`, então qualquer chamada manual à API
-- devolvia a transcrição completa (`transcript`), o resumo interno e os metadados técnicos
-- (provedor, modelo, tokens). Esconder o botão não bastava.
--
-- O que muda:
--  1. Aluna (authenticated) lê SÓ as colunas de que o chat precisa. TXT, resumo, fontes e
--     metadados técnicos ficam para o servidor (service_role) e para a equipe autorizada.
--  2. Exportação do TXT apenas pela equipe (admin/support = permissão support:history),
--     com registro em admin_audit_log. Nada de URL pública nem armazenamento de arquivos.
--  3. A saudação da Nina passa a ser gravada só pelo servidor (a aluna não forja fala da assistente).
-- Depende de: 20261126120000_suporte_ia.sql e 20261127120000_nina_2_complemento.sql.
-- Idempotente.

-- 1) Leitura da aluna por coluna -------------------------------------------------------
revoke select on public.support_conversations from authenticated;
grant select (id, user_id, owner_label, status, origin, category, handoff_requested_at, handoff_topic,
              started_at, closed_at, close_reason, message_count)
  on public.support_conversations to authenticated;

revoke select on public.support_messages from authenticated;
grant select (id, conversation_id, seq, sender, content, actions, created_at)
  on public.support_messages to authenticated;

-- 2) Exportação administrativa do TXT --------------------------------------------------
create or replace function public.support_admin_export(p_conversation uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.support_conversations;
begin
  if not private.is_support_staff(auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_conv from public.support_conversations where id = p_conversation;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_conv.status <> 'closed' or v_conv.transcript is null then
    return jsonb_build_object('ok', false, 'error', 'not_closed');
  end if;
  insert into public.admin_audit_log (actor, action, target_user_id, details)
  values (auth.uid()::text, 'support.export', v_conv.user_id, jsonb_build_object('conversation_id', p_conversation));
  return jsonb_build_object('ok', true, 'id', v_conv.id, 'started_at', v_conv.started_at, 'transcript', v_conv.transcript);
end;
$$;

revoke all on function public.support_admin_export(uuid) from public, anon;
grant execute on function public.support_admin_export(uuid) to authenticated;

-- 3) Saudação só pelo servidor ----------------------------------------------------------
-- Antes, a aluna passava o texto da saudação e ele era gravado como fala da ASSISTENTE: com uma
-- chamada direta à API dava para forjar uma “resposta da Nina” no histórico e no TXT.
-- Agora a função da aluna só abre o atendimento (sem mensagens); a saudação entra pelo
-- servidor (service_role) via support_append_assistant_message. `p_greeting` é ignorado e só
-- continua na assinatura para o app funcionar antes e depois desta migration.
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
  values (v_user, left(coalesce(nullif(trim(p_owner_label), ''), 'Aluna'), 120), 0)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.support_start_conversation(text, text) from public, anon;
grant execute on function public.support_start_conversation(text, text) to authenticated;

notify pgrst, 'reload schema';
