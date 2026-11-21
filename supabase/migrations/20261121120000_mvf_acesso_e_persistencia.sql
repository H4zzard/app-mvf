-- =====================================================================
-- App MVF — acesso de compradoras, papéis e persistência de plano/progresso
-- Migration idempotente (pode ser reaplicada). Não contém dados.
--
-- Princípios:
--  * Acesso = pelo menos um direito ATIVO (purchase_entitlements) OU papel
--    de equipe atribuído via CLI auditada. Nunca vem do cliente.
--  * RLS em todas as tabelas expostas. A aluna só lê/escreve as próprias
--    linhas permitidas E só enquanto tiver acesso ativo (revogação vale
--    mesmo com sessão Auth válida).
--  * Compras, eventos, papéis, importações e auditoria: sem acesso para
--    anon/authenticated; só service_role no servidor.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (email = lower(email)),
  display_name text check (char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_email_key on public.profiles (email);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'admin', 'expert', 'moderator', 'support', 'partner')),
  granted_by text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Um registro por pedido da Kiwify. Acesso derivado de access_state = 'active'.
create table if not exists public.purchase_entitlements (
  id bigint generated always as identity primary key,
  order_id text not null unique,
  product_id text not null,
  customer_email text not null check (customer_email = lower(customer_email)),
  user_id uuid references auth.users (id) on delete set null,
  kiwify_status text not null,
  access_state text not null check (access_state in ('active', 'revoked', 'none')),
  source text not null check (source in ('webhook', 'import', 'reconcile', 'manual')),
  kiwify_created_at timestamptz,
  kiwify_updated_at timestamptz,
  granted_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists purchase_entitlements_user_active_idx
  on public.purchase_entitlements (user_id) where access_state = 'active';
create index if not exists purchase_entitlements_email_idx on public.purchase_entitlements (customer_email);

-- Eventos recebidos. Sem payload bruto (PII): só hash do corpo e campos de controle.
create table if not exists public.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null default 'kiwify',
  dedup_key text not null unique,
  event_type text not null,
  order_id text,
  order_status text,
  body_sha256 text not null,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'pending_verification', 'failed')),
  attempts integer not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists webhook_events_status_idx on public.webhook_events (status, received_at desc);

create table if not exists public.onboarding_submissions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  onboarding_version integer not null,
  status text not null check (status in ('draft', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Histórico de planos gerados pelo motor determinístico (src/lib/personalization).
-- O SQL NÃO reimplementa a lógica: só guarda o que o servidor gerou.
create table if not exists public.user_plan_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  revision integer not null check (revision > 0),
  is_active boolean not null default true,
  engine_version text not null,
  onboarding_version integer not null,
  answers jsonb not null,
  task_ids text[] not null,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, revision)
);
create unique index if not exists user_plan_snapshots_one_active
  on public.user_plan_snapshots (user_id) where is_active;

-- Progresso por ID estável. Pode existir para tarefas fora do plano atual.
create table if not exists public.user_task_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null check (task_id ~ '^t-[a-z0-9-]{1,60}$'),
  status text not null check (status in ('pending', 'in_progress', 'completed')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);
create unique index if not exists user_task_progress_one_in_progress
  on public.user_task_progress (user_id) where status = 'in_progress';

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('dry_run', 'execute')),
  range_start date not null,
  range_end date not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  cursor jsonb not null default '{}'::jsonb,
  counts jsonb not null default '{}'::jsonb,
  last_error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  target_user_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Funções de autorização (schema privado, não exposto pela API)
-- ---------------------------------------------------------------------

