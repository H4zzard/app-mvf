@AGENTS.md

# App MVF — regras permanentes do projeto

Plataforma de ensino e operação da Marcas Virais Femininas (MVF) para criadoras que vendem
produtos físicos (em especial NUMI) no TikTok Shop. Brief de referência: `MVF_BRIEF_MESTRE_v1.md`
(fornecido pelo operador; não versionado aqui). Decisões em `docs/DECISOES.md`, roadmap em `docs/ROADMAP.md`.

**Princípio de produto:** a primeira pergunta da aluna é “qual é meu próximo passo?”. O Início
responde isso antes de qualquer indicador.

## Comandos

Node 24 LTS. Nesta máquina o Node foi instalado em `~/.local/node` (sem Homebrew); se `node`
não estiver no PATH, use `export PATH=~/.local/node/bin:$PATH`.

```bash
npm run dev     # servidor local (http://localhost:3000 → redireciona para /inicio)
npm run lint    # ESLint (eslint-config-next)
npm run build   # build de produção + checagem de tipos
npm test        # testes das regras puras (node --test nativo)
npm run plans:examples  # imprime os planos dos 5 perfis de exemplo
npm run kiwify -- import|reconcile   # CLI Kiwify (dry-run por padrão; ver docs/KIWIFY.md)
npm run admin:role -- grant|revoke   # papéis de equipe (dry-run por padrão; auditado)
npm run preflight -- --target development|homologacao|producao [--remote]  # checa env sem imprimir valores
npm run kiwify -- probe|grant-order  # contrato real (só leitura) / piloto por pedido (dry-run padrão)
MVF_DEMO_MODE=true MVF_ADMIN_DEMO=true npm run dev  # painel demonstrativo /gestao (só local; docs/PAINEL_ADMIN.md)
node --env-file=.env.homolog scripts/<cli>.ts …   # rodar CLIs contra homologação
MVF_DEMO_MODE=true npm run dev        # modo demo local (memória), só development
npm run dev:lan                       # demo no IP da rede local para gravar no celular (docs/GRAVACAO_MOBILE.md)
npm start       # serve o build
```

Sempre rode `npm run lint`, `npm test` e `npm run build` antes de dizer que algo está pronto. Nunca afirme
que passou sem ter rodado.

## Stack

Next.js 16 (App Router, `cacheComponents: true`), React 19, TypeScript, Tailwind CSS v4,
lucide-react. Sem shadcn/Radix por enquanto: drawer e painéis usam `<dialog>` nativo.
Esta versão do Next tem mudanças grandes — consulte `node_modules/next/dist/docs/` antes de usar
APIs (ex.: `error.tsx` recebe `retry`, `LayoutProps`/`PageProps` são globais gerados).

## Estrutura

- `src/app/(app)/` — telas internas com o shell (sidebar + header). Uma pasta por rota.
- `src/components/{layout,ui,plan,dashboard,onboarding}` — componentes; `feature-placeholder.tsx` para “Em breve”.
- `src/config/` — navegação (fonte única do menu), marca provisória e perguntas do onboarding.
- `src/types/` — contratos de dados (User, OnboardingProfile, Lesson, PlanStage, PlanTask, …).
- `src/demo/` — **fixtures de demonstração**, isoladas. Nada de dado real aqui.
- `src/lib/` — funções puras (seletores do plano, `cn`).
- Tokens de design: `src/app/globals.css` (`:root` + `@theme`). Não espalhe hex pelas páginas.
  PALETA DEFINITIVA (D127, `docs/IDENTIDADE_VISUAL.md`): só borgonha `#800020` e off-white `#FAF9F6` (e misturas/alpha).
  Nada de branco, preto, cinza, rosa, cores do Tailwind ou hex soltos (há teste). Use os tokens semânticos.
  MENU INFERIOR CONGELADO (D128): usa só `--nav-*`/`.mvf-nav`/`.mvf-glass`; não alterar. Topo sem marca (só o sino).
  Sem selos de demonstração decorativos (D129): `DemoBadge` é nota discreta, só onde evita confundir simulação com realidade.
  Se o CSS novo não aparecer no dev, o cache do Turbopack está velho: pare o servidor e apague `.next`.

## Acesso e dados (Prompt 03)

- Docs: `docs/AUTH_E_ACESSO.md`, `docs/KIWIFY.md`, `docs/BANCO.md`.
- Toda operação sensível reautoriza no servidor: `getViewer()` / `authorizeMemberAction()`
  (`src/lib/auth/viewer.ts`). Proxy é só pré-filtro. Nunca `getSession()` no servidor.
- Papéis vêm do banco (`user_roles`), atribuídos só por CLI. Permissões em `src/lib/auth/permissions.ts`.
- Service role só em `src/lib/supabase/admin.ts` (server-only) e CLIs. Nunca `NEXT_PUBLIC_*`.
- Escritas da aluna: Server Action → validação → função SQL com RLS. O plano é gerado no servidor
  pelo motor; nunca aceitar plano vindo do cliente.
