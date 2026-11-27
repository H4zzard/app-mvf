# Configuração da Nina — guia passo a passo

Este guia explica, sem pressupor programação, como ligar a Nina (a atendente do suporte MVF) com a
DeepSeek real no seu computador, alimentar a base de conhecimento e testar tudo.

> **Importante:** nada aqui mexe no app publicado, no banco Supabase ou na Vercel. A DeepSeek real
> só é chamada quando **você** configurar a chave e escolher `deepseek`. Cada resposta gasta
> centavos (veja `docs/SUPORTE_IA.md`, seção “Custo”).

Todos os comandos abaixo são digitados no Terminal, **dentro da pasta do projeto**
(`/Users/lucaslopes/Documents/app mvf`). Se aparecer “node: command not found”, rode antes:

```bash
export PATH=~/.local/node/bin:$PATH
```

---

## 1. Criar a chave da DeepSeek

1. Acesse **https://platform.deepseek.com** e entre na sua conta.
2. No menu, abra **API Keys** e clique em **Create new API key**. Dê um nome, por exemplo “MVF desenvolvimento”.
3. Copie a chave (começa com `sk-`). Ela só aparece uma vez.
4. Em **Billing/Top up**, coloque um saldo pequeno e, se existir a opção, um limite de gasto.

Nunca envie a chave por WhatsApp, e-mail ou chat, nem cole em código.

## 2. Onde colocar a chave

Abra o arquivo **`.env.local`** na pasta do projeto. Ele já foi criado e **não vai para o Git**
(o `.gitignore` ignora arquivos `.env*`). Preencha assim, sem aspas e sem espaços:

```
DEEPSEEK_API_KEY=sk-sua-chave-aqui
```

## 3. Variáveis (exatamente as que o código lê)

| Variável | Valor para testar a DeepSeek | O que faz |
|---|---|---|
| `DEEPSEEK_API_KEY` | sua chave | Chave secreta (só no servidor) |
| `MVF_SUPPORT_PROVIDER` | `deepseek` | Quem responde. `local` = modelo local sem IA |
| `DEEPSEEK_MODEL` | `deepseek-flash` | Modelo da DeepSeek |
| `MVF_SUPPORT_STORE` | `memory` | Conversas em memória (desenvolvimento) |
| `MVF_SUPPORT_AI_ENABLED` | `false` | Chat para alunas reais (só em produção, depois da autorização) |

Opcionais (têm padrão seguro): `DEEPSEEK_BASE_URL` (`https://api.deepseek.com`),
`MVF_SUPPORT_MAX_TOKENS` (600), `MVF_SUPPORT_TIMEOUT_MS` (25000), `MVF_SUPPORT_MAX_MESSAGES` (30),
`MVF_SUPPORT_DAILY_LIMIT` (60), `MVF_SUPPORT_CONTACT_URL` (canal humano, seção 19).

## 4. Ativar a DeepSeek só no desenvolvimento

No `.env.local`, troque:

```
MVF_SUPPORT_PROVIDER=deepseek
```

Confira (não gasta nada e não mostra a chave):

```bash
npm run nina -- check
```

Deve aparecer “✓ Pronto: as respostas virão de DeepSeek (API real)”. Se escolher `deepseek` sem chave,
o chat **avisa** que falta a chave (ele nunca troca sozinho para o modelo local).

Para provar que a chave funciona com UMA chamada mínima (custa centavos):

```bash
npm run nina -- ping --yes
```

## 5. Iniciar o servidor

```bash
MVF_DEMO_MODE=true npm run dev
```

Abra **http://localhost:3000**, vá em **Perfil > Central de ajuda**, role até o fim e toque em
**Iniciar conversa**. (A demonstração local não exige login.)

## 6. Como saber se a resposta veio da DeepSeek

São três provas:

1. **No chat:** o cabeçalho mostra “demonstração (DeepSeek (deepseek-flash))”, e embaixo de cada
   resposta aparece “via DeepSeek · deepseek-flash · 812/96 tokens”. Com o modelo local, aparece
   “modelo local (sem IA)”.
2. **No Terminal do servidor:** a cada resposta surge uma linha como
   `[nina] provedor=deepseek modelo=deepseek-flash status=ok ms=1840 tokens=812/96`. Ela nunca mostra
   o texto da conversa nem a chave.
3. **No painel da DeepSeek:** em **Usage**, o consumo aumenta.

## 7. Onde editar o nome “Nina”