create or replace function private.has_active_access(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and (
    exists (
      select 1 from public.purchase_entitlements e
      where e.user_id = p_user_id and e.access_state = 'active'
    )
    or exists (
      -- Equipe com papel atribuído via CLI auditada (bypass autorizado).
      select 1 from public.user_roles r
      where r.user_id = p_user_id and r.role in ('admin', 'expert', 'support', 'moderator')
    )
  );
$$;

revoke all on function private.has_active_access(uuid) from public, anon;
grant execute on function private.has_active_access(uuid) to authenticated, service_role;

-- Resumo de acesso da própria usuária (sem detalhes de pedidos).
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'has_access', private.has_active_access(auth.uid()),
    'has_entitlement', exists (
      select 1 from public.purchase_entitlements e
      where e.user_id = auth.uid() and e.access_state = 'active'
    ),
    'roles', coalesce((
      select jsonb_agg(r.role order by r.role) from public.user_roles r where r.user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- Localiza usuário Auth por e-mail (só servidor). Evita listUsers paginado.
create or replace function public.admin_find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;

revoke all on function public.admin_find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_find_user_id_by_email(text) to service_role;

-- ---------------------------------------------------------------------
-- Operações atômicas da aluna (SECURITY INVOKER: RLS se aplica)
-- ---------------------------------------------------------------------

-- Cria/atualiza o plano com controle de concorrência por revisão.
create or replace function public.apply_onboarding(
  p_answers jsonb,
  p_onboarding_version integer,
  p_engine_version text,
  p_task_ids text[],
  p_plan jsonb,
  p_expected_revision integer
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select s.revision into v_current
  from public.user_plan_snapshots s
  where s.user_id = v_user and s.is_active
  for update;

  v_current := coalesce(v_current, 0);
  if v_current <> p_expected_revision then
    raise exception 'revision_conflict' using errcode = '40001';
  end if;

  update public.user_plan_snapshots set is_active = false
  where user_id = v_user and is_active;

  insert into public.user_plan_snapshots
    (user_id, revision, is_active, engine_version, onboarding_version, answers, task_ids, plan)
  values
    (v_user, v_current + 1, true, p_engine_version, p_onboarding_version, p_answers, p_task_ids, p_plan);

  insert into public.onboarding_submissions (user_id, answers, onboarding_version, status, completed_at, updated_at)
  values (v_user, p_answers, p_onboarding_version, 'completed', now(), now())
  on conflict (user_id) do update
    set answers = excluded.answers,
        onboarding_version = excluded.onboarding_version,
        status = 'completed',
        completed_at = now(),
        updated_at = now();

  return v_current + 1;
end;
$$;

-- Salva rascunho sem sobrescrever um onboarding já concluído.
create or replace function public.save_onboarding_draft(p_answers jsonb, p_onboarding_version integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  insert into public.onboarding_submissions (user_id, answers, onboarding_version, status, updated_at)
  values (auth.uid(), p_answers, p_onboarding_version, 'draft', now())
  on conflict (user_id) do update
    set answers = excluded.answers,
        onboarding_version = excluded.onboarding_version,
        updated_at = now()
    where public.onboarding_submissions.status = 'draft';
end;
$$;

-- Atualiza o status de uma tarefa (uma única "em andamento" por aluna).
create or replace function public.set_task_status(p_task_id text, p_status text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_status = 'in_progress' then
    update public.user_task_progress
      set status = 'pending', updated_at = now()
    where user_id = v_user and status = 'in_progress' and task_id <> p_task_id;
  end if;
  insert into public.user_task_progress (user_id, task_id, status, completed_at, updated_at)
  values (
    v_user, p_task_id, p_status,
    case when p_status = 'completed' then now() else null end,
    now()
  )
  on conflict (user_id, task_id) do update
    set status = excluded.status,
        completed_at = case
          when excluded.status = 'completed'
            then coalesce(public.user_task_progress.completed_at, now())
          else null end,
        updated_at = now();
end;
$$;

revoke all on function public.apply_onboarding(jsonb, integer, text, text[], jsonb, integer) from public, anon;
revoke all on function public.save_onboarding_draft(jsonb, integer) from public, anon;
revoke all on function public.set_task_status(text, text) from public, anon;
grant execute on function public.apply_onboarding(jsonb, integer, text, text[], jsonb, integer) to authenticated;
grant execute on function public.save_onboarding_draft(jsonb, integer) to authenticated;
grant execute on function public.set_task_status(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- RLS e privilégios
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.purchase_entitlements enable row level security;
alter table public.webhook_events enable row level security;
alter table public.onboarding_submissions enable row level security;
alter table public.user_plan_snapshots enable row level security;
alter table public.user_task_progress enable row level security;
alter table public.import_runs enable row level security;
alter table public.admin_audit_log enable row level security;

-- Remove os grants padrão do Supabase e concede só o necessário.
revoke all on table
  public.profiles, public.user_roles, public.purchase_entitlements, public.webhook_events,
  public.onboarding_submissions, public.user_plan_snapshots, public.user_task_progress,
  public.import_runs, public.admin_audit_log
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update on public.onboarding_submissions to authenticated;
grant select, insert, update on public.user_plan_snapshots to authenticated;
grant select, insert, update on public.user_task_progress to authenticated;

grant all on table
  public.profiles, public.user_roles, public.purchase_entitlements, public.webhook_events,
  public.onboarding_submissions, public.user_plan_snapshots, public.user_task_progress,
  public.import_runs, public.admin_audit_log
to service_role;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) and (select private.has_active_access()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid()) and (select private.has_active_access()))
  with check (user_id = (select auth.uid()));

-- user_roles: só leitura dos próprios papéis (para o menu); escrita só via CLI.
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

-- onboarding_submissions
drop policy if exists onboarding_select_own on public.onboarding_submissions;
create policy onboarding_select_own on public.onboarding_submissions for select to authenticated
  using (user_id = (select auth.uid()) and (select private.has_active_access()));
drop policy if exists onboarding_insert_own on public.onboarding_submissions;
create policy onboarding_insert_own on public.onboarding_submissions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.has_active_access()));
drop policy if exists onboarding_update_own on public.onboarding_submissions;
create policy onboarding_update_own on public.onboarding_submissions for update to authenticated
  using (user_id = (select auth.uid()) and (select private.has_active_access()))
  with check (user_id = (select auth.uid()));

-- user_plan_snapshots
drop policy if exists snapshots_select_own on public.user_plan_snapshots;
create policy snapshots_select_own on public.user_plan_snapshots for select to authenticated
  using (user_id = (select auth.uid()) and (select private.has_active_access()));
drop policy if exists snapshots_insert_own on public.user_plan_snapshots;
create policy snapshots_insert_own on public.user_plan_snapshots for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.has_active_access()));
drop policy if exists snapshots_update_own on public.user_plan_snapshots;
create policy snapshots_update_own on public.user_plan_snapshots for update to authenticated
  using (user_id = (select auth.uid()) and (select private.has_active_access()))
  with check (user_id = (select auth.uid()));

-- user_task_progress
drop policy if exists progress_select_own on public.user_task_progress;
create policy progress_select_own on public.user_task_progress for select to authenticated
  using (user_id = (select auth.uid()) and (select private.has_active_access()));
drop policy if exists progress_insert_own on public.user_task_progress;
create policy progress_insert_own on public.user_task_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.has_active_access()));
drop policy if exists progress_update_own on public.user_task_progress;
create policy progress_update_own on public.user_task_progress for update to authenticated
  using (user_id = (select auth.uid()) and (select private.has_active_access()))
  with check (user_id = (select auth.uid()));

-- purchase_entitlements, webhook_events, import_runs, admin_audit_log:
-- RLS ligada e NENHUMA policy para anon/authenticated → negado por padrão.
