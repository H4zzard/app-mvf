# Decisões do projeto

Registro curto de decisões técnicas e de produto. Formato: data · decisão · motivo · consequência.
Lacunas do brief **não** são preenchidas com suposições irreversíveis: ficam em “Em aberto”.

## 21/11/2026 — Fundação (Prompt 01)

**D1 · Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + lucide-react.**
Stack sugerida no brief, versão estável atual gerada por `create-next-app`. Mantido
`cacheComponents: true` (padrão do template): todas as rotas atuais são estáticas e o Next preserva o
estado das telas entre navegações com `<Activity>`.

**D2 · Sem shadcn/ui ou Radix nesta fase.** Os únicos componentes complexos (drawer mobile e painel de
detalhes) usam `<dialog>` nativo com `showModal()`, que já entrega foco preso, Esc e backdrop. Evita
dependências enquanto não há formulários complexos. Reavaliar ao construir onboarding/admin
(Select, Combobox, Toast etc.).

**D3 · Estado do plano em memória (React Context no layout `(app)`).** Início, Meu Plano e o card de
pontos leem a mesma fonte (`PlanProvider`). Sobrevive à navegação, reinicia ao recarregar.
Proibido usar localStorage como falsa persistência. No Dia 2 o provider passa a ler/gravar no servidor
mantendo a mesma interface (`statusMap`, `setTaskStatus`, `toggleComplete`).

**D4 · Fixtures isoladas em `src/demo/` e contratos em `src/types/`.** A UI depende dos tipos, não das
fixtures. Seletores puros em `src/lib/plan.ts` (próximo passo, progresso, rotina do dia) servem a
dados reais sem mudança.

**D5 · Regra do “próximo passo”.** Primeira tarefa “em andamento”; senão a primeira pendente com
pré-requisitos cumpridos; senão a primeira pendente. Só uma tarefa “em andamento” por vez.
Pré-requisitos são recomendação de ordem e **não bloqueiam** a aluna (andamento livre).

**D6 · Trilha de exemplo com 6 etapas** (Preparação; Perfil e produto; Meu formato; Produção;
Publicação; Primeiras análises e próximos passos) e 18 tarefas para o perfil “não aparecer + avatar
de IA”. “Primeiras análises” e “Próximos passos” foram unidas para caber em 4–6 fases. Conteúdo
ilustrativo, não é o catálogo real.

**D7 · Uma rota por módulo futuro com `FeaturePlaceholder`.** Sem rota dinâmica genérica: cada
pasta será substituída pela tela real. A navegação vem de `src/config/navigation.ts` (fonte única,
com `status: "available" | "soon"`).

**D8 · Menu Gestão visível só para papel demo administrativo — apenas visual.** Seletor “Visualizar
como (demo)” no rodapé da sidebar. A rota `/admin` é acessível pela URL e diz explicitamente que a
autorização real será no servidor.

**D9 · Tokens aproximados, fontes provisórias.** Cores do brief centralizadas em `globals.css`
(não são oficiais). Títulos em Playfair Display e texto em DM Sans (Google Fonts, licença OFL) até
chegarem fontes oficiais licenciadas. Marca em texto (“MVF”) até haver logo oficial.

**D10 · Pontos de demonstração calculados localmente** (aula = 10, ação = 15, níveis fictícios),
rotulados “Simulação desta sessão” e “Regras de pontos em definição”. Regras reais ficam em aberto.

**D11 · `/` redireciona para `/inicio`** (redirect temporário em `next.config.ts`). Com login, a raiz
poderá levar à tela de acesso.

**D12 · Node 24 LTS instalado em `~/.local/node`** nesta máquina (sem Homebrew/sudo). Recomendado
instalar Node de forma permanente (instalador oficial ou nvm) antes de configurar CI/deploy.

## 21/11/2026 — Onboarding e personalização (Prompt 02)

**D13 · Motor determinístico, puro e testável.** `buildPlan(profile)` em
`src/lib/personalization/engine.ts`, sem IA, rede ou relógio. Regras resumidas em
`docs/PERSONALIZACAO.md`. Uma IA futura pode operar sobre os mesmos contratos.

**D14 · Catálogo com IDs estáveis em `src/demo/task-catalog.ts`.** As 18 atividades originais
mantiveram os IDs. Pré-requisitos só apontam para atividades anteriores no catálogo (sem ciclos),
e o motor descarta os que não entram no plano. Elegibilidade e alegações de produto estão em todo
plano e nunca são opcionais.

**D15 · Trilha de exemplo gerada pelo motor.** `src/demo/plan.ts` deixou de ter a lista fixa e
guarda um `EXAMPLE_PROFILE` (perfil 1 do prompt) + status inicial. Assim há um único caminho de
código para exemplo e plano real.

**D16 · Store único com `useReducer` (`PlanProvider`).** Modos `example` (estado inicial),
`first_access` (sem plano) e `personalized`. A interface antiga foi preservada (`plan`,
`statusMap`, `toggleComplete`, `setTaskStatus`, `resetDemo`); `plan` agora pode ser `null`.
`useActivePlan()` serve aos componentes que só renderizam com plano.

**D17 · Progresso por ID, preservado ao replanejar.** Ajustar respostas regenera o plano e mantém
o `statusMap` inteiro (inclusive de atividades que saíram), além de um histórico de mudanças
(`TaskStatusEvent`). O primeiro plano criado a partir do exemplo começa sem o progresso fictício.

