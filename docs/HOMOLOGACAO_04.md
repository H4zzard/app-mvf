# Homologação — Prompt 04 · Fase A (auditoria pré-conexão)

**Data:** 21/11/2026 · **Situação:** sem credenciais, sem projeto Supabase, sem SMTP, sem deploy.
Tudo abaixo foi verificado **no código e com testes locais**; nada tocou serviços reais.
Guia de configuração: [SETUP_REAL_04.md](SETUP_REAL_04.md). Evidências: [RELATORIO_PILOTO_04.md](RELATORIO_PILOTO_04.md).

## 1. Mapa de dependências

```
Aluna ──HTTPS──▶ App Next.js (deploy) ──▶ Supabase Auth (link mágico) ──▶ SMTP próprio ──▶ caixa da aluna
                     │  getClaims + my_access()            ▲
                     ├──▶ Supabase Postgres (RLS) ◀── service role (webhook, CLIs)
                     │
Kiwify ──webhook assinado──▶ /api/webhooks/kiwify ──GET /sales/{id}──▶ Kiwify API (OAuth)
Operador ──CLI──▶ import / reconcile / probe / grant-order / admin:role / preflight
```

| Componente | Estado | Motivo |
|---|---|---|
| Código de auth/autorização | **PRONTO** | Testado localmente (unidade, PGlite, navegador em produção com Supabase inacessível). |
| Migration + RLS | **PRONTO (local)** / **PENDENTE (remoto)** | Testada em PGlite. Falta aplicar e testar num projeto real. |
| Supabase Auth | **BLOQUEADO** | Projeto não criado; chaves inexistentes. |
| SMTP próprio | **BLOQUEADO** | Provedor e domínio de envio não definidos. Sem ele, não há login de alunas. |
| Kiwify API | **BLOQUEADO** | Sem credenciais. Formato de data e paginação não confirmados (ver §5). |
| Kiwify webhook | **PRONTO (código)** / **BLOQUEADO (real)** | Assinatura conferida com o vetor oficial; falta URL pública e token. |
| Deploy/domínio | **BLOQUEADO** | Sem hospedagem nem domínio de homologação. |
| Preflight | **PRONTO** | `npm run preflight` (novo). |

## 2. Ambientes

| | Desenvolvimento | Homologação | Produção |
|---|---|---|---|
| Onde roda | `npm run dev` local | Deploy separado, URL própria (ex.: `homolog.SEU-DOMINIO`) | Deploy final (ex.: `app.SEU-DOMINIO`) |
| Supabase | nenhum (demo) **ou** o projeto de homologação | **projeto próprio** `mvf-homolog` | **projeto próprio** `mvf-prod` |
| Dados | fictícios (demo em memória) | contas da equipe + 2–3 compradoras autorizadas | todas as alunas |
| SMTP | não envia | SMTP próprio (pode ser o mesmo provedor, remetente de homologação) | SMTP próprio |
| Kiwify | sem chamadas | mesma conta (não há sandbox): **só leitura** + `grant-order` de pedidos autorizados; webhook de homologação só na fase C5 | webhook de produção + importação em lotes |
| `MVF_DEMO_MODE` | `true` opcional | **vazio/false** | **vazio/false** |

Projetos Supabase separados evitam que um teste de homologação toque dados de produção. A Kiwify
não tem sandbox ("A API trabalha sempre com dados reais"), então em homologação ela é usada só
para leitura e para liberar pedidos escolhidos.

## 3. Variáveis por ambiente (só nomes e exemplos sintéticos)

| Variável | Finalidade | Dev | Homolog | Prod | Exemplo sintético |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto (pública) | opcional | obrigatória | obrigatória | `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável (pública, passa pela RLS) | opcional | obrigatória | obrigatória | `sb_publishable_xxx` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave **secreta** (ignora RLS): webhook e CLIs | não | obrigatória | obrigatória | `sb_secret_xxx` |
| `APP_BASE_URL` | origem usada no link mágico | `http://localhost:3000` | `https://homolog…` | `https://app…` | — |
| `MVF_SUPPORT_CONTACT_URL` | contato em “Acesso indisponível” | não | recomendada | recomendada | `https://…/suporte` |
| `KIWIFY_ACCOUNT_ID` / `KIWIFY_CLIENT_ID` / `KIWIFY_CLIENT_SECRET` | API OAuth (as três ou nenhuma) | não | sim (leitura) | sim | — |
| `KIWIFY_WEBHOOK_TOKEN` | valida HMAC do webhook | não | só na C5 | sim | ≥ 16 caracteres |
| `KIWIFY_WEBHOOK_TOKEN_PREVIOUS` | rotação (~24 h) | não | não | só em rotação | — |
| `KIWIFY_ALLOWED_PRODUCT_IDS` | produtos que liberam acesso | não | sim | sim | `id1,id2` |
| `MVF_DEMO_MODE` | demo local | `true` opcional | vazio | vazio | — |