- Mudou schema? Nova migration em `supabase/migrations/` + teste em `supabase/tests/`.
- Módulos usados por CLI/testes (`src/lib/kiwify`, `src/lib/access`, `src/lib/config`) ficam puros:
  imports relativos `.ts`, sem `server-only`.
- Leitura de sessão em página/layout fica atrás de `<Suspense>` (Cache Components).
- Logs sem e-mail, CPF ou payload. Nada de dados reais em fixtures/testes.

## Homologação (Prompt 04)

- Docs: `docs/HOMOLOGACAO_04.md` (auditoria), `docs/SETUP_REAL_04.md` (passo a passo com portões),
  `docs/RELATORIO_PILOTO_04.md` (matriz de evidências; “PASSOU” só com o ambiente certo).
- Portões que exigem autorização explícita do operador, operação por operação: migration remota,
  e-mail real, probe/dry-run/`grant-order`/`import --execute` na Kiwify, webhook, papéis, deploy.
- `/auth/confirm` só valida o token no POST (botão). Não voltar a validar no GET.

## Demonstração mobile (Prompt 05)

- Módulos interativos (Aulas, Virais, Estúdio IA, Comunidade, Marketplace, Conquistas, Lives,
  Suporte, Perfil) só aparecem no modo demo, via `DemoModule` (decisão no servidor). Alunas reais
  veem “Em breve” até existir dado real. Nunca renderizar fixture fora da demo.
- Estado da demo: `DemoProvider` + redutor puro `src/lib/demo/store.ts` (memória). Plano continua
  só no `PlanProvider`. Dados de exemplo em `src/demo/` sempre rotulados (“exemplo”, “demonstrativo”).
- Navegação: 7 destinos fixos (`src/lib/navigation/destinations.ts`), barra inferior < 1024 px e lateral no
  desktop. Sem menu “Mais”. Rota nova precisa de destino dono (`owns`); regras em `docs/NAVEGACAO_MVF.md`.
- Telas visitadas ficam no DOM escondidas por `<Activity>`: feche sheets no `useLayoutEffect` de
  limpeza e, nos testes de navegador, considere só elementos visíveis.

## Área de membros (Prompt 06)

- Capas e banner oficiais em `public/area-membros/` (origem: `imagens-area-membros/`). Mapeamento
  capa → módulo → trilho em `src/demo/member-area.ts` e `docs/AREA_MEMBROS.md`. Não use imagens
  aleatórias: módulo sem capa usa fallback visual, nunca foto inventada.
- Logo oficial: `BRAND.logoSrc` (`/area-membros/logo-numi.jpg`).

## Catálogo de conteúdo (Prompt 09)

- Fonte única: `src/content/catalogo-oficial.json` (oficial) + `src/demo/catalog-demo.ts` (exemplo),
  acessados só pela API `catalog` (`src/lib/catalog`). Regras e preenchimento em `docs/CATALOGO.md`.
- Nunca inventar aula ou material oficial; nunca colocar URL de vídeo ou arquivo no catálogo (só referência).
- Nunca renomear ID de aula publicada; para substituir, use `lessonAliases`.
- Depois de editar o catálogo: `npm run catalog -- check`.

## Estúdio IA (Prompt 09B)

- Três ferramentas de TEXTO: `src/lib/studio/` (puro) + `src/components/estudio/`. Regras em `docs/ESTUDIO_IA.md`.
- O app nunca gera imagem, voz ou vídeo; tudo isso é feito no Google Flow. DeepSeek = só linguagem, só no servidor, ainda não conectado.
- Nunca alterar a fala aprovada ao dividir em takes. Nunca inventar fatos, preços, depoimentos ou alegações nos roteiros.
- Resultado local sempre rotulado “modelo local (sem IA)”. Sem `fetch`, chave ou `NEXT_PUBLIC_*` no Estúdio (há teste).

## Marketplace (Prompt 11)

- Fonte única de produtos: `src/content/produtos-oficiais.json` (oficial) + `src/demo/products.ts`
  (demonstrativo), só pela API `productCatalog` (`src/lib/products`). Regras em `docs/MARKETPLACE.md`.
- Nunca inventar produto, preço, comissão, benefício ou condição de afiliação. Dado comercial só aparece
  com produto oficial aprovado e verificado; senão “A confirmar”. Demonstrativo não usa a marca NUMI.
- Marketplace → Estúdio só leva o que está cadastrado (nada comercial) e nunca altera ficha ou fala.
- “Meus produtos” não é afiliação. Depois de editar o catálogo: `npm run products -- check`.

## Comunidade, Lives e Suporte (Prompt 12)

- Regras em `docs/COMUNIDADE_LIVES_SUPORTE.md`. Puro: `src/lib/community`, `src/lib/events`, `src/lib/support`.
- Nunca dizer que denúncia, lembrete ou ticket foi enviado/recebido: na demo é registro local ou simulação.
- Salas Elite+/Icon e o papel de moderação na demo são SIMULAÇÃO rotulada; permissões reais só em
  `permissions.ts` (sem segunda estrutura de papéis) e verificadas no servidor.
