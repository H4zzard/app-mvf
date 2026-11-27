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

notify pgrst, 'reload schema';
