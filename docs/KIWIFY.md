# Integração Kiwify

**Estado:** implementada e testada com mocks e com o vetor HMAC oficial. **Nenhuma chamada real à
Kiwify foi feita** (sem credenciais; a API não tem sandbox). Nada foi importado.

Fontes (consultadas em 21/11/2026, reconferidas no Prompt 04): docs.kiwify.com.br — webhooks/receiving,
webhooks/create, webhooks/list, general, auth/oauth, sales/list, sales/single. Comparação item a item
com a implementação: [HOMOLOGACAO_04.md §5](HOMOLOGACAO_04.md). Uma única geração de assinatura
documentada (HMAC-SHA1 na query `signature`).

## O que a documentação confirma (e usamos)
- Webhook: `POST` JSON; assinatura na query `signature` = **HMAC-SHA1 hex** do **corpo cru**,
  chave = token do webhook. Vetor oficial testado em `src/lib/kiwify/kiwify.test.ts`.
- Dedup recomendada: `order_id + webhook_event_type` (trial: `subscription_id + …`).
- 2xx = sucesso; outro status/sem resposta em 40 s = falha → reenvios automáticos (1–10 min).
- Eventos → status: `order_approved→paid`, `order_refunded→refunded`, `chargeback→chargedback`,
  `billet_created/pix_created→waiting_payment`, `order_rejected→refused`, eventos de assinatura.
- API: `https://public-api.kiwify.com/v1`, headers `Authorization: Bearer` + `x-kiwify-account-id`;
  token `POST /oauth/token` (form `client_id`, `client_secret`, `expires_in` 86400); 100 req/min.
- `GET /sales` (janela máx. **90 dias**, `start_date`, `end_date`, `product_id`, `page_number`,
  `page_size`) e `GET /sales/{id}` (estado atual da venda).
- “Testar Webhook” envia IDs fictícios; não há sandbox.

## Não confirmado → decisões conservadoras
| Lacuna | Decisão |
|---|---|
| Estrutura aninhada do payload do webhook (produto, e-mail) | Usamos **só** `order_id`, `webhook_event_type`, `order_status`. Produto e e-mail vêm de `GET /sales/{id}`. |
| Formato exato de data em `/sales` | Padrão `AAAA-MM-DD HH:mm:ss.SSS` (página geral); alternativa `--date-style iso`. **Confirmar com `kiwify probe`.** |
| `page_size` máximo / fim da paginação | Pede 50; o fim é decidido por `pagination.count` e pelo `page_size` **devolvido** (resiste a limite menor). Divergência entre lidas e `count` → `paginacao_divergente` + revisão. |
| Validade do client secret (“expira em 96 horas”) | Não conciliado com `expires_in`. Confirmar no painel (risco R2). |
| Escopos da credencial | Só usamos `sales`; `preflight --remote` mostra os escopos e alerta se faltar `sales`. |
| Prefixo `/v1` do token | Inferido do OpenAPI. Confirmar no primeiro uso. |
| Validade do client_secret (“96 horas” × `expires_in`) | Token reutilizado até 5 min antes do `expires_in`; renovado em 401. |
| Status que concedem | Só `paid` e `approved`. `refunded`/`chargedback` revogam. Demais (`waiting_payment`, `refused`, `refund_requested`, `pending_refund`…) não concedem nem alteram. |

## Fluxo do webhook (`/api/webhooks/kiwify`)
1. Sem token configurado → 503. Assinatura ausente/errada → 401 (nada é gravado).
2. JSON inválido / `order_id` com caracteres estranhos → 400.
3. Registro durável em `webhook_events` (dedup_key única, hash do corpo, sem PII). Duplicata já
   processada → 200 `duplicate`.
4. `order_refunded`/`chargeback` → **revoga** o pedido imediatamente (evento assinado; falha fechada).
5. `order_approved` → consulta `GET /sales/{id}`:
   - não encontrado (ex.: botão de teste) → `failed`, 200, **nada provisionado**;
   - API indisponível → `pending_verification` e **503** (Kiwify reenvia; CLI reprocessa);
   - produto fora de `KIWIFY_ALLOWED_PRODUCT_IDS` → `ignored`;
   - pago → conta (uma por e-mail) + direito ativo.