Regras checadas pelo `npm run preflight -- --target <ambiente>`: nada sensível em `NEXT_PUBLIC_*`,
chave publicável não pode ser elevada, chave secreta diferente da publicável, `APP_BASE_URL` https
público, demo desligado, credenciais Kiwify completas, token longo, IDs válidos, `.gitignore` cobre `.env*`.

## 4. URLs e callbacks

| Onde | Valor | Observação |
|---|---|---|
| Supabase → Site URL | `APP_BASE_URL` do ambiente | Um projeto por ambiente, então cada um tem a sua. |
| Supabase → Redirect URLs | **exatamente** `https://<origem>/auth/confirm` | Sem curingas `**` em homologação/produção. `localhost` só no projeto de homologação, se usado em dev. |
| Template “Magic Link” | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` | Não usa `redirect_to`; o destino pós-login vem de cookie httpOnly com allowlist interna (`sanitizeReturnTo`). |
| Kiwify → Webhook | `https://<origem>/api/webhooks/kiwify` | Token obrigatório; só o produto MVF; gatilhos: compra aprovada, reembolso, chargeback. |

Redirecionamento externo é impossível por construção: `returnTo` só aceita caminhos internos de uma
allowlist (testado), e o callback não lê `redirect_to`.

## 5. Contrato Kiwify — verificação na documentação vigente (21/11/2026)

Fontes: docs.kiwify.com.br (general, auth/oauth, sales/list, sales/single, webhooks/receiving,
webhooks/create, webhooks/list) e a central de ajuda (artigo de webhooks, atualizado em 26/07/2024).

| Item | Documentação | Implementação | Situação |
|---|---|---|---|
| Assinatura do webhook | Uma única geração: HMAC-SHA1 hex do corpo cru, chave = token, na query `signature`. Sem header de auth, sem timestamp. Vetor oficial publicado. | Idêntica; vetor oficial passa byte a byte. | **Confere** |
| Replay | “não protege contra replay”; deduplicar por `order_id + webhook_event_type` | Dedup por essa chave; aprovação reconfirma na API. | **Confere** |
| Webhook sem token | chave vazia “não prova nada” | Sem token → 503; token vazio nunca valida. | **Confere** |
| OAuth | `POST /oauth/token`, form-urlencoded, `client_id` + `client_secret`; resposta com `access_token`, `expires_in` (exemplo 86400), `scope` | Igual; token reutilizado, renovado em 401. | **Confere**; prefixo `/v1` vem do OpenAPI (`servers`), confirmar com `preflight --remote`. |
| Headers da API | `Authorization: Bearer` + `x-kiwify-account-id` | Igual. | **Confere** |
| Validade do client secret | “expira em 96 horas” (página geral), não conciliado com `expires_in` | Erro de auth é reportado; não renovamos o secret. | **Dúvida material:** se o secret expirar em 96 h, webhook e CLIs param. Confirmar no painel. |
| Escopos | Exemplo: `stats products events sales sales_refund financial affiliates webhooks`. A doc não diz se dá para escolher ao criar a chave. | Só usamos `sales`. Preflight mostra os escopos e alerta se faltar `sales`. | **A confirmar** no painel; pedir o mínimo se houver opção. |
| `GET /sales` datas | `start_date`/`end_date` “string”; página geral dá o exemplo `2020-07-10 15:00:00.000` | Padrão `space`; `--date-style iso` alternativo. | **Não confirmado** → `npm run kiwify -- probe` testa os dois, só leitura. |
| Janela | máx. 90 dias | Janelas de 90 dias. | **Confere** |
| Paginação | `pagination{count,page_number,page_size}`; máximo de `page_size` não documentado | **Corrigido nesta entrega:** antes parava quando vinham menos de 50; agora usa `count` e o `page_size` devolvido, e alerta divergência. | **Corrigido**, a confirmar no probe |
| Datas das vendas | API: ISO com `Z` (ex. `2023-10-31T16:53:05.119Z`). Webhook: `YYYY-MM-DD HH:mm` em horário de Brasília. | Só a API é usada para comparar datas (`parseKiwifyTime` aceita ISO). Datas do webhook são ignoradas. | **Confere** |
| Status em `/sales/{id}` | Enum só documentado no filtro da lista: approved, authorized, chargedback, paid, pending, pending_refund, processing, refunded, refund_requested, refused, waiting_payment | Concede `paid`/`approved`; revoga `refunded`/`chargedback`; o resto não altera. | **Coerente** |
| Payload do webhook | Documentados: `order_id`, `order_status`, `webhook_event_type`, `subscription_id`. Produto e cliente **não** documentados. | Só esses campos; produto e e-mail vêm da API. | **Confere** (decisão conservadora mantida) |
| Order bump / upsell | Cada venda tem um `product`; `parent_order_id` existe sem descrição. | Allowlist por `product.id`. | **Risco R5** |
| Retentativas | Algumas vezes, de 1 a 10 min; 40 s de timeout; reenvio manual em “Ver logs”. | 503 quando não dá para confirmar; `reconcile` reprocessa pendentes. | **Confere** |
| Sandbox | “Não. A API trabalha sempre com dados reais.” | Testes reais = só leitura + pedidos autorizados. | **Confere** |
| Limite | 100 chamadas/min por usuário | 90/min local + backoff. | **Confere** |

