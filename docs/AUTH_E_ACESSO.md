# Autenticação e acesso

**Estado:** implementado e testado localmente. **Não validado contra um projeto Supabase real**
nem com envio real de e-mail: depende das credenciais e do SMTP (ver “Bloqueios”).

## Modelo

| Camada | O que garante | Onde |
|---|---|---|
| Identidade | A pessoa controla o e-mail (link mágico) | Supabase Auth · `/login`, `/auth/confirm` |
| Autorização | Existe **direito ativo** (compra verificada) ou papel de equipe | `my_access()` / `private.has_active_access()` no banco |
| Proteção de dados | Cada aluna só lê/escreve as próprias linhas, e só com acesso ativo | RLS (`supabase/migrations`) |
| Pré-filtro | Sem sessão em rota privada → `/login?returnTo=` | `src/proxy.ts` (otimista, **não** é a autorização) |

A autorização é verificada no servidor em **todo** ponto sensível:
- layout privado `src/app/(app)/layout.tsx` → `requirePrivateAccess()`;
- cada Server Action (`src/app/(app)/plan-actions.ts`) → `authorizeMemberAction()`;
- rotas de gestão (`/admin`, `/api/admin/health`) → `can(roles, permissão)`;
- e, por baixo de tudo, a RLS (revogação vale mesmo com a sessão Auth ainda válida).

Identidade no servidor: `supabase.auth.getClaims()` (JWT verificado). Nunca `getSession()`.

## Fluxo

1. Compra aprovada → webhook assinado → confirmação `GET /sales/{id}` → conta Auth criada **sem
   enviar e-mail** (`admin.createUser`, e-mail confirmado pela compra) + direito ativo.
   Compradoras antigas: importação (`docs/KIWIFY.md`).
2. `/login`: aluna digita o e-mail da compra → `signInWithOtp({ shouldCreateUser: false })`.
   **Não existe cadastro público.** Antes de enviar o link, o servidor verifica com a service role
   se há compra ativa (D63):
   - sem compra: “Não encontramos este e-mail em nenhuma compra”;
   - com compra: o link é enviado e a tela confirma o envio.
   No Vercel é preciso ter `SUPABASE_SERVICE_ROLE_KEY`. Sem ela, a tela mostra “Não foi possível
   verificar seu e-mail agora” e nada é liberado.
3. Link → `/auth/confirm?token_hash=…&type=email` mostra a página “Quase lá” com o botão **Entrar**.
   Abrir o link (GET) **não** consome o token, o que protege contra antivírus de e-mail que pré-abrem links.
   Só o clique (POST, Server Action) chama `verifyOtp` → cookies de sessão → `returnTo` (guardado
   em cookie httpOnly, só caminhos internos permitidos). Página `noindex` e `no-referrer`.
4. Layout privado: sem direito ativo → `/acesso-indisponivel`. Sem onboarding → `/onboarding`.
5. Sair: botão no header → `signOut` → `/login?saiu=1`.

### E-mail diferente do da compra
A conta Auth é criada com o e-mail **da compra**. Login com outro e-mail cai na resposta neutra e
não entra. Não há vínculo por nome ou e-mail parecido. Ver “Procedimentos” para troca de e-mail.

## Papéis

`user_roles`: `admin`, `expert`, `support`, `moderator`, `partner` (e `student`, implícito).
Atribuição **somente** por CLI auditada (`npm run admin:role`), nunca por UI, querystring,
localStorage ou `user_metadata`. Equipe (admin/expert/support/moderator) tem acesso à área de
alunas sem compra — bypass autorizado e registrado em `admin_audit_log`.

| Permissão | Papéis |
|---|---|
| `admin:access` (entrar em `/admin`) | admin, expert, support, moderator |
| `integration:read` (saúde Kiwify) | admin, support |

Aluna comum em `/admin` → tela 403. `/api/admin/health` → 401 sem login, 403 sem permissão.
Permissões finas do módulo de gestão: próximo prompt (`src/lib/auth/permissions.ts`).

## Modo demo local
`MVF_DEMO_MODE=true` **e** `NODE_ENV=development` (`npm run dev`): dados em memória, faixa
“Modo demo local”, login desativado, nada gravado. Em produção a flag é ignorada. Sem
configuração, a área privada mostra “Plataforma em configuração” e **fica fechada**.

## Configuração (passo a passo, sem segredos)

