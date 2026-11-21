# Setup real — Prompt 04 · Fase B (configuração assistida)

Guia **sequencial** para o operador. Os nomes de tela podem mudar; confira o painel vigente.
**Nunca cole segredos no chat.** Eles vão só em `.env.homolog` (local, ignorado pelo Git) e nas
variáveis de ambiente do deploy. Auditoria e riscos: [HOMOLOGACAO_04.md](HOMOLOGACAO_04.md).

Cada passo marcado com **🔒 PORTÃO** exige sua autorização explícita antes de o assistente executar
qualquer coisa. Os demais são cliques seus nos painéis.

---

## 0. Arquivo local de homologação (2 min)

```bash
cd "/Users/lucaslopes/Documents/app mvf"
cp .env.example .env.homolog      # .env* já é ignorado pelo Git (confira: npm run preflight)
```
Preencha `.env.homolog` **no editor**, à medida que os passos abaixo gerarem os valores. Para rodar
qualquer comando contra homologação, prefixe com o arquivo:
```bash
export PATH="$HOME/.local/node/bin:$PATH"
node --env-file=.env.homolog scripts/preflight.ts --target homologacao
```

## 1. Supabase — projeto de homologação

1. supabase.com → **New project** → nome `mvf-homolog`, região **South America (São Paulo)**,
   senha do banco forte (guarde num gerenciador de senhas; não vai para o app).
2. **Project Settings → API Keys**: copie a **Publishable key** (`sb_publishable_…`) para
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e a URL do projeto para `NEXT_PUBLIC_SUPABASE_URL`.
   Crie/copie uma **Secret key** (`sb_secret_…`) para `SUPABASE_SERVICE_ROLE_KEY`.
   Prefira as chaves novas: as legadas `anon`/`service_role` estão em descontinuação.
3. **Authentication → Sign In / Providers**:
   - Email: **habilitado**. Desative **“Allow new users to sign up”**. As contas só nascem da
     compra verificada, via `admin.createUser`; o `preflight --remote` confere `disable_signup`.
   - “Confirm email”: pode ficar ligado (as contas provisionadas já nascem confirmadas).
   - **Email OTP expiration**: `3600` (1 h, padrão). Não passe de 1 dia.
4. **Authentication → URL Configuration**:
   - Site URL: `https://homolog.SEU-DOMINIO` (a URL do deploy de homologação, passo 4).
   - Redirect URLs: **exatamente** `https://homolog.SEU-DOMINIO/auth/confirm`. Só se for testar
     localmente contra este projeto, acrescente `http://localhost:3000/auth/confirm`. Não use `**`.
5. **Authentication → Email Templates → Magic Link**:
   - Assunto: `Seu link de acesso ao App MVF`
   - Corpo:
   ```html
   <h2>Seu acesso ao App MVF</h2>
   <p>Toque no botão abaixo para entrar. Na próxima tela, confirme em “Entrar”.</p>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Entrar no App MVF</a></p>
   <p>O link vale por 1 hora e só pode ser usado uma vez. Se você não pediu, ignore este e-mail.</p>
   ```
   Abrir o link (GET) **não** consome o token; só o botão “Entrar” consome (POST). Isso protege
   contra antivírus de e-mail corporativo que pré-abrem links (recomendação oficial do Supabase).
6. **🔒 PORTÃO C1 — aplicar a migration no projeto de homologação.** Opções:
   - Preferida (histórico versionado): Supabase CLI. Precisa estar instalada; não instalamos nada
     globalmente. `supabase login` → `supabase link --project-ref <ref>` →
     `supabase db push --dry-run` (mostra o plano) → `supabase db push`.
     Depois, `supabase migration list` deve mostrar `20261121120000` aplicada.
   - Alternativa: **SQL Editor** → colar `supabase/migrations/20261121120000_mvf_acesso_e_persistencia.sql`
     → Run. A migration é idempotente, mas assim ela **não** entra no histórico da CLI. Para registrar
     depois: `supabase migration repair --status applied 20261121120000`.
   - **Rollback:** projeto novo e vazio, então o rollback é recriar o projeto. Em produção, só com
     backup (passo 1.8) e autorização separada.
7. **Database → Tables**: confirme **RLS enabled** nas 9 tabelas. Depois rode:
   `node --env-file=.env.homolog scripts/preflight.ts --target homologacao --remote`.
   Esperado: “Anônimo recusado / não vê linhas” nas 9 tabelas, cadastro desativado, chave secreta aceita.
8. **Backups/logs:** em homologação, o plano gratuito basta. Em **produção**, plano pago com backups
   diários (avalie PITR) antes de importar alunas. Logs: não ative extensões que gravem corpo de
   requisição; o app já não loga e-mail, token nem payload.

