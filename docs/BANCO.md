# Banco de dados (Supabase Postgres)

Migration única e idempotente: `supabase/migrations/20261121120000_mvf_acesso_e_persistencia.sql`.

## Tabelas
| Tabela | Conteúdo | Acesso da aluna |
|---|---|---|
| `profiles` | `user_id` (= auth.users), e-mail (minúsculo, único), nome exibido | lê a própria; altera só `display_name` |
| `user_roles` | papéis de equipe (CLI) | lê os próprios |
| `purchase_entitlements` | 1 linha por pedido Kiwify; `access_state` active/revoked/none | **nenhum** |
| `webhook_events` | dedup, hash do corpo, status, erro sanitizado (sem payload/PII) | **nenhum** |
| `onboarding_submissions` | respostas (rascunho ou concluídas), versão do questionário | própria, com acesso ativo |
| `user_plan_snapshots` | planos gerados (revisão, versão do motor, IDs das tarefas, JSON) | própria, com acesso ativo |
| `user_task_progress` | status por `(user_id, task_id)` — inclusive fora do plano atual | própria, com acesso ativo |
| `import_runs` | cursor e contagens das importações | **nenhum** |
| `admin_audit_log` | ações administrativas (papéis, procedimentos) | **nenhum** |

“Com acesso ativo” = `private.has_active_access()`: pedido ativo **ou** papel de equipe. Após
reembolso, a aluna perde leitura e escrita na hora, mesmo com sessão válida; os dados ficam
guardados para uma eventual reativação.

## Funções
- `public.my_access()` — resumo do próprio acesso (security definer, só `authenticated`).
- `public.apply_onboarding(...)` — grava respostas + novo snapshot **atomicamente**, com controle de
  revisão (`revision_conflict` se outro dispositivo salvou antes). Security invoker → RLS vale.
- `public.set_task_status(task_id, status)` — upsert por ID; garante uma “em andamento”.
- `public.save_onboarding_draft(...)` — não sobrescreve onboarding concluído.
- `public.admin_find_user_id_by_email(email)` — só `service_role`.

O plano é gerado **somente** pelo motor TypeScript (`src/lib/personalization`). O SQL guarda o
resultado; não há segunda implementação.

## Versionamento
- Respostas: `onboarding_version` (`ONBOARDING_VERSION` em `src/config/onboarding-questions.ts`).
- Motor/catálogo: `engine_version` (`ENGINE_VERSION`). O app exibe o plano gerado pelo motor
  atual a partir das respostas; o snapshot registra o que foi gerado em cada revisão.
- IDs de tarefa são permanentes (`^t-[a-z0-9-]{1,60}$`). Renomear exige migration de dados.
- Novas mudanças de schema: novo arquivo `supabase/migrations/AAAAMMDDHHMMSS_descricao.sql`.

## Aplicar
**Produção/homologação (Supabase hospedado):**
1. Supabase Studio → SQL Editor → colar o arquivo da migration → Run. (Ou CLI: `supabase link`
   + `supabase db push`.)
2. Conferir em Database → Tables que RLS está **enabled** em todas as tabelas listadas.
3. Nunca rodar comandos destrutivos em produção sem backup e instrução explícita.

**Local (opcional, exige Docker):** `supabase start` → `supabase db reset` aplica as migrations
num banco limpo (destrutivo só no banco local).

## Testes
`npm test` inclui `supabase/tests/rls.test.ts`: aplica as migrations reais num **PGlite**
(Postgres 17 em WASM, sem Docker) com um *stub* mínimo do Supabase (papéis anon/authenticated/
service_role, `auth.users`, `auth.uid()` lendo o claim `sub`). Cobre isolamento entre alunas,
tentativa de forjar `user_id`/papel/compra, revogação com sessão válida, dois pedidos, conflito
de revisão, rascunho e idempotência da migration.
**Limite:** não substitui um teste no Supabase real (GoTrue, PostgREST, grants padrão do projeto).
Após aplicar no projeto real, repetir os testes manuais de `docs/AUTH_E_ACESSO.md`.