**D18 · Confirmação com prévia antes de recalcular** (`diffPlans`). A criação do primeiro plano
não pede confirmação extra, porque o clique em “Criar meu plano” já é explícito.

**D19 · Sem persistência, como na fase 01.** Perfil, plano e progresso ficam só em memória.
Contratos futuros em `src/types`: `OnboardingSubmissionRecord` e `PlanProgressRecord`
(`userId`, `onboardingVersion`, `engineVersion`, `completedTaskIds`).

**D20 · “Simular primeiro acesso” é controle de demo**, na sidebar, com confirmação em dois
cliques. Não há interceptação de rota nem redirect: o dashboard continua testável. A regra real
(aluna sem onboarding → `/onboarding` após login e validação de compra) fica para a fase de backend.

**D21 · Testes com `node --test` nativo (Node 24, type stripping)**, sem nova dependência. Os
módulos testáveis usam imports relativos `.ts` e `import type` para `@/…`; por isso o tsconfig tem
`allowImportingTsExtensions`.

**D22 · Formulário com inputs nativos** (radio/checkbox/text) estilizados com `has-checked:`. O
teclado, os leitores de tela e o toque funcionam sem Radix. O foco vai para o título de cada pergunta.

**D23 · Nome preferido opcional, primeira pergunta.** Sem login real, o fallback de saudação é
“parceira” (não usamos o nome da conta demo).

## 21/11/2026 — Autenticação, Kiwify e persistência (Prompt 03)

**D24 · Supabase (Auth + Postgres) com `@supabase/ssr` 0.12.** Identidade por `getClaims()`;
autorização por `my_access()` no banco. Proxy (`src/proxy.ts`) só renova sessão e pré-filtra.
Detalhes: `docs/AUTH_E_ACESSO.md`.

**D25 · Sem cadastro público.** `signInWithOtp({ shouldCreateUser: false })`; contas nascem só de
compra verificada (webhook confirmado na API ou importação). Resposta de login sempre neutra.

**D26 · Acesso derivado de pedidos (`purchase_entitlements`, 1 linha por `order_id`).** Uma conta
por e-mail de compra; vários pedidos não duplicam conta. Revogar um pedido não afeta outro ativo.
Equipe acessa por papel (`user_roles`) atribuído só por CLI auditada.

**D27 · RLS exige acesso ativo** em toda leitura/escrita da aluna: reembolso corta o acesso aos
dados mesmo com sessão válida, sem apagar o histórico.

**D28 · Webhook usa só campos documentados** (`order_id`, `webhook_event_type`, `order_status`);
produto, e-mail e status atual vêm de `GET /sales/{id}`. Aprovação nunca é concedida sem essa
confirmação (pendente + 503 se a API cair). Reembolso/chargeback assinados revogam na hora.

**D29 · Allowlist de produtos obrigatória** (`KIWIFY_ALLOWED_PRODUCT_IDS`); vazia = nada liberado.

**D30 · Importação e reconciliação por CLI, dry-run por padrão**, retomável (`import_runs`),
idempotente, relatório sem PII. Não há endpoint público para isso.

**D31 · Persistência por Server Actions + funções SQL atômicas.** O cliente envia só respostas e IDs;
o servidor valida e gera o plano com o motor. Atualização otimista com rollback e indicador
“Salvando… / Progresso salvo”. Concorrência: tarefas por ID (última escrita vence, por tarefa);
plano com revisão esperada (`revision_conflict` → pedir recarga). Rascunho do onboarding salvo a
cada pergunta.

**D32 · Modo demo local isolado:** só `NODE_ENV=development` + `MVF_DEMO_MODE=true`; memória, sem
gravação. Sem configuração → área privada fechada (inclusive em dev). `getViewer()` chama
`connection()` para nunca congelar configuração/sessão no build.

**D33 · PGlite (dev dependency) para testar RLS** sem Docker, com stub mínimo do Supabase. Não
substitui teste no projeto real.

**D34 · Nomes de variáveis Kiwify:** `KIWIFY_CLIENT_ID` + `KIWIFY_CLIENT_SECRET` + `KIWIFY_ACCOUNT_ID`
(o OAuth documentado usa client_id/client_secret), no lugar do `KIWIFY_API_KEY` sugerido no prompt.
Token de webhook com rotação (`KIWIFY_WEBHOOK_TOKEN_PREVIOUS`).

**D35 · `/admin` sem `forbidden()`** (ainda experimental no Next 16): a página renderiza a tela 403;
a API de gestão responde 401/403.

**D36 · Correção:** diálogos `<dialog>` ignoram evento `close` atrasado (StrictMode em dev
reabria/fechava). Indicador de dev do Next movido para a direita (cobria a sidebar recolhida).

## 21/11/2026 — Ativação e homologação (Prompt 04)

- **D37 · Link mágico confirmado por POST.** `/auth/confirm` virou página com botão “Entrar”; o
  `verifyOtp` só roda na Server Action. Motivo: filtros de e-mail corporativo pré-abrem links e
  consumiam o token de uso único (mitigação recomendada pelo Supabase). O template continua com
  `token_hash`.
- **D38 · 429 do Supabase com resposta neutra.** O intervalo de 60 s só existe para contas reais;
  responder “muitas tentativas” revelava compradoras.
