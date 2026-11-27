# Ativação controlada da Nina para alunas reais

> Auditoria de 27/11/2026. **Nada desta lista foi executado.** Cada etapa marcada 🔒 é operação de
> produção e precisa de autorização explícita do operador, uma por vez. Etapas 🖥️ são só locais.
> Política de retenção: [`RETENCAO_ATENDIMENTOS.md`](RETENCAO_ATENDIMENTOS.md) (proposta).

## 0. Situação de partida

- O código no `main` (`5d88f14`) já está no GitHub.
  - Se a Vercel publica o `main`, ele já está no ar.
  - Esse código lê `close_reason` e `actions`, então **o chat real não funciona enquanto o
    complemento não for aplicado**. Ele falha fechado (“não foi possível abrir”), sem vazar dados.
- Banco publicado:
  - recebeu a versão **anterior** da `20261126120000`;
  - não tem a `20261127120000` (complemento);
  - não tem a `20261127150000` (histórico privado).
- **Até a `20261127150000` ser aplicada, uma aluna com sessão válida consegue ler a própria
  transcrição, o resumo e os metadados por chamada direta à API.** O app não mostra esses dados, mas
  o banco permite. Por isso o chat real só deve ser ligado depois da etapa 6.
- `.env.local`: sem Supabase (modo local/demo).
- `.env.homolog`: único arquivo com Supabase. É o banco onde a base da Nina foi gravada em 26/11.
  - Não há prova de que é separado da produção.
  - **Trate como produção** até a etapa 1 provar o contrário.

## 1. 🖥️ Qual projeto é qual (local, sem rede)

```bash
npm run nina:db-check -- --compare .env.local .env.homolog
```

1. Na Vercel, abra Settings → Environment Variables → `NEXT_PUBLIC_SUPABASE_URL` (Production). O ref é o
   trecho antes de `.supabase.co`.
2. Rode de novo passando esse ref:
   ```bash
   npm run nina:db-check -- --compare .env.homolog --expect-ref <ref-de-producao>
   ```
3. Leia o resultado:
   - “✔ é o projeto esperado”: o `.env.homolog` **é a produção**. Não há homologação separada.
   - “✖ NÃO é”: são bancos diferentes. Repita as etapas 2 a 7 primeiro no de homologação.

## 2. 🔒 Inspeção somente leitura do banco

**Opção A, recomendada:** no SQL Editor do projeto, cole `supabase/checks/nina_estado_somente_leitura.sql`.
- É um único `SELECT`, que não altera nada.
- Devolve só nomes, contagens e permissões.

**Opção B, pela API:** também só leitura (GET):

```bash
node --env-file=.env.homolog scripts/nina-db-check.ts --remote --expect-ref <ref>
```

O esperado hoje:
- complemento **PENDENTE**;
- histórico privado **PENDENTE**;
- “aluna consegue ler transcript?” **SIM**;
- `app-pedir-ajuda` na lista de documentos que ainda falam em baixar a conversa.

## 3. 🔒 Backup antes de mexer

Em Database → Backups, confirme que existe um backup recente (ou PITR) e anote a data e a hora.

## 4. 🔒 Migration 1: complemento

1. No SQL Editor, cole o conteúdo **inteiro** de `supabase/migrations/20261127120000_nina_2_complemento.sql` e
   execute **uma vez**. Rodar de novo não causa problema.
2. Rode a verificação da etapa 2. O esperado é “complemento … **APLICADO**”.

## 5. 🔒 Publicar o código desta auditoria

As mudanças desta auditoria ainda não estão no commit `5d88f14`:
- saudação gravada pelo servidor;
- `push` seletivo da base;
- scripts de verificação.

O código novo funciona com o banco **antes e depois** da etapa 6. Publique-o antes de aplicar a etapa 6.

```bash
npm run lint && npm test && npm run build
git add -A && git commit -m "Nina: auditoria de segurança e preparação da ativação"
git push            # dispara o deploy da Vercel, se o projeto estiver ligado ao main
```

## 6. 🔒 Migration 2: histórico privado

1. No SQL Editor, cole `supabase/migrations/20261127150000_nina_historico_privado.sql` e execute.
2. Verificação da etapa 2. O esperado:
   - “histórico privado … **APLICADO**”;
   - “aluna consegue ler transcript?” **não**;
   - funções executáveis por `anon`: **nenhuma**.

**Ordem obrigatória:** 20261126120000 (já aplicada) → **20261127120000** → **20261127150000**.
- A 150000 depende das tabelas e de `private.is_support_staff`, que vêm da 126.
- Ela também precisa do código da etapa 5. Com o código antigo, a conversa abriria sem a saudação.

## 7. 🔒 Base de conhecimento: só o guia desatualizado

1. Prévia: lê só id, versão, hash e status, e não grava nada.
   ```bash
   node --env-file=.env.homolog scripts/support-knowledge.ts push modulos/base-nina --app --only app-pedir-ajuda
   ```
   Esperado: `1 a atualizar · app-pedir-ajuda · status aprovado`, sem aviso de “passariam a APROVADO”.
2. Envio, **só depois de conferir a prévia**:
   ```bash
   node --env-file=.env.homolog scripts/support-knowledge.ts push modulos/base-nina --app --only app-pedir-ajuda --execute
   ```