Arquivo **`src/lib/support-ai/persona.ts`**, campo `name`. Lá também ficam as saudações (`GREETINGS`) e
as despedidas do encerramento automático (`FAREWELLS`). Mudar o nome atualiza o chat, o system prompt e
o TXT.

## 8. Onde editar o system prompt

Arquivo **`src/lib/support-ai/system-prompt.ts`** (só roda no servidor). As seções de personalidade
estão no começo (Identidade, Forma de escrever, Emojis, Abreviações, Entender antes de responder,
Conhecimento, Equipe humana, Privacidade, Encerramento). A seção “Botões de aula” é técnica: **não
remova**, porque o servidor depende dela.

Depois de mudar, aumente `SYSTEM_PROMPT_VERSION` e rode `npm test`.

## 9. Novas regras de personalidade

No mesmo arquivo, preencha `REGRAS_EXTRAS`, uma regra por linha começando com `- `. Exemplo:

```ts
const REGRAS_EXTRAS = `- Quando a aluna agradecer, responda de forma curta.
- Chame o Meu Plano sempre de "seu plano".`;
```

## 10. Onde colocar os arquivos do curso

> **Atalho usado em 27/11/2026:** o curso inteiro num documento só (`modulos/Modulos aulas MVF.md`, pasta
> ignorada pelo Git, com cada aula começando por `## Aula: Título`). Para atualizar a Nina depois de editar
> esse documento:
>
> ```bash
> npm run support-kb -- split "modulos/Modulos aulas MVF.md" modulos/base-nina/curso --aprovado
> npm run nina -- eval --yes --base modulos/base-nina            # opcional: testa na DeepSeek real
> node --env-file=.env.homolog scripts/support-knowledge.ts push modulos/base-nina --app            # prévia
> node --env-file=.env.homolog scripts/support-knowledge.ts push modulos/base-nina --app --execute  # grava
> ```
>
> Aulas sem texto no documento ficam de fora (o comando lista quais). No desenvolvimento,
> `MVF_SUPPORT_LOCAL_KB=modulos/base-nina` no `.env.local` soma essa pasta à demonstração.

Numa pasta **fora do projeto**, porque o material é privado e não vai para o Git. Sugestão:
`~/MVF-base`. Crie a estrutura com:

```bash
npm run support-kb -- scaffold ~/MVF-base
```

Isso cria (sem apagar nada que já exista):

```
~/MVF-base/
  LEIA-ME.txt
  aplicativo/          textos extras sobre o uso do app
  suporte/             procedimentos de atendimento, FAQ oficial, regras, produtos NUMI autorizados
  curso/
    modelo-aula.md     modelo para copiar
    01-m-primeiro-acesso/
      _modulo.md       detalhes do módulo (objetivo, pré-requisitos, descrição)
    ...                uma pasta por módulo oficial (hoje são 23)
```

## 11. Organizar módulos e aulas

- Uma pasta por módulo. Dentro dela, um arquivo por aula: `.md`, `.txt`, `.vtt` ou `.srt` (legendas).
- Cada arquivo começa com um cabeçalho entre `---`. Copie `curso/modelo-aula.md`:

```
---
id: aula-configurar-perfil-transcricao
title: Como configurar o perfil
type: transcricao
module: m-primeiro-acesso
lesson: l-configurar-perfil
version: 1
updated: 2026-11-26
status: rascunho
access: alunas
objective: Deixar o perfil pronto para vender
topics: foto, nome, bio
keywords: não sei mexer no perfil, mudar a bio, trocar a foto
---
(transcrição completa ou roteiro da aula)
```

- **`lesson`:** precisa ser o id da aula no **catálogo oficial** (`src/content/catalogo-oficial.json`,
  ver `docs/CATALOGO.md`). Sem isso não existe botão “Abrir aula”. Hoje o catálogo tem 0 aulas oficiais.
- **PDF:** extraia o texto antes (`pdftotext -layout aula.pdf aula.txt`), revise e salve como `.txt`.
- **Modelos:** textos que ainda estão entre parênteses são recusados.

## 12. Importar os arquivos

```bash
npm run support-kb -- check   ~/MVF-base                          # valida tudo
npm run support-kb -- preview ~/MVF-base                          # mostra novos, versões, duplicados
npm run support-kb -- sql     ~/MVF-base --out ~/mvf-base.sql     # gera o SQL (NÃO executa)
```