- **D39 · Paginação da Kiwify por `pagination.count`.** O máximo de `page_size` não é documentado;
  parar em “menos que o pedido” podia truncar a importação sem aviso. Divergências vão para revisão.
- **D40 · `kiwify probe` e `--date-style`.** O formato de `start_date`/`end_date` não é confirmado
  pela doc; o probe testa os dois formatos em uma página e imprime só a forma da resposta (sem PII).
- **D41 · `kiwify grant-order` para o piloto.** Libera até 10 pedidos escolhidos, confirmando cada um
  na API (`source = manual`). Evita importar o histórico inteiro antes de validar.
- **D42 · `npm run preflight`.** Checa presença e coerência das variáveis sem imprimir valores; com
  `--remote`, faz só leituras: `disable_signup`, leitura anônima das 9 tabelas, chave secreta,
  token OAuth e escopos da Kiwify, respostas do app publicado.
- **D43 · Ambientes.** Projetos Supabase separados para homologação e produção. A Kiwify (sem
  sandbox) fica em homologação só para leitura, `grant-order` e webhook restrito ao produto MVF.

## 21/11/2026 — Front mobile-first para demonstração (Prompt 05)

- **D44 · Módulos mock só no modo demo, decidido no servidor.** `DemoModule` chama `getViewer()`:
  na demo renderiza a tela interativa; para alunas reais, o `FeaturePlaceholder` (“Em breve”).
  Nenhum dado de exemplo é renderizado em produção.
- **D45 · Store da demo separado do plano.** `DemoProvider` (memória, redutor puro
  `src/lib/demo/store.ts`) guarda favoritos, comunidade, agenda, Estúdio e desafios. O plano
  continua só no `PlanProvider`; concluir uma aula da biblioteca marca a tarefa ligada a ela.
- **D46 · Navegação mobile.** Abaixo de 1024 px: barra inferior com Início, Plano, Aulas, Virais e
  Mais (folha com os demais módulos e os controles da demo). O drawer lateral foi removido para não
  duplicar a navegação.
- **D47 · Estúdio IA determinístico.** Modelos + `buildStudioPrompt` (puro, testado). Não há IA paga
  nem chamada ao Google Flow. Os roteiros validados entram no formato `ScriptTemplate`.
- **D48 · XP só derivado de ações da demo.** `computeXp` (puro). Sem sequência de dias (não há
  registro diário real) e sem ranking (não há resultados verificáveis).
- **D49 · Cenários de gravação.** “Nova aluna”, “Aluna com plano” e “Aluna em evolução” são gerados
  pelo motor (`src/demo/scenarios.ts`); a ação `load-scenario` do `PlanProvider` só funciona em memória.
- **D50 · `npm run dev:lan`.** Sobe o dev no IP da rede local (`-H`), sem túnel nem
  `allowedDevOrigins` amplo, e esconde o indicador de dev. A cópia tem fallback para http.

## 21/11/2026 — Área de membros estilo streaming (Prompt 06)

- **D51 · Assets oficiais em `public/area-membros/`.** Copiados de `imagens-area-membros/` com nomes
  limpos e servidos com `next/image` (otimização automática). Mapeamento em `docs/AREA_MEMBROS.md`.
- **D52 · Catálogo por módulos.** Capas oficiais = módulos, agrupados em 6 trilhos; aulas de exemplo
  distribuídas por tema (demonstrativo). Tocar um módulo abre um sheet com a lista de aulas.
- **D53 · Direção visual.** Fundo claro e quente do app + hero, “Continue assistindo” e cabeçalho da
  aula em vinho/ink escuro, para conversar com as capas. Logo oficial da NUMI na marca.
- **D54 · Busca recolhida.** A experiência principal é visual; a busca abre sob demanda.

## 21/11/2026 — Finalização do front (Prompt 07)

- **D55 · Missões com linha de base.** Participar grava o valor atual da métrica; só ações posteriores
  contam. Cada missão/marco é resgatado uma vez (`challengesClaimed`). XP é derivado de conjuntos de
  ações, então a mesma ação nunca soma duas vezes. “Diária/semanal” é tipo, não relógio (demo sem `Date`).
- **D56 · Pontos da loja = XP − resgates.** XP mede engajamento e não diminui com resgates; o saldo
  sim. Resgate simulado, único por recompensa, sem operação externa.
- **D57 · Ranking só por XP de engajamento.** Perfis de exemplo marcados e desligáveis (estado vazio).
  `buildRanking(perfis, você)` recebe dados externos — pronto para dados reais. Sem filtro por
  período até haver registros com data.
- **D58 · Materiais sem arquivo.** Nenhum arquivo real no projeto: `file: null` e aviso explícito,
  sem botão de download. Regras/FAQ marcadas como demonstrativas pendentes de revisão.

## 21/11/2026 — QA mobile e gravação (Prompt 08)

- **D59 · Restauração opcional da demo — DESLIGADA por padrão.** Interruptor “Manter ao recarregar”
  nos Controles da demo. Usa o `sessionStorage` da aba, só no `DemoProvider` e só com
  `NODE_ENV=development`.
  - O snapshot é versionado e validado campo a campo (`src/lib/demo/snapshot.ts`); se for inválido, é descartado.
  - Ele só é gravado depois que o estado restaurado foi renderizado (o StrictMode regravava o padrão).
  - Pendente de decisão do operador: a proibição 4 do `CLAUDE.md` diz que “o modo demo vive em
    memória e reinicia ao recarregar”. A regra não foi alterada. Por isso o recurso nasce desligado
    e só guarda dados fictícios quando o operador liga.
