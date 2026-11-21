# Relatório do piloto — Prompt 04 · matriz de evidências

**Última atualização:** 21/11/2026 · **Classificação atual:** `PRONTO PARA CONFIGURAR` (bloqueado por configuração externa).

Legenda de ambiente: **L** = automatizado local · **LP** = navegador local em modo produção, sem
backend real · **H** = homologação real · **P** = produção/piloto.
“PASSOU” só vale para o ambiente indicado. Teste local **não** comprova integração real.
Contas são identificadas por código (`EQ-n`, `AL-n`, `NC-n`), nunca por e-mail.

## A. Evidências já obtidas (locais)

| Cenário | Ambiente | Método | Resultado | Evidência redigida | Status |
|---|---|---|---|---|---|
| Suíte completa | L | `npm test` | 107/107 | `ℹ tests 107 · pass 107 · fail 0` | PASSOU |
| Lint | L | `npm run lint` | sem avisos | saída vazia do ESLint | PASSOU |
| Build de produção + tipos | L | `npm run build` | 27 páginas | `✓ Generating static pages (27/27)` | PASSOU |
| RLS (isolamento, forja, revogação, dois pedidos, revisão) | L (PGlite) | `supabase/tests/rls.test.ts` | 16/16 | — | PASSOU (local) |
| Assinatura do webhook com vetor oficial | L | `kiwify.test.ts` | confere byte a byte | assinatura `bf18f3…8c86` | PASSOU (local) |
| Paginação com `page_size` limitado pela API | L | teste novo | lê todas as páginas | 5/5 vendas com páginas de 2 | PASSOU (local) |
| Divergência lidas × `pagination.count` | L | teste novo | vai para revisão | `paginacao_lidas_1_count_3` | PASSOU (local) |
| Probe não expõe PII | L | teste novo | só tipos e padrões | sem e-mail/CPF/nome/ID na saída | PASSOU (local) |
| Preflight não expõe segredos | L | `preflight.test.ts` | nenhum valor na saída | — | PASSOU (local) |
| Link aberto por GET não consome token | LP | Puppeteer, `next start` | 200 com botão; sem chamada ao Auth | `confirm-check`: 12/12 | PASSOU (local) |
| Link malformado / type não permitido | LP | Puppeteer | “Link inválido”, sem formulário | 4/4 | PASSOU (local) |
| POST com token inválido | LP | Puppeteer | `/login?erro=link-invalido` | log `[auth/confirm] verifyOtp {code}` sem token | PASSOU (local) |
| Rotas privadas sem sessão / cookie forjado / `returnTo` externo | LP | `prod-checks C` | redireciona para login; neutraliza externo | 22/22 checks mantidos | PASSOU (local) |
| Produção sem configuração fica fechada | LP | `prod-checks B` (Prompt 03) | tudo fechado | 8/8 | PASSOU (local) |
| Preflight em desenvolvimento | L | `npm run preflight` | 0 erros, 4 avisos (sem Supabase) | — | PASSOU (local) |

## B. Critérios de aceite do piloto

| Cenário | Ambiente | Método | Resultado | Evidência redigida | Status |
|---|---|---|---|---|---|
| Homologação remota identificada e isolada de produção | H | projeto `mvf-homolog` separado | — | — | BLOQUEADO (projeto não criado) |
| Migration aplicada e RLS real testada | H | `db push` + `preflight --remote` + C7.3 | — | — | BLOQUEADO |
| SMTP próprio envia link válido sem expor segredo | H | C3 com caixas da equipe | — | — | BLOQUEADO (sem provedor/domínio) |
| Compradora importada entra e vê só seus dados | H | `grant-order` + C2.1 + C7.3 | — | — | BLOQUEADO |
| Não compradora não se cadastra nem acessa | H | C2.2 + `disable_signup` no preflight | — | — | BLOQUEADO |
| Matrícula revogada bloqueia com sessão antiga | H | C7.4 | — | (local: PASSOU em PGlite) | NÃO EXECUTADO (real) |
| Webhook com contrato real, idempotente, sem bypass por teste | H | C5 (“Testar Webhook”, assinatura inválida, reenvio) | — | (local: PASSOU com vetor oficial) | BLOQUEADO |
| Dry-run bate com amostra do painel; piloto aprovado à parte | H | `probe` → `import` dry-run → `grant-order` | — | — | BLOQUEADO (sem credenciais) |
| Onboarding, plano, tarefas e replanejamento persistem após reload e novo login | H | C7.1, C2.5, C2.6 | — | — | BLOQUEADO |
| Admin protegido no servidor | H | C6.1/C6.2 | — | (LP: 403/401 PASSOU) | NÃO EXECUTADO (real) |
| `npm test`, lint e build sem regressões | L | comandos | 107/107, limpo, OK | seção A | PASSOU |
| Testes manuais desktop/mobile sem erro crítico de console | LP | Puppeteer 375/768/1440 | sem overflow, sem erros | seção A | PASSOU (local); real NÃO EXECUTADO |
| Recuperação, reprocessamento de webhook e backup documentados | — | docs | `SETUP_REAL_04.md` §1.8, §6.7; `KIWIFY.md` | — | PASSOU (documental) |
| Checkout, área Kiwify e produção inalterados | — | nenhuma chamada externa feita | nada alterado | nenhuma credencial existe | PASSOU |

## C. Registro da Fase C (preencher durante a homologação)

| Cenário | Ambiente | Método | Resultado | Evidência redigida | Status |
|---|---|---|---|---|---|
| C1 migration (`migration list`) | H | | | | NÃO EXECUTADO |
| C1 `preflight --remote` (Auth, RLS anônima, chave secreta) | H | | | | NÃO EXECUTADO |
| C3 entrega em Gmail/Outlook/iCloud (inbox × spam) | H | | | | NÃO EXECUTADO |
| C4a probe: formato de data aceito / `pagination` | H | | | | NÃO EXECUTADO |
| C4b dry-run 30 dias: totais por status × painel | H | | | | NÃO EXECUTADO |
| C4c `grant-order` de AL-1…AL-3 | H | | | | NÃO EXECUTADO |
| C5 “Testar Webhook” → `sale_not_found` | H | | | | NÃO EXECUTADO |
| C5 assinatura inválida → 401 | H | | | | NÃO EXECUTADO |
| C5 reenvio pelos logs → `duplicate` | H | | | | NÃO EXECUTADO |
| C5 `reconcile` de evento pendente | H | | | | NÃO EXECUTADO |
| C2.1–C2.7, C6.1–C6.2, C7.1–C7.4 (ver SETUP §7) | H | | | | NÃO EXECUTADO |
| R3: limite por IP com várias contas em sequência | H | | | | NÃO EXECUTADO |