## 2. SMTP próprio (obrigatório antes de qualquer aluna real)

O SMTP padrão do Supabase **não serve para o piloto**: só envia para endereços da equipe, cerca de
2 e-mails/hora, sem SLA.

**Recomendação custo-benefício** (sem contratar nada por você):
- **Resend:** integração simples com o Supabase, plano gratuito com cota diária baixa, bom para
  homologação e piloto. Rastreamento de cliques desligado por padrão.
- **Brevo:** plano gratuito com ~300 e-mails/dia. **Desative o rastreamento de cliques/aberturas**,
  porque reescrever o link pode quebrar o magic link.
- **AWS SES:** o mais barato em volume, porém configuração mais trabalhosa.
- Se a NUMI já usa um provedor transacional, use-o.

Passos:
1. Domínio de envio dedicado, ex.: `auth.SEU-DOMINIO`. No DNS (feito por quem administra o
   domínio): registros **SPF**, **DKIM** (fornecidos pelo provedor) e **DMARC** (comece com
   `v=DMARC1; p=none; rua=mailto:…` e endureça depois).
2. Aguarde o provedor marcar o domínio como **verificado**.
3. Supabase → **Authentication → SMTP Settings** (Emails → SMTP): habilite o custom SMTP. Preencha
   host, porta, usuário e senha do provedor **direto no painel** (nunca no chat). Remetente
   `acesso@auth.SEU-DOMINIO`, nome **“App MVF”**.
4. **Authentication → Rate Limits**: ao ligar o SMTP o limite começa em ~30 e-mails/hora. Para o
   piloto basta; para o lançamento, ajuste ao volume (ex.: 500 alunas em poucas horas).
5. **🔒 PORTÃO C3:** teste com 2–3 caixas **da equipe** (Gmail, Outlook, iCloud). Confira se chegou
   na caixa de entrada (e não no spam), o remetente, que o link aponta para `homolog…/auth/confirm`,
   que o link expira e que funciona uma vez só. Nada de disparos em massa.

## 3. Kiwify — leitura segura

1. **Apps → API → Criar API Key**: anote **Account ID**, **Client ID** e **Client Secret** →
   `KIWIFY_ACCOUNT_ID`, `KIWIFY_CLIENT_ID`, `KIWIFY_CLIENT_SECRET` no `.env.homolog`.
   - Se o painel permitir escolher permissões, marque **só leitura de vendas** (`sales`). Não
     precisamos de `sales_refund`, `financial` nem saques.
   - Anote a **validade** que o painel mostrar para o secret. A doc fala em “96 horas” e isso
     precisa ser esclarecido (risco R2).
2. **Produtos**: abra o produto MVF e copie o **ID** → `KIWIFY_ALLOWED_PRODUCT_IDS`. Não inclua
   upsells, order bumps nem produtos cosméticos. Se o MVF tiver mais de uma oferta/ID, liste todos.
3. Rode `node --env-file=.env.homolog scripts/preflight.ts --target homologacao --remote`.
   Esperado: `kiwify.oauth` com token emitido e a lista de escopos (os valores não aparecem).
4. **🔒 PORTÃO C4a — probe (só leitura, 1 página, sem PII):**
   `node --env-file=.env.homolog scripts/kiwify.ts probe --from <7 dias atrás> --to <hoje>`
   Mostra qual formato de data a API aceitou, o objeto `pagination` e a **forma** de uma venda
   (tipos e padrões de data, nunca valores). Registre no relatório.
5. **🔒 PORTÃO C4b — dry-run com janela pequena:**
   `node --env-file=.env.homolog scripts/kiwify.ts import --from <30 dias atrás> --to <hoje> --date-style <o do probe>`
   Compare os **totais por status** com o painel (Vendas → filtro do produto e período).
   `paginacao_divergente` precisa ser 0.
6. **🔒 PORTÃO C4c — piloto:** escolha 2–3 compradoras que **autorizaram** participar. Use os
   IDs de pedido (não e-mails) e rode:
   `node --env-file=.env.homolog scripts/kiwify.ts grant-order --order <id1>,<id2>` (prévia)
   → revisar → repetir com `--execute`. Contas são criadas **sem envio de e-mail**; a aluna recebe
   o link quando pedir em `/login`.
   **Não rode `import --execute` do histórico inteiro** nesta fase.

## 4. Deploy de homologação

1. Vercel (ou equivalente com Node): novo projeto a partir deste repositório. Use um ambiente
   **separado** do de produção, com domínio `homolog.SEU-DOMINIO` e HTTPS automático.
2. **Settings → Environment Variables**, escopo só do ambiente de homologação: as mesmas
   variáveis do `.env.homolog`. `SUPABASE_SERVICE_ROLE_KEY`, `KIWIFY_CLIENT_SECRET` e
   `KIWIFY_WEBHOOK_TOKEN` **nunca** com prefixo `NEXT_PUBLIC_`. Deixe `MVF_DEMO_MODE` vazio.