- **D60 · Primeira tela priorizada.**
  - Em `/aulas`, o hero ficou mais baixo, a busca foi para o hero e o “Continue assistindo” ficou
    compacto. Primeiro trilho: 928 → 644 px a 390×844.
  - No Início, botões lado a lado e textos mais curtos: Formação MVF de 825 → 703 px.
- **D61 · `dev:lan` robusto.** Escolhe porta livre; detecta outro `next dev` na mesma pasta (o Next 16
  só permite um) e explica em português; aquece todas as rotas e avisa falhas.
- **D62 · Copiar honesto.** Fallback para http com seleção compatível com iOS; “Copiado!” só quando
  o navegador confirma.

## 21/11/2026 — Login informa se há compra (pedido do operador)

- **D63 · Fim da resposta neutra no login (substitui D38).** A tela agora verifica no servidor, com
  a service role, se o e-mail tem compra ativa ou papel de equipe:
  - sem compra: “Não encontramos este e-mail em nenhuma compra”;
  - conta sem compra ativa: orienta procurar o suporte;
  - com compra: envia o link e confirma o envio;
  - se a verificação falhar: mensagem de erro, sem liberar nada (falha fechada).
  Trade-off aceito pelo operador: qualquer pessoa consegue checar se um e-mail comprou. Mitigação:
  limite por e-mail e por IP (em memória, por instância) e os limites do Supabase. No Vercel,
  recomenda-se regra de rate limit para `POST /login`.
- **D64 · Acesso manual auditado (`npm run access`).** Para testes e exceções aprovadas: cria a
  conta (sem e-mail) e um direito `source = manual` com pedido sintético `manual-<hash>`. Revogável;
  registra em `admin_audit_log`.

- **D65 · Prévia dos módulos para contas reais (`MVF_PREVIEW_MODULES`).** Variável de servidor:
  - valores: vazio (ninguém, o padrão), `all` ou uma lista de e-mails;
  - para quem está liberado, `DemoModule` mostra as telas com dados de EXEMPLO, sempre rotulados;
  - o `DemoProvider` fica em memória e não usa `sessionStorage` em produção;
  - plano, onboarding e progresso continuam reais no Supabase;
  - não muda autenticação, RLS nem acesso: só troca o “Em breve”.
- **D66 · Onboarding começa pelo nome.** O primeiro acesso abre direto na pergunta do nome, com a
  saudação. O nome é exigido na tela no primeiro acesso, sem “Pular” e sem “Voltar”. Ao ajustar o
  plano depois, segue opcional. O validador do servidor não mudou.

## 21/11/2026 — Catálogo de conteúdo (Prompt 09)

- **D67 · Catálogo central e tipado.** O oficial (`src/content/catalogo-oficial.json`, validado por
  `parseCatalogFile`) e o de exemplo (`src/demo/catalog-demo.ts`) são separados por `origin`.
  - As telas, o checklist e as recomendações usam a API `catalog` (`src/lib/catalog`).
  - `src/demo/member-area.ts` virou fachada de compatibilidade.
- **D68 · Mídia por referência.** O catálogo guarda provedor e ID, nunca URL; links são recusados na
  validação.
  - YouTube e Vimeo incorporam pelo ID.
  - Kiwify e arquivo próprio ficam em “integração pendente” até haver link assinado no servidor.
- **D69 · Aliases de ID.** `lessonAliases` preserva o progresso e o checklist quando uma aula oficial
  substitui a de exemplo. A rota antiga redireciona para a nova.
- **D70 · Recomendação por dados.** `recommendedFor` por módulo + `profileTags` do onboarding
  substituem a lista fixa; o comportamento anterior ficou preservado nos testes.
- **D71 · Importação por CSV** (`npm run catalog -- import-csv`), com prévia por padrão e gravação
  só com `--write`. Linhas de exemplo do modelo são recusadas.

## 22/11/2026 — Estúdio IA em três geradores de texto (Prompt 09B)

- **D72 · Três ferramentas independentes** em rotas próprias: `/estudio-ia/personagem`,
  `/estudio-ia/animar` e `/estudio-ia/roteiros`. A entrada `/estudio-ia` mostra exatamente três cards.
  A tela única anterior (`studio-view.tsx`) saiu.
- **D73 · O app só produz TEXTO.** O DeepSeek será apenas o provedor de linguagem, e imagem e vídeo
  ficam no Google Flow. Nenhum contrato carrega mídia, e “tenho imagem de referência” só muda o texto.
- **D74 · Porta `TextGenerationProvider`** (`src/lib/studio/contracts.ts`) com as operações
  `generateCharacterPrompt`, `generateAnimationPrompts` e `generateTenRecordingScripts`.
  - Hoje só existe o `localDemoTextGenerator`, determinístico e sem rede.
  - `getTextProvider()` devolve sempre o local; o remoto fica bloqueado.
  - O DeepSeek só entra no servidor, em etapa futura (`docs/ESTUDIO_IA.md`).
- **D75 · A fala aprovada é intocável.** Os takes são trechos literais do texto (teste token a token).
  A reescrita fica desabilitada até existir IA real com prévia e confirmação.