As 74 aulas não são tocadas. Mesmo sem `--only`, o `push` agora pula os documentos iguais ao banco.

## 8. 🔒 Contas de teste e papel support

1. Duas alunas de teste com compra válida (ou direito importado), A e B, e uma conta da equipe S.
2. Atribua o papel. O primeiro comando é uma prévia; o segundo grava, com auditoria:
   ```bash
   node --env-file=.env.homolog scripts/admin-role.ts grant --email <S> --role support --actor "<operador>"
   node --env-file=.env.homolog scripts/admin-role.ts grant --email <S> --role support --actor "<operador>" --execute
   ```

## 9. 🔒 Variáveis na Vercel (Production)

Configure só o que for do **mesmo projeto Supabase confirmado na etapa 1**. Não copie chaves de outro
arquivo sem confirmar.

| Variável | Valor |
|---|---|
| `MVF_SUPPORT_STORE` | `supabase` |
| `MVF_SUPPORT_PROVIDER` | `deepseek` |
| `DEEPSEEK_API_KEY` | chave com **limite de gasto** configurado no painel da DeepSeek |
| `DEEPSEEK_MODEL` | `deepseek-flash` (padrão) |
| `MVF_SUPPORT_AI_ENABLED` | `true`, **por último**, depois do checklist da etapa 10 em homologação ou com as contas de teste |
| `MVF_SUPPORT_CONTACT_URL` | canal humano oficial, se já houver |

Nunca use `NEXT_PUBLIC_` em nenhuma delas. `SUPABASE_SERVICE_ROLE_KEY` já existe no servidor e não vai
para o navegador.

**Desligar rápido:** `MVF_SUPPORT_AI_ENABLED=false` e redeploy. O chat volta a “Em breve” e os dados
continuam no banco.

## 10. Checklist de validação (contas A, B e S)

**Aluna A (fluxo):**
- [ ] O chat abre com a saudação da Nina. O cabeçalho mostra só “Nina / Suporte MVF”, sem
  provedor, modelo, tokens ou ambiente.
- [ ] Faz uma pergunta sobre uma aula e recebe a resposta. O botão “Abrir aula” só aparece quando a
  aula tem a ver com a pergunta.
- [ ] Responde “não” e “ainda não consegui”: o atendimento **não** encerra.
- [ ] Responde “Deu certo, obrigada!”: a Nina se despede e aparece “Atendimento encerrado” com
  “Iniciar nova conversa”. Não há botão de baixar.
- [ ] Novo atendimento, encerrado pelo botão Encerrar com confirmação: mesma tela final.
- [ ] Novo atendimento em que A toca em “Abrir aula”: o atendimento encerra e a aula abre.
- [ ] DevTools → Network: as respostas das Server Actions não contêm `transcript`, `summary`,
  `meta`, `sources`, `deepseek` nem `tokens`.

**Aluna A (API direta, com o token da sessão dela):**
- [ ] `GET /rest/v1/support_conversations?select=transcript` → **erro de permissão**.
- [ ] `GET /rest/v1/support_conversations?select=*` → **erro de permissão**. As colunas do chat
  funcionam.
- [ ] `GET /rest/v1/support_messages?select=meta,sources` → **erro de permissão**.
- [ ] `POST /rest/v1/rpc/support_admin_export` com o id dela → **forbidden**.
- [ ] `GET /api/admin/suporte/<id>/transcricao` → **403**.

**Aluna B (isolamento):**
- [ ] Com o id de um atendimento de A, a leitura retorna vazio, e encerrar, pedir equipe ou enviar
  mensagem retorna `not_found`.
- [ ] B só vê os próprios atendimentos.

**Equipe S:**
- [ ] `GET /api/admin/suporte/<id de A>/transcricao` baixa o TXT completo. Confira:
  - ID, nome (sem e-mail), abertura e encerramento em America/Recife;
  - cada mensagem com remetente e horário;
  - motivo do encerramento.
- [ ] Atendimento ainda aberto → **409**.
- [ ] No SQL Editor:
  ```sql
  select action, actor, target_user_id, created_at from public.admin_audit_log
   where action like 'support.%' order by created_at desc limit 10;
  ```
  mostra `support.export` (e `support.read`/`support.list`, se usados) com o id de S.
- [ ] S **não** lê as tabelas diretamente. `GET /rest/v1/support_conversations?select=id` retorna
  vazio (só as próprias, que não existem).

**Banco (SQL Editor):**
- [ ] Atendimentos encerrados têm `transcript` e `transcript_generated_at`, e nenhum fica parado em
  `closing`:
  ```sql
  select status, count(*), count(transcript) from public.support_conversations group by 1;
  ```
- [ ] Verificação da etapa 2 sem nenhum item fora do esperado.
- [ ] Custo do dia conferido no painel da DeepSeek.

## 11. Depois da ativação

- Aprovar a política de retenção (`RETENCAO_ATENDIMENTOS.md`) antes de qualquer expurgo.
- Criar o job de inatividade e expurgo (com autorização).
- Criar a tela da equipe no painel real (hoje a exportação é feita pela rota).
- Definir o canal humano oficial.