O SQL só é aplicado no banco depois da migration do suporte autorizada (homologação primeiro). Em
desenvolvimento (memória), a Nina usa os guias do app e o catálogo que já estão no projeto.

## 13. Aprovar o conteúdo

- **Arquivos do curso:** mude `status: rascunho` para `status: aprovado` depois que a equipe revisar.
  Texto mudou? Aumente `version`.
- **Guias do app:** em `src/content/nina/aplicativo.json`, mude `"status": "rascunho"` para
  `"aprovado"` em cada guia revisado.
- **Regra:** em produção só o aprovado orienta as alunas. Na demonstração, os rascunhos aparecem
  marcados como “em revisão”.

## 14. A base está completa?

```bash
npm run nina -- report ~/MVF-base
```

Mostra números reais: módulos e aulas oficiais, aulas com transcrição, documentos aprovados e
pendentes, e quais aulas oficiais ainda não têm transcrição.

## 15. Atualizar a documentação do app

Os 27 guias ficam em `src/content/nina/aplicativo.json`, um por funcionalidade (rota, caminho,
passos, dúvidas e limitações). Quando alguém mudar uma tela:

```bash
npm run nina -- docs-status    # lista os guias cujos arquivos mudaram desde a última revisão
```

Revise o texto do guia e grave o carimbo:

```bash
npm run nina -- docs-stamp
```

O `npm test` também falha se a rota de um guia deixar de existir ou se a disponibilidade (real ou
demonstração) não bater com a tela.

## 16. Verificar os links diretos para aulas

O botão “Abrir aula” só aparece quando o servidor confirma que a aula:
- existe no catálogo;
- está visível;
- a sessão pode abrir. Na demonstração vale qualquer aula do catálogo. Para alunas reais, só aulas
  **oficiais**, e só quando a área de Aulas for liberada (`MEMBER_LESSONS_LIVE` em
  `src/lib/support-ai/base.ts`).

O link nunca é escrito pela IA: o servidor monta `/aulas/<id>`. Para testar, pergunte no chat, por
exemplo, “Qual aula ensina a criar personagem com IA?”, e toque em **Abrir aula**.

## 17. Testar o encerramento automático

No chat, faça uma pergunta e depois responda “Deu certo, obrigada!”.

- **Encerra:** a Nina se despede e o atendimento é encerrado e arquivado (motivo “Resolvido”).
- **Não encerra:** “ok”, “obrigada” sozinho, “ainda não deu certo” ou perguntas.
- **Abrir aula** também encerra e arquiva, com o motivo “Encerrado ao abrir uma aula”.

Rode as perguntas de referência na DeepSeek real (várias chamadas, poucos centavos):

```bash
npm run nina -- eval --yes
```

## 18. Onde consultar o TXT

- **Desenvolvimento:** depois de encerrar, toque em **Baixar transcrição (.txt)** no chat. Fica só na
  memória da aba e some ao recarregar ou reiniciar o servidor.
- **Produção (depois da ativação):**
  - no banco, tabela `support_conversations`, coluna `transcript`;
  - a aluna baixa o próprio TXT;
  - a equipe (admin/support) consulta pelas funções `support_admin_list` e `support_admin_get`, com
    registro de acesso.

## 19. Canal humano

Configure o link oficial (WhatsApp, página de atendimento) no ambiente do servidor:

```
MVF_SUPPORT_CONTACT_URL=https://seu-canal-oficial
```

Quando a aluna tocar em **Falar com a equipe**, a Nina mostra esse link e registra o pedido. Sem o
link, ela diz com transparência que os canais ainda serão divulgados e que ninguém foi acionado.

## 20. O que ainda depende de homologação e produção

1. Aplicar a migration `supabase/migrations/20261126120000_suporte_ia.sql` e, se o banco recebeu a versão
   anterior dela, também `20261127120000_nina_2_complemento.sql` (idempotente; pode colar no SQL Editor).
2. Importar e aprovar a base do curso (seção 12).
3. Variáveis na Vercel: `MVF_SUPPORT_AI_ENABLED=true`, `MVF_SUPPORT_STORE=supabase`,
   `MVF_SUPPORT_PROVIDER=deepseek`, `DEEPSEEK_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Liberar Aulas para alunas e trocar `MEMBER_LESSONS_LIVE` para `true` (botões só de aulas oficiais).
5. Política de retenção, job de inatividade e tela da equipe.

Detalhes e portões em `docs/SUPORTE_IA.md`.