6. Fora de ordem: aprovação antiga reenviada após estorno → a API diz `refunded/chargedback` → não
   concede. Se um pedido estornado voltasse como pago → `needs_review` (humano decide).
7. Sem credenciais de API: aprovações ficam pendentes (nunca concedidas por suposição).

Assinaturas (`subscription_*`): registradas e ignoradas nesta fase. Se o MVF virar assinatura,
tratar `subscription_canceled/late/renewed` consultando o estado atual (extensão documentada).

## Importação de compradoras antigas
Webhooks não são retroativos. A CLI percorre `GET /sales` por produto permitido, em janelas de até
90 dias, paginando. **Dry-run é o padrão.**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
# 1) Prévia (só leitura). Sem banco: --offline
npm run kiwify -- import --from 2023-01-01 --to 2026-11-21
# 2) Execução real (confirma cada venda com GET /sales/{id} antes de conceder; não envia e-mails)
npm run kiwify -- import --from 2023-01-01 --to 2026-11-21 --execute
# 3) Se interromper: retomar pelo ID impresso
npm run kiwify -- import --from 2023-01-01 --to 2026-11-21 --execute --resume <runId>
```
- Use a data da **primeira venda** do MVF em `--from` (não presuma 90 dias).
- Relatório: contagens (lidas, elegíveis, reembolsadas, sem e-mail, alunas únicas, contas a criar…)
  e IDs de pedido para revisão — sem e-mail/CPF.
- Reexecutar é seguro (idempotente). ~1 chamada extra por venda elegível (respeita 90 req/min).

## Antes de importar: probe e piloto (Prompt 04)
```bash
# Só leitura, 1 página, sem PII: formato de data aceito, objeto pagination e FORMA de uma venda
npm run kiwify -- probe --from 2026-11-14 --to 2026-11-21
# Dry-run agora também mostra totais por status Kiwify (compare com o painel)
npm run kiwify -- import --from 2026-10-22 --to 2026-11-21 --date-style space
# Piloto: liberar só pedidos autorizados (até 10), confirmando cada um na API
npm run kiwify -- grant-order --order <id1>,<id2>            # prévia
npm run kiwify -- grant-order --order <id1>,<id2> --execute  # grava (source = manual)
```
Para homologação, use `node --env-file=.env.homolog scripts/kiwify.ts …` (ver `SETUP_REAL_04.md`).

## Reconciliação
```bash
npm run kiwify -- reconcile                    # prévia: eventos pendentes
npm run kiwify -- reconcile --execute          # reprocessa eventos pendentes
npm run kiwify -- reconcile --active           # prévia: status atual dos acessos ativos
npm run kiwify -- reconcile --active --execute # revoga o que foi reembolsado sem webhook
```
Sugestão: rodar `reconcile --execute` diariamente e `--active --execute` semanalmente
(cron do provedor ou manual), começando manualmente.

## Configuração na Kiwify (sem segredos)
1. **Apps → API**: criar credencial; anotar Account ID, Client ID e Client Secret → `.env` do servidor.
2. **Produtos**: anotar o(s) ID(s) do produto MVF (só o curso; não upsells/order bumps/cosméticos)
   → `KIWIFY_ALLOWED_PRODUCT_IDS`.
3. **Apps → Webhooks → Criar**: URL `https://app.SEU-DOMINIO/api/webhooks/kiwify`; produto(s) do MVF;
   gatilhos: Compra aprovada, Reembolso, Chargeback; copiar o **token** → `KIWIFY_WEBHOOK_TOKEN`.
4. “Testar Webhook”: deve aparecer em `/admin` como evento `failed / sale_not_found` (esperado).
5. Rotação de token: novo em `KIWIFY_WEBHOOK_TOKEN`, antigo em `KIWIFY_WEBHOOK_TOKEN_PREVIOUS`
   por ~24 h, depois remover.

## Segurança
- Segredos só no servidor (nunca `NEXT_PUBLIC_*`, nunca no Git). Logs sem payload/PII.
- Não fazemos reembolsos nem ações financeiras pela API.