- **D76 · Roteiros só com fatos da aluna.** Ângulos aplicáveis aos dados informados, experiência
  pessoal entre colchetes e alegações avisadas (`claims.ts`). Oferta só entra com confirmação.
- **D77 · Rascunhos e fichas em memória** (`studioDrafts` e `studioCharacters` no `DemoProvider`).
  Ficam fora da restauração opcional (D59). Virais e Marketplace abrem a ferramenta certa, e o gancho
  do viral é só inspiração exibida, nunca fala.
- **D78 · Biblioteca do Animador** derivada dos modelos de exemplo (`studio-templates.ts`). Os
  100 roteiros do material de referência de terceiros **não** foram importados. `prompt-builder.ts`
  ficou preservado com os testes, mas não é mais usado pela interface.

### Marketplace NUMI (Prompt 11)

- **D79 · Catálogo de produtos tipado e único** (`src/lib/products/`, puro). O arquivo oficial é
  `src/content/produtos-oficiais.json`, validado no carregamento (inválido → build/testes falham). Os
  demonstrativos ficam em `src/demo/products.ts`. Marketplace, Animador e Roteiros leem a mesma API
  `productCatalog`: não há segundo cadastro.
- **D80 · Dado comercial só com aprovação.** Preço, comissão, afiliação, links e benefícios só aparecem
  com produto `oficial` + `approval: "aprovado"`; comissão exige fonte e data, preço exige data. Fora
  disso, “A confirmar”. Produto demonstrativo não aceita nenhum desses campos nem a marca NUMI (schema).
- **D81 · Único produto oficial registrado:** “Creme Multifuncional 3 em 1” (NUMI), identificado pela
  capa oficial do módulo. Ficou como `rascunho`, com todo o resto em branco. A capa é rotulada como arte
  da área de membros, não foto de catálogo.
- **D82 · Ponte Marketplace → Estúdio** (`studio-bridge.ts`). Roteiros recebem nome, categoria,
  descrição + características, modo de uso, restrições e (só se aprovado) benefícios, além do estilo
  escolhido. O Animador recebe nome e características. Nada comercial, nenhum corte no meio de frase, e a
  ficha e a fala do Animador nunca são alteradas (só um aviso se a fala não citar o produto).
- **D83 · Salvos ≠ Meus produtos.** Coração = `favorites.products`; “Quero divulgar” =
  `productsPromoting` (máx. 30, em memória). A interface diz que a lista não faz a afiliação no TikTok Shop.
- **D84 · Recomendações pelo onboarding** (`recommend.ts`): formato de gravação, nível, acesso ao
  NUMI e completude do cadastro. Nunca usa preço, comissão ou promessa de venda; indisponível e
  “em breve” ficam de fora.
- **D85 · Importação futura** por CSV/JSON (`npm run products -- import`), com prévia. Célula vazia não
  apaga, e mudar um dado oficial já cadastrado exige `--overwrite`. Modelo: `docs/catalogo/modelo-produtos.csv`.

### Comunidade, Lives e Suporte (Prompt 12)

- **D86 · Salas exclusivas por simulação rotulada.** Elite+ e Icon ficam bloqueadas, e a demo permite
  simular o plano (`communitySim`), nunca restaurado e sempre marcado como “não é autorização real”.
  Planos não têm hierarquia presumida. O acesso real virá do servidor e da RLS.
- **D87 · Moderação na matriz única.** Novas permissões `community:moderate` (admin, moderator) e
  `support:assign` (admin, support) em `permissions.ts`. O papel “Moderação” da demo é só visualização
  simulada; o redutor recusa decisões fora dele. Nenhuma rota administrativa nova.
- **D88 · Denúncias locais.** Uma por item, nunca do próprio conteúdo, “outro” exige observação. A
  interface diz que nada foi enviado. Ficam fora do snapshot.
- **D89 · XP da comunidade sem duplicar.** Regra única `participationCounts` (publicado, texto mínimo,
  sem repetição) e teto em `computeXp` (4 publicações e 10 comentários). Curtir e denunciar não dão XP.
- **D90 · Agenda com honestidade de datas.** Agenda oficial (`agenda-oficial.json`) vazia; exemplos
  nunca têm data, link ou gravação (validados). Fases calculadas com o relógio passado como parâmetro.
  Replay só com mídia + autorização, reaproveitando o player das aulas. Lembrete simulado.
- **D91 · Central de ajuda sem respostas inventadas.** Busca com radical simples, sinônimos e
  aproximação; recomendações só do catálogo; canais oficiais vazios até a equipe informar. Tickets
  ficam como rascunho ou simulado, com bloqueio de dados sensíveis, e não vão para o snapshot.
- **D92 · 404 real no Proxy.** Detalhes de aula e produto com ID inexistente são reescritos para um
  caminho sem rota (HTTP 404) antes da renderização, depois da pré-filtragem de sessão. A página
  mantém `notFound()` como segunda defesa.
- **D93 · `Segmented`** para 2–4 abas em uma linha (Marketplace, Lives). O botão “Publicar” da
  Comunidade usa `sticky`, porque o shell cria um bloco de contenção que quebra `position: fixed`.

### Painel administrativo demonstrativo (Prompt 13A)