Não há indício de uma segunda geração de assinatura (header ou SHA-256) na documentação vigente.
Se o painel da conta mostrar algo diferente ao criar o webhook, **não ligar**: registrar e ajustar com testes.

## 6. Auditoria de acesso e dados

| Ponto | Resultado | Evidência |
|---|---|---|
| Sessão ≠ matrícula | Toda rota privada e Server Action exige `my_access().has_access`; sessão sem matrícula → `/acesso-indisponivel`. RLS repete a regra no banco. | `src/lib/auth/viewer.ts`, `src/app/(app)/layout.tsx`, `plan-actions.ts`; testes RLS. |
| Proxy | Só renova sessão e pré-filtra; nenhuma decisão de acesso depende dele. | `src/proxy.ts`; cenário C (cookie forjado → login). |
| Cadastro público | `shouldCreateUser: false` + desligar “Allow new users to sign up” (preflight `--remote` confere `disable_signup`). | `login/actions.ts`, `preflight.ts`. |
| Pré-provisionamento | **Sem dependência circular:** webhook, importação e o novo `grant-order` chamam `admin.createUser` (sem e-mail, e-mail confirmado) **antes** de gravar a matrícula. A primeira mensagem que a aluna recebe é o link que ela mesma pede. | `src/lib/access/provisioning.ts`, `supabase-store.ts`. |
| E-mail com maiúsculas | Normalizado para minúsculas em todas as entradas; busca no Auth com `lower()`. | `normalizeEmail`, `admin_find_user_id_by_email`. Falta confirmar ao vivo que o Auth guarda minúsculo. |
| Várias compras | Uma conta por e-mail; acesso se **qualquer** pedido estiver ativo; revogar um mantém os outros. | Testes Kiwify e RLS (“dois pedidos”). |
| Produtos diferentes | Só `KIWIFY_ALLOWED_PRODUCT_IDS`; vazio = nada liberado. | `isAllowedProduct`. |
| Reembolso parcial | Não documentado pela Kiwify; `refund_requested`/`pending_refund` mantêm o acesso, `refunded` revoga o pedido inteiro. | `rules.ts`. Decisão do operador (ver riscos). |
| Estorno posterior | `chargeback` revoga na hora, mesmo após meses. | Teste do webhook. |
| Compra repetida após reembolso | Novo `order_id` → nova matrícula ativa na mesma conta. Mesmo pedido “aprovado” após estorno → `needs_review`. | `reconcileSale`. |
| Conta criada antes/depois da importação | Idempotente: reutiliza a conta pelo e-mail; não duplica. | Teste “reexecutar”. |
| Concorrência | Plano com revisão (`revision_conflict`); tarefa por `(user_id, task_id)`; uma “em andamento”. | Testes RLS. |
| Revogação com sessão válida | RLS bloqueia leitura e escrita na hora. | Teste RLS “revogação”. |
| Admin | Papel só no banco, só via CLI auditada; `/admin` 403 e `/api/admin/health` 401/403 no servidor. | Cenários B/C; `permissions.ts`. |
| Segredos | Service role só em `admin.ts` (server-only) e CLIs; preflight bloqueia segredo em `NEXT_PUBLIC_*`. | `preflight.test.ts`. |
| Imports repetidos | Idempotentes, retomáveis por cursor. | Testes do importador. |
| Webhooks duplicados / fora de ordem | Dedup + reconfirmação do estado atual + `stale` por `updated_at`. | Testes do webhook. |
| Eventos pendentes | Ficam `pending_verification`; `npm run kiwify -- reconcile --execute` reprocessa **sem depender** de reenvio da Kiwify. Não há agendador automático ainda. | `scripts/kiwify.ts`. |

