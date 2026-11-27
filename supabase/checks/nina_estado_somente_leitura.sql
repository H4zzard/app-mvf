-- =====================================================================
-- Nina — verificação SOMENTE LEITURA do estado do banco (cole no SQL Editor do Supabase).
-- É um único SELECT: não cria, não altera e não apaga nada. Não devolve conteúdo de
-- conversas, TXT, e-mails nem chaves — só nomes, contagens e permissões.
-- Testada localmente contra as migrations (supabase/tests/support.test.ts).
-- Leia o resultado com docs/ATIVACAO_NINA.md §2.
-- =====================================================================
with
fn as (
  select p.oid, p.proname, p.oid::regprocedure::text as sig, p.prosecdef,
         exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') as pinned
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where (n.nspname = 'public' and p.proname like 'support_%') or (n.nspname = 'private' and p.proname = 'is_support_staff')
),
checks(ord, item, valor) as (
  select 1, 'projeto (banco atual)', current_database() || ' · ' || coalesce(current_setting('app.settings.project_ref', true), 'ref: veja a URL do painel')
  union all
  select 2, 'migrations registradas (supabase_migrations)',
    case when to_regclass('supabase_migrations.schema_migrations') is null then 'tabela ausente (migrations aplicadas pelo SQL Editor não ficam registradas)'
         else coalesce((xpath('/row/v/text()', query_to_xml(
           'select string_agg(version, '', '' order by version) as v from supabase_migrations.schema_migrations', false, true, '')))[1]::text, 'nenhuma') end
  union all
  select 3, 'tabelas support_*', coalesce((select string_agg(c.relname, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                                           where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'support_%'), 'nenhuma (migration 20261126120000 não aplicada)')
  union all
  select 4, 'RLS ligada em todas as support_*', coalesce((select bool_and(c.relrowsecurity)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
                                                          where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'support_%'), 'n/a')
  union all
  select 5, 'complemento 20261127120000 (close_reason + actions + busca com type)',
    case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'support_conversations' and column_name = 'close_reason')
          and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'support_messages' and column_name = 'actions')
          and exists (select 1 from fn where sig = 'support_begin_close(uuid,text)')
          and exists (select 1 from fn where sig = 'support_append_system_message(uuid,text)')
          and not exists (select 1 from fn where sig in ('support_begin_close(uuid)', 'support_append_assistant_message(uuid,text,jsonb,jsonb)'))
         then 'APLICADO' else 'PENDENTE' end
  union all
  select 6, 'histórico privado 20261127150000 (aluna sem transcript + exportação auditada)',
    case when to_regclass('public.support_conversations') is null then 'PENDENTE'
         when not has_column_privilege('authenticated', 'public.support_conversations', 'transcript', 'SELECT')
          and not has_column_privilege('authenticated', 'public.support_messages', 'meta', 'SELECT')
          and exists (select 1 from fn where sig = 'support_admin_export(uuid)')
         then 'APLICADO' else 'PENDENTE' end
  union all
  select 7, 'aluna (authenticated) consegue ler transcript?',
    case when to_regclass('public.support_conversations') is null then 'n/a'
         when has_column_privilege('authenticated', 'public.support_conversations', 'transcript', 'SELECT') then 'SIM — exposto (aplicar 20261127150000)' else 'não' end
  union all
  select 8, 'políticas RLS support_*', coalesce((select string_agg(tablename || '.' || policyname || ' (' || cmd || ')', ', ' order by tablename, policyname)
                                                  from pg_policies where schemaname = 'public' and tablename like 'support_%'), 'nenhuma')
  union all
  select 9, 'funções support_* (assinaturas)', coalesce((select string_agg(sig, ', ' order by sig) from fn), 'nenhuma')
  union all
  select 10, 'funções executáveis por anon (esperado: nenhuma)', coalesce((select string_agg(sig, ', ' order by sig) from fn where has_function_privilege('anon', oid, 'execute')), 'nenhuma')
  union all
  select 11, 'funções executáveis por authenticated', coalesce((select string_agg(sig, ', ' order by sig) from fn where has_function_privilege('authenticated', oid, 'execute')), 'nenhuma')
  union all
  select 12, 'SECURITY DEFINER sem search_path fixo (esperado: nenhuma)', coalesce((select string_agg(sig, ', ') from fn where prosecdef and not pinned), 'nenhuma')
  union all
  select 13, 'base de conhecimento (documentos por tipo/status)',
    case when to_regclass('public.support_knowledge_documents') is null then 'n/a'
         else coalesce((xpath('/row/v/text()', query_to_xml(
           'select string_agg(type || ''/'' || status || ''='' || n, '', '' order by type, status) as v from (select type, status, count(*) n from public.support_knowledge_documents group by 1, 2) s', false, true, '')))[1]::text, 'vazia') end
  union all
  select 14, 'trechos na base', case when to_regclass('public.support_knowledge_chunks') is null then 'n/a'
         else coalesce((xpath('/row/n/text()', query_to_xml('select count(*) as n from public.support_knowledge_chunks', false, true, '')))[1]::text, '0') end
  union all
  select 15, 'documentos que ainda falam em baixar/download da conversa (só ids)',
    case when to_regclass('public.support_knowledge_chunks') is null then 'n/a'
         else coalesce((xpath('/row/v/text()', query_to_xml(
           'select string_agg(distinct document_id, '', '') as v from public.support_knowledge_chunks where content ~* ''(baixar|download|transcri[cç][aã]o).{0,40}(conversa|atendimento)|(conversa|atendimento).{0,40}(baixar|download)''', false, true, '')))[1]::text, 'nenhum') end
  union all
  select 16, 'atendimentos por status (só contagem)',
    case when to_regclass('public.support_conversations') is null then 'n/a'
         else coalesce((xpath('/row/v/text()', query_to_xml(
           'select string_agg(status || ''='' || n, '', '' order by status) as v from (select status, count(*) n from public.support_conversations group by 1) s', false, true, '')))[1]::text, 'nenhum') end
  union all
  select 17, 'papéis da equipe (só contagem)', coalesce((select string_agg(role || '=' || n, ', ' order by role) from (select role, count(*) n from public.user_roles group by 1) s), 'nenhum')
)
select item, valor from checks order by ord;