- **D94 · Painel em `/gestao`, só local.** Liberado apenas com NODE_ENV=development + MVF_DEMO_MODE=true +
  MVF_ADMIN_DEMO=true (`readConfig().adminDemo`). Proxy responde 404 antes de renderizar em qualquer
  outro caso; o layout repete a checagem; o preflight acusa a flag em homologação/produção. Sem chave
  na URL e sem login fictício. O `/admin` real (Kiwify) não mudou.
- **D95 · Shell próprio** (sem a barra inferior das alunas): barra lateral no desktop, menu em painel
  no celular. Módulos do 13B aparecem como “Não implementado”, sem link.
- **D96 · Permissões de conteúdo na matriz única:** `content:edit` e `content:review` (admin, expert),
  `content:publish` (admin). “Editor de conteúdo” e “Revisor” são conceitos sem papel no banco
  (decisão e migration futuras). Perfil escolhido no painel é simulação.
- **D97 · Fluxo editorial** (`src/lib/content/editorial.ts`): rascunho → em revisão → aprovado
  (demonstração) → publicado localmente, mais arquivado. Validação obrigatória antes de avançar;
  aprovar exige conteúdo completo; editar algo aprovado volta a rascunho.
- **D98 · Edição só em memória + exportação validada.** Nada grava arquivos; JSON/CSV exportados usam
  os mesmos validadores e colunas dos CLIs (`catalog`, `products`). Importação continua manual, com
  prévia.
- **D99 · Aula oficial que substitui exemplo usa o MESMO ID** (progresso e tarefas preservados;
  nada do texto de exemplo é copiado). Aliases existentes são preservados e nunca viram ID de aula.
  Excluir mostra o impacto e exige confirmação.
- **D100 · Roteiros: contrato central `StudioScript`** + `src/content/roteiros-oficiais.json`
  (vazio). O Animador lê os da equipe “aprovados” + exemplos. Rótulo “Validado” trocado por “Roteiro
  da equipe”; “validado comercialmente” é recusado; aprovar exige autorização de uso.
- **D101 · Prévias dentro do painel.** Edições não aparecem nas telas das alunas (o catálogo é
  carregado dos arquivos); torná-lo reativo seria mudança estrutural arriscada.
- **D102 · CSV de produtos** aceita `caminho|texto|capa-oficial` (retrocompatível), para a
  reimportação não trocar o tipo da imagem.

### Meu Plano 2.0 — jornada interativa (prioritário, reunião de 23/11/2026)

- **D103 · Jornada como camada sobre o motor.** `buildPlan` continua decidindo as atividades; a
  jornada (`src/lib/journey`, pura) expande em microetapas por fase. Sem segundo motor nem segunda
  fonte de respostas; estado único no `statusMap` do PlanProvider.
- **D104 · IDs e persistência.** Microetapas `t-j-…` e sinalizadores de decisão `t-j-flag-…` no
  formato da tabela `user_task_progress`; a Server Action do plano passou a aceitá-los. Sem migration;
  `apply_onboarding` não apaga progresso (replanejar preserva).
- **D105 · XP pela atividade antiga.** Microetapa não dá XP; a atividade antiga é marcada concluída
  quando todas as suas microetapas aplicáveis terminam (regra `computeXp`, uma vez). Atividade antiga
  já concluída ⇒ microetapas concluídas (progresso histórico preservado).
- **D106 · Aprendizado × execução.** Etapas de aula = atividades de aula do motor (mesmo ID); só elas
  sincronizam com a conclusão da aula na biblioteca. Ações práticas nunca são marcadas por aula.
- **D107 · Não aplicável ≠ concluída.** Etapas fora do perfil ficam recolhidas com motivo; a decisão
  “já tenho conta” na jornada vence a resposta do onboarding e pode ser trocada.
- **D108 · Telas.** Mapa vertical (`/meu-plano`) com uma etapa “Você está aqui” e execução em rota
  própria (`/meu-plano/etapa/[id]`, 404 para ID desconhecido), uma ação por tela, botão fixo acima da
  barra inferior, “Próxima etapa” imediata e volta ao mapa posicionada na etapa (âncora). O Início
  abre direto a microetapa atual. Componentes do checklist antigo removidos (sem uso).
- **D109 · Prints só reais.** Manifesto `src/content/jornada-prints.json` (vazio) + `public/jornada/`;
  sem print, “Print desta etapa pendente de cadastro”. Nada de imagem genérica.
- **D110 · Conteúdo como proposta.** 6 fases e 57 microetapas são proposta técnica preliminar;
  procedimentos do TikTok marcados para revisão; métricas numéricas da reunião (CTR, estoque,
  conversão) não entraram como regra.

## 24/11/2026 — Navegação 2.0 e interface corporativa

- **D111 · Sete destinos, sem “Mais”.** Início, Plano, Aulas, Estúdio, Produtos, Tribo e Perfil, na
  barra inferior (< 1024 px) e na lateral (desktop), a partir de `src/lib/navigation/destinations.ts`.
  Substitui a D46. Cada rota tem um destino dono, ativo também nas subrotas (teste impede rota órfã).
- **D112 · Rótulos compactos em vez de menu extra.** Abaixo de 360 px, “IA” e “Loja” (mesma fonte de
  11 px). Nome acessível sempre contém a palavra visível (“Tribo, Comunidade MVF”, “Loja de produtos”).