### Supabase
1. Criar projeto (região São Paulo recomendada). Plano pago recomendado para produção (backups).
2. Aplicar a migration (`docs/BANCO.md`).
3. **Authentication → Sign In / Providers**:
   - Email habilitado; **desativar “Allow new users to sign up”** (defesa extra: contas só
     nascem pela compra; `admin.createUser` continua funcionando).
   - “Email OTP expiration”: 3600 s (padrão) ou menos.
4. **Authentication → URL Configuration**:
   - Site URL: `https://app.SEU-DOMINIO` (produção) — local: `http://localhost:3000`.
   - Redirect URLs: `https://app.SEU-DOMINIO/auth/confirm` e `http://localhost:3000/auth/confirm`.
5. **Authentication → Email Templates → Magic Link**: usar o link com token hash
   (funciona mesmo se aberto em outro navegador):
   ```html
   <h2>Seu acesso ao App MVF</h2>
   <p>Toque no botão abaixo para entrar. Na próxima tela, confirme em “Entrar”.</p>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Entrar no App MVF</a></p>
   <p>O link vale por 1 hora e só pode ser usado uma vez. Se você não pediu, ignore este e-mail.</p>
   ```
6. **Project Settings → API**: copiar URL, chave publicável e service role para `.env.local`
   (ou variáveis do provedor de hospedagem). A service role **nunca** como `NEXT_PUBLIC_*`.

### SMTP próprio (obrigatório para produção)
O SMTP padrão do Supabase só envia para endereços autorizados da equipe, ~2 e-mails/hora, sem SLA.
**Sem SMTP próprio, o login de produção está BLOQUEADO.**
1. Escolher provedor (Resend, Brevo, AWS SES, Postmark…).
2. Domínio de envio dedicado (ex.: `auth.SEU-DOMINIO`), com **SPF, DKIM e DMARC** verificados.
3. Supabase → Authentication → SMTP Settings: host, porta, usuário, senha, remetente
   (`acesso@auth.SEU-DOMINIO`, nome “App MVF”).
4. Authentication → Rate Limits: após salvar SMTP o limite inicial é ~30 e-mails/hora; ajustar
   para o volume esperado (ex.: lançamento para 500 alunas em poucas horas).
5. Testar com 2–3 contas reais de equipe (Gmail, Outlook, iCloud) e checar spam.

### Hospedagem
Next.js com Node (ex.: Vercel). Variáveis de `.env.example` definidas no painel (servidor lê em
runtime). `APP_BASE_URL` = URL pública. HTTPS obrigatório.

## Procedimentos administrativos (sem tela de autoaprovação)
- **Primeiro admin:** `npm run admin:role -- grant --email … --role admin --actor "Nome" --execute --create-user`.
- **Acesso manual (teste ou exceção aprovada):**
  `node --env-file=.env.homolog scripts/access.ts grant --email … --actor "Nome" --execute`.
  - Cria a conta sem enviar e-mail e um direito `manual`.
  - Para desfazer, use `revoke`.
  - Fica registrado em `admin_audit_log`.
- **Troca de e-mail da aluna** (após confirmar identidade pelo suporte): no Supabase Studio,
  Authentication → Users → editar e-mail da conta; depois atualizar `profiles.email` e
  `purchase_entitlements.customer_email` dos pedidos dela (SQL Editor, como service role) e
  registrar em `admin_audit_log`. O progresso é por `user_id`, então nada se perde.
- **Desativar acesso manualmente:** `update public.purchase_entitlements set access_state='revoked',
  revoked_reason='manual', revoked_at=now() where order_id='…';` + linha em `admin_audit_log`.
  Isso já bloqueia a área privada e os dados (RLS). Para impedir também o login, usar a Admin API
  (`auth.admin.updateUserById(id, { ban_duration: "876000h" })`) — confirmar a opção no painel vigente.
- **Excluir conta (LGPD):** apagar o usuário em Authentication → Users (cascata remove perfil,
  respostas, planos e progresso; pedidos ficam com `user_id = null` para fins contábeis).

## Limite de tentativas
O limitador da aplicação é em memória por instância (não confiável em serverless). As proteções
reais são as do Supabase (60 s por usuária, limites por IP, e-mails/hora). O 429 do Supabase recebe
a mesma resposta neutra para não revelar quem é compradora. Risco do limite por IP aplicado ao IP
do servidor: `HOMOLOGACAO_04.md` §7.

## Bloqueios para validar ao vivo
- Projeto Supabase + chaves; SMTP com domínio verificado; URL de produção.
- Não testados ao vivo: envio/recebimento do link, `verifyOtp` real, renovação de sessão no Proxy
  contra o Auth real, RLS no Supabase real (testada em Postgres local com stub de `auth`).