## 7. Limite de tentativas (login)

- O limitador da aplicação é **em memória, por instância**. Em serverless cada instância tem o seu
  contador, então **não é uma proteção confiável**. Ele só ajuda contra rajadas na mesma instância.
- As proteções reais são as do Supabase Auth: 60 s entre links por usuária; 30 pedidos/5 min por IP
  em `/otp`; 30/5 min por IP em `/verify`; teto de e-mails por hora do projeto (30/h ao ligar o SMTP
  próprio, ajustável).
- **Atenção (R3):** o login chama o Supabase **a partir do servidor**. O Supabase pode enxergar o IP
  do servidor, e não o da aluna. Aí o limite “por IP” vira um limite **global** do app: 30 pedidos de
  link a cada 5 min para todas as alunas juntas. Irrelevante no piloto, crítico num lançamento para
  500 pessoas. Opções, a decidir com teste real: (a) encaminhar o IP da aluna com o mecanismo
  `Sb-Forwarded-For` do Supabase (exige chave secreta e ativação); (b) ajustar os limites no painel;
  (c) chamar `signInWithOtp` direto do navegador.
- Mitigação mínima viável no deploy: regra de rate limit da plataforma (ex.: firewall da Vercel) para
  `POST /login` por IP, e CAPTCHA do Supabase (Turnstile/hCaptcha) se houver abuso.
- **Corrigido nesta entrega:** o 429 do Supabase só ocorre para e-mails que **existem**. Antes a tela
  respondia “muitas tentativas” e revelava quem é compradora. Agora a resposta é neutra.

## 8. Testes: cobertos × faltando

**Cobertos localmente (107 testes, `npm test`):** regras do motor; RLS em PGlite (isolamento, forja,
revogação, dois pedidos, conflito de revisão); assinatura com vetor oficial; dedup; ordem trocada;
produto fora da allowlist; botão de teste; API fora; importação com retomada; paginação com
`page_size` limitado (novo); totais por status (novo); probe sem PII (novo); preflight (novo);
parâmetros do link (novo).
**Navegador, produção sem backend real:** cenários B (8/8) e C (22/22 dos antigos + 12/12 da página
de confirmação).

**Faltando (exigem serviços reais, Fase C):** envio/recebimento do link; `verifyOtp` real; Auth
guardando e-mail minúsculo; RLS e grants no Supabase hospedado; comportamento real do limite por IP;
OAuth real e escopos; formato de data e paginação reais; webhook real com token; persistência entre
dispositivos com sessão real; entregabilidade (SPF/DKIM/DMARC, spam, pré-abertura por antivírus).

## 9. Riscos e mitigação (por prioridade)

| # | Risco | Prioridade | Mitigação |
|---|---|---|---|
| R1 | Sem SMTP próprio, ninguém fora da equipe recebe o link | **P0** | Configurar antes de qualquer piloto externo (SETUP §2). |
| R2 | Client secret da Kiwify “expira em 96 horas” | **P0** (a confirmar) | Confirmar no painel; se for real, criar rotina de renovação e monitorar `oauth_token_*` no `/admin`. |
| R3 | Limite por IP do Supabase aplicado ao IP do servidor | **P1** (antes do lançamento amplo) | Medir em homologação; adotar `Sb-Forwarded-For` ou login pelo navegador. |
| R4 | Formato de data/paginação de `/sales` diferente do suposto | **P1** | `kiwify probe` antes de qualquer dry-run; paginação já resiste a `page_size` menor. |
| R5 | MVF vendido como order bump/upsell com outro `product.id` | **P1** | Conferir no probe/painel como aparecem as vendas do MVF; incluir só IDs corretos. |
| R6 | Antivírus de e-mail (Safe Links) consumindo o link | **Mitigado** | Nova página intermediária: o link só é validado no clique (POST). |
| R7 | Enumeração de compradoras pelo 429 | **Mitigado** | Resposta neutra. |
| R8 | Eventos pendentes sem agendador | **P2** | Rodar `reconcile --execute` diariamente no piloto; depois cron do provedor. |
| R9 | Rastreamento de cliques do provedor reescrevendo o link | **P1** | Desligar click tracking no SMTP (SETUP §2). |
| R10 | Dados reais de compradoras em homologação | **P2** | Só pedidos autorizados (`grant-order`); mesmo rigor de produção; apagar após o piloto, se decidido. |
| R11 | Chaves legadas `anon`/`service_role` descontinuadas pelo Supabase até o fim de 2026 | **P2** | Usar `sb_publishable_`/`sb_secret_` desde já (preflight avisa). |