- **D113 · Perfil como central.** Conta, Minha evolução (XP/nível pela mesma fonte do card de pontos +
  Desafios, Ranking, Conquistas, Recompensas), Ajuda e informações, Conta (respostas, ajustar plano,
  sair) e controles da demo no celular. Disponível para todas as contas; não mostra e-mail, categoria,
  preço ou benefício não confirmados; “Conhecer outros planos” é só “Em breve”, sem checkout.
- **D114 · Destinos de Virais, Lives, Materiais e Minhas vendas.** Virais → Estúdio (atalhos no Início e
  no Estúdio); Lives → Tribo; Materiais → Aulas; Minhas vendas → Produtos. `/mais` → `/perfil`.
- **D115 · Modo foco no App Shell.** `isAppNavHidden`: sem barra nem lateral no onboarding não concluído e
  nas rotas de `FOCUS_ROUTE_PREFIXES` (reservado para o primeiro acesso com vídeo).
- **D116 · Início por prioridade.** Próxima ação da jornada (com progresso do mesmo motor) → Para hoje e
  área de membros → Ferramentas (Virais, Estúdio) → Avisos (com Lives e Tribo) → “Precisa de ajuda?”.
  Saíram do Início: acesso rápido de 4 ícones, lista “Sua jornada” (repetia o mapa), desafios e card de
  pontos (agora no Perfil). Nenhuma funcionalidade removida.

## 24/11/2026 — Identidade visual 2.0 (vinho + nude)

- **D117 · Paleta invertida a pedido da expert.** Vinho profundo (`wine`, `wine-deep`) vira a cor da
  moldura (cabeçalho, lateral, barra inferior, login) e dos blocos de destaque (próxima ação, mapa,
  perfil); bege/off-white quente (`canvas`, `card`, `paper`) substitui o branco; bordô (`brand`) fica
  para ação; quase preto (`ink`) só pontual (blocos de prompt, cartões especiais). Tokens provisórios,
  só em `globals.css`. Contraste AA conferido por par de tokens e por auditoria no navegador.
- **D118 · Tipografia de produto.** Playfair (serifada) + DM Sans → Inter para tudo (via `next/font`,
  sem dependência nova). A classe `font-serif` foi mantida e agora aponta para Inter com espaçamento de
  título, para não tocar 90+ usos.
- **D119 · Menos “candy”.** Raios globais reduzidos (xl 10 px, 2xl 12 px, 3xl 16 px), botões e
  chips `rounded-lg`, bolhas decorativas e degradês ornamentais removidos (degradês sobre fotos
  ficaram, recoloridos em vinho, porque garantem leitura). Mapa do plano em linha do tempo reta.
- **D120 · Foco visível sobre vinho.** `.mvf-on-wine` troca o contorno de foco para o rosa de
  destaque; painéis claros dentro da moldura (`.mvf-light`) voltam ao bordô.
- **D121 · Vidro fosco bordô no celular.** Abaixo de 1024 px, cabeçalho e barra inferior usam `.mvf-glass`
  (bordô rosado `--mvf-glass` 124 32 57 a 86% + blur 14 px), com cantos de 20 px nas bordas voltadas ao
  conteúdo. Opacidade escolhida pelo pior caso (conteúdo claro por trás): texto ≥ 5,7:1, rótulo inativo
  (`on-glass-muted`) ≥ 4,6:1. Sem suporte a blur, cai para 97% de opacidade. Destino ativo da barra: cápsula
  clara em relevo e ícone 10% maior. Desktop mantém a moldura vinho sólida.

## 25/11/2026 — Correção visual: paleta restrita, topo limpo, barra flutuante

- **D122 · Só duas famílias de cor.** Bordô `#a4052d`/`#b8002e` e bege `#fffbf8`/`#f6efe0`. Todos os
  tokens são essas cores ou misturas/transparências delas (pré-calculadas em `globals.css`). Sem branco,
  rosa claro, cinza, verde ou amarelo: `success`/`warning` passam a bordô (o ícone e o texto dizem o
  estado). Classes `*-white`/`*-black` trocadas por `*-paper`/`*-wine-deep`; degradês sobre fotos e
  medalhas do ranking também. Substitui D117 (paleta) e o vidro “rosado” da D121.
- **D123 · Topo sem marca.** Removidos faixa, logo, nome, trilha e cartão do usuário do topo (também
  na lateral do desktop). Fica só o sino (e o aviso de sincronização das contas reais, funcional).
  Sair da conta e identificação ficam no Perfil.
- **D124 · Barra inferior flutuante.** Retângulo com cantos de 12 px, afastado 4–12 px das laterais e
  8 px acima da área segura, vidro bordô principal a 85% com blur 16 px; bolha ativa em vidro
  (bege 15% + borda clara). Barras fixas (Plano, Estúdio, Tribo) sobem para `5.25rem + safe area`.

## 25/11/2026 — Rolagem ao trocar de página

- **D125 · Nova rota abre no topo (regra única).** `ScrollReset` (`src/components/layout/scroll-reset.tsx`),
  montado uma vez no App Shell depois do `<main>`: mudou o pathname → `window.scrollTo(0)` instantâneo.
  Causa: quem rola é a janela, o `<Link>` do Next mantém a posição quando a nova página ainda aparece
  na viewport e as telas visitadas ficam vivas no `<Activity>`. Voltar/avançar também vão ao topo
  (`history.scrollRestoration = "manual"` + reforço após o quadro). Exceções: primeira carga e URL com
  âncora. Tocar no destino atual da barra/lateral volta ao topo.