- Evento demonstrativo nunca tem data, link ou gravação; agenda oficial em `src/content/agenda-oficial.json`.
- Tickets bloqueiam senha, código, CPF e cartão; tickets e denúncias nunca vão para o armazenamento local.
- XP da comunidade só por `participationCounts` + tetos de `XP_RULES` (sem pontos repetidos).

## Painel administrativo (Prompt 13A)

- `/gestao` é DEMONSTRATIVO e LOCAL: só com NODE_ENV=development + MVF_DEMO_MODE=true + MVF_ADMIN_DEMO=true
  (`MVF_DEMO_MODE=true MVF_ADMIN_DEMO=true npm run dev`). Nunca liberar em produção; negar no servidor (Proxy + layout).
- O painel não grava arquivos, banco nem navegador: edita em memória e exporta JSON/CSV validados
  pelos mesmos validadores (`parseCatalogFile`, `parseProduct`, `parseScriptsFile`). Importar só pelos CLIs, com prévia.
- “Aprovado”/“Publicado localmente” no painel não são aprovação/publicação reais. Regras em `docs/PAINEL_ADMIN.md`.
- Permissões só em `permissions.ts`; perfis do painel são simulação. Roteiros do Animador vêm de `src/lib/studio/library.ts`.

## Meu Plano 2.0 — jornada interativa

- Regras em `docs/PLANO_INTERATIVO.md`. Motor puro `src/lib/journey/` sobre `buildPlan` (nunca um segundo motor);
  catálogo-proposta em `src/demo/journey-catalog.ts`; estado único no `statusMap` do PlanProvider.
- IDs de microetapa `t-j-…` estáveis (nunca renomear); toda atividade do motor precisa de etapa (há teste).
- Microetapa não dá XP: a atividade antiga é concluída quando todas as suas etapas aplicáveis terminam.
- Aula de apoio nunca marca ação prática. “Não se aplica” nunca conta como concluída.
- Prints só reais (`src/content/jornada-prints.json` + `public/jornada/`); sem print, mostrar a pendência.

## Gamificação da demo (Prompt 07)

- Fonte única: `src/lib/demo/xp.ts` (XP, níveis, marcos, missões) e `src/lib/demo/economy.ts`
  (saldo, recompensas, ranking). Nunca some XP fora de `computeXp`; nada de contador paralelo.
- Missões exigem adesão com linha de base; resgates são únicos. Ranking nunca usa vendas/faturamento.

## Personalização

- Regras em `docs/PERSONALIZACAO.md`. O motor (`src/lib/personalization/`) é puro e determinístico:
  sem React, sem rede, sem `Date`. Módulos testados usam imports relativos `.ts` e só `import type` de `@/…`.
- IDs de atividade e de resposta são **estáveis**; nunca renomeie um ID existente (o progresso depende dele).
- Pré-requisitos só podem apontar para atividades anteriores no catálogo. Elegibilidade e alegações
  de produto nunca podem ser opcionais nem removidas.
- Store único: `PlanProvider` (`usePlan` / `useActivePlan`). Não crie estados paralelos de plano.
- A “conversa” é roteirizada: não anunciar IA generativa enquanto ela não existir.

## Proibições (inegociáveis)

1. **Nunca apresentar dado de demonstração como real.** Todo dado demo leva `DemoBadge` ou texto
   equivalente. Não exibir vendedoras, GMV, receitas, comissões, nº de membros, rankings ou
   avaliações fictícias como fatos.
2. **Nada de botão de mentirinha.** Todo botão executa ação local real ou fica desabilitado / “Em breve”.
3. **Sem links quebrados.** Rota nova no menu = página real ou `FeaturePlaceholder`.
4. **Sem persistência falsa.** Não gravar progresso ou dados de alunas em localStorage. Persistência
   real só no Supabase; o modo demo vive em memória e reinicia ao recarregar.
5. **Segurança não é visual.** Esconder item de menu não é autorização. Checar sessão e direito de
   acesso **no servidor em toda rota/Server Action restrita** e manter RLS. Falhar fechado.
6. **Segredos fora do cliente e do Git** (chaves Kiwify, IA, e-mail). Só em variáveis de ambiente do servidor.
7. **Não inventar regras do TikTok Shop**, preços, comissões ou parceiros. Na dúvida, texto
   neutro que remete às aulas/suporte oficiais.
8. **Não prometer resultado financeiro.** Falar em “possibilidade” da primeira comissão.
9. Não usar logo/fontes recortadas de capturas. Marca e nome são provisórios (`src/config/brand.ts`).
10. Não inserir nomes, fotos ou dados reais de clientes em código, fixtures ou prompts.

## Convenções

- Textos de interface em português do Brasil, tom acolhedor e direto.
- Componentes de cliente só quando precisam de estado/efeitos; páginas são Server Components finos.
- Acessibilidade: alvos de toque ≥ 40–44 px, `aria-*` em controles customizados, foco visível,
  respeitar `prefers-reduced-motion`. Testar 375 / 768 / 1440 px sem overflow horizontal.
- Ao decidir algo arquitetural, registrar em `docs/DECISOES.md`.