3. Proteja a homologação do público: Deployment Protection/senha da plataforma, ou simplesmente
   não divulgue a URL. O acesso privado já exige compra, mas evite indexação e tráfego curioso.
4. Opcional (recomendado antes do lançamento): regra de rate limit no firewall da plataforma para
   `POST /login` por IP.
5. **🔒 PORTÃO deploy.** Depois do deploy, rode
   `node --env-file=.env.homolog scripts/preflight.ts --target homologacao --remote`.
   Esperado: `/login` 200, `/inicio` → `/login`, webhook sem assinatura 401 (ou 503 sem token),
   health 401.
6. Checkout, produto e área de membros da Kiwify **continuam como estão**. Não redirecione alunas.

## 5. Papéis (🔒 PORTÃO C6)

Depois de confirmar quem é o admin piloto:
```bash
node --env-file=.env.homolog scripts/admin-role.ts grant --email <e-mail da pessoa> --role admin --actor "<seu nome>"           # prévia
node --env-file=.env.homolog scripts/admin-role.ts grant --email <e-mail da pessoa> --role admin --actor "<seu nome>" --execute --create-user
```
O e-mail é digitado **no seu terminal**, não no chat. A ação fica em `admin_audit_log`.

## 6. Webhook de homologação (🔒 PORTÃO C5)

1. Kiwify → **Apps → Webhooks → Criar**: nome `MVF homologação`, URL
   `https://homolog.SEU-DOMINIO/api/webhooks/kiwify`, **produto: só o MVF** (não “all”), gatilhos
   **Compra aprovada, Reembolso, Chargeback**. Gere um **token longo** e copie-o para
   `KIWIFY_WEBHOOK_TOKEN` no deploy de homologação (redeploy).
2. Clique **“Testar Webhook”**: em `/admin` deve aparecer `failed / sale_not_found` (IDs fictícios;
   nada é liberado).
3. Assinatura inválida: `curl -X POST "https://homolog…/api/webhooks/kiwify?signature=000" -d '{}'` → 401.
4. Aprovação real: a próxima venda real do produto MVF chega também na homologação. Isso cria a
   conta da compradora **neste** projeto, então trate a homologação com o mesmo rigor da produção.
   Se preferir não receber vendas reais, desative o webhook de homologação após os testes.
5. Duplicata: em **Ver logs**, reenvie um evento já entregue → `duplicate`, sem efeito.
6. Revogação: **não faça reembolso real para testar.** Use a revogação manual (SQL documentado em
   `docs/AUTH_E_ACESSO.md`) numa conta de equipe, confirme o bloqueio com a sessão aberta e reative.
7. Evento não confirmado no primeiro recebimento (API fora): fica `pending_verification`; rode
   `node --env-file=.env.homolog scripts/kiwify.ts reconcile` (prévia) → `--execute`. Não dependa só
   do reenvio da Kiwify.

## 7. Roteiro de testes da Fase C (preencher o RELATORIO_PILOTO_04.md)

Contas: `EQ-1` e `EQ-2` (equipe), `AL-1`…`AL-3` (compradoras autorizadas), `NC-1` (e-mail sem compra).
Nunca registre o e-mail no relatório, só o código.

| # | Teste | Esperado |
|---|---|---|
| C2.1 | `AL-1` pede link | Recebe e-mail; “Entrar” abre `/onboarding` |
| C2.2 | `NC-1` pede link | Mesma mensagem neutra; **nenhum** e-mail chega; não entra |
| C2.3 | Link usado 2× / após 1 h | Segunda vez: “expirou ou já foi usado” |
| C2.4 | `/login?returnTo=https://externo` | Após login, cai em `/inicio` |
| C2.5 | Sair → entrar de novo | Progresso intacto |
| C2.6 | Outro navegador/celular | Mesmo plano e progresso |
| C2.7 | Conta com matrícula revogada (depois do C7.4) pede link e entra | `/acesso-indisponivel` |
| C7.1 | `AL-1` faz onboarding, marca tarefas, replaneja; recarrega | Tudo persiste |
| C7.2 | `AL-1` e `AL-2` em dois dispositivos ao mesmo tempo | Aviso de conflito de revisão, sem perda |
| C7.3 | `AL-2` tenta ler dados da `AL-1` (via console, com a chave publicável) | Nada retorna (RLS) |
| C7.4 | Revogar a matrícula de `EQ-1` com sessão aberta | Próximo carregamento → bloqueado; dados não legíveis |
| C6.1 | `AL-1` abre `/admin` | 403 no servidor |
| C6.2 | Admin piloto abre `/admin` | Saúde da integração visível |