- **D126 · Mapa só centraliza a etapa pela âncora.** Removida a “última etapa” em memória (gravada a cada
  visita, fazia qualquer ida ao Plano pular para a etapa). Agora só “Mapa” na tela da etapa
  (`/meu-plano#no-<etapa>`) posiciona o mapa; navegação normal para o Plano abre no topo.

## 25/11/2026 — Identidade visual definitiva

- **D127 · Paleta definitiva: borgonha `#800020` + off-white `#FAF9F6`.** Substitui D117 e D122. Tokens
  semânticos em `globals.css` (todos derivados das duas cores); `success`/`warning` em borgonha. Referência:
  `docs/IDENTIDADE_VISUAL.md`. Teste `src/lib/design/palette.test.ts` barra hex/rgb fora da paleta.
- **D128 · Menu inferior congelado.** Tokens próprios `--nav-*` com os valores aprovados (vidro 164 5 45 a
  85%, rótulos `#FFFBF8`/`#F2D9DC`, foco `#F6EFE0`) e classe `.mvf-nav`; a paleta global não o altera
  (verificado por estilo computado e teste).
- **D129 · Sem selos de desenvolvimento.** `DemoBadge` virou nota de texto discreta; removidos os selos de
  cabeçalho (Início, Plano, Aulas, Estúdio, Produtos, Tribo, Lives, Desafios, Ranking, Conquistas,
  Recompensas, Perfil, Suporte, Regras/FAQ, Materiais, Virais) e os repetidos por item (posts, lives).
  Honestidade mantida em contexto: resultado do Estúdio rotulado “modelo local (sem IA)” no próprio bloco
  de saída, “Produto demonstrativo”, “Aula de exemplo”, avisos de Lives/Marketplace/Regras, ações simuladas.

## 26/11/2026 — Assistente MVF (suporte com IA)

- **D130 · Arquitetura real, ativação por portão.** `src/lib/support-ai/` (puro) + `server.ts` (server-only) +
  Server Actions em `/suporte/chat`. Contas reais só veem o chat com `MVF_SUPPORT_AI_ENABLED=true`,
  `MVF_SUPPORT_STORE=supabase`, DeepSeek e service role. Demo: adaptador em memória por aba + modelo local
  rotulado. Detalhes e portões em `docs/SUPORTE_IA.md`.
- **D131 · DeepSeek só no servidor.** `deepseek-flash` (conferido na doc em 26/11/2026), sem raciocínio, sem
  ferramentas, `user_id` anônimo. Chave nunca `NEXT_PUBLIC_`; há teste de que nenhum cliente importa o servidor.
- **D132 · RAG textual primeiro.** Postgres FTS português (GIN) e BM25 em memória; pgvector depois (a DeepSeek
  não tem embeddings). Só documentos aprovados chegam às alunas; trechos com instruções ao modelo são descartados.
- **D133 · Conversas no banco + TXT no campo TEXT.** Mensagens individuais com `seq` único; encerramento em duas
  fases (`closing` → TXT gerado no servidor → `closed` só se a contagem bater), idempotente. Respostas do
  assistente e arquivamento só via service_role. Retenção sem prazo até política aprovada.
- **D134 · Chat em modo foco.** `/suporte/chat` entra em `FOCUS_ROUTE_PREFIXES`: barra e lateral somem pela regra
  existente, sem alterar o design congelado (D128). Altura acompanha o `visualViewport` (teclado).
- **D135 · Encaminhamento honesto.** Assuntos sensíveis oferecem “Falar com a equipe”; registra o pedido e mostra
  só canal oficial configurado (`MVF_SUPPORT_CONTACT_URL`). Nunca “atendente acionado”, protocolo ou prazo.

## Em aberto (não decidir sem o operador/expert)

- Assistente MVF: autorizar a migration do suporte (portões A–E em `docs/SUPORTE_IA.md`), política de
  retenção das conversas, canal humano oficial e aprovação dos guias/base do curso.

- Restauração da demo ao recarregar (D59): manter como opcional, ligar por padrão (exige ajustar a
  proibição 4 do `CLAUDE.md`) ou remover.

- Nome comercial, logo, fontes e tokens oficiais.
- Regras de pontos, níveis, recompensas e salas Elite+ / Icon (Icon inclui Elite+?).
- Regras de convivência, moderação, agenda real de lives, política de gravações e canais oficiais de suporte.
- Criar os papéis “Editor de conteúdo” e “Revisor” no banco (ou mapear para `expert`)?
- Metodologia oficial da jornada (fases, microetapas, procedimentos do TikTok, prints e aulas de apoio).
- Catálogo real de aulas/atividades e revisão das regras do motor pela expert (o atual é demo).
- Migração/hospedagem das aulas hoje na Kiwify (direitos, arquivos-fonte, player).
- Comissões NUMI e integração com TikTok Shop.
- Fornecedor de dados de vídeos virais e custo.
- Permissões finas por cargo (owner, admin, expert, suporte, moderação, parceiros).
- Suporte, moderação, notificações, LGPD (consentimento, exportação/exclusão, retenção).
- Data da primeira venda do MVF (início da importação) e lista final de produtos que dão acesso.
- Política para `refund_requested`/`pending_refund` (hoje: mantém o acesso até `refunded`).
- Provedor de SMTP, domínio de envio e domínio do app.
