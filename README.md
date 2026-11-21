# App MVF

Plataforma de ensino e operação da **Marcas Virais Femininas** para criadoras que vendem no
TikTok Shop. Nome comercial e identidade visual ainda são **provisórios**.

> **Estado atual:** front-end + motor de personalização + **código de acesso, Kiwify e persistência
> (Supabase) prontos e testados localmente**, mas **ainda não conectados a serviços reais**: falta
> configurar Supabase, SMTP, credenciais Kiwify e domínio. Sem isso, a área privada fica fechada.
> Aulas, catálogo de atividades e pontos continuam ilustrativos.

## Requisitos

- Node.js 24 LTS (os testes usam type stripping nativo) e npm. Nesta máquina:
  `export PATH="$HOME/.local/node/bin:$PATH"`.

## Instalação e execução

```bash
npm install
cp .env.example .env.local   # preencher (ver docs/AUTH_E_ACESSO.md); nunca commitar
npm run dev                  # http://localhost:3000
```

Sem Supabase configurado, a área privada mostra “Plataforma em configuração” (fechada).
Para testar layout e motor sem backend, **só em desenvolvimento**:

```bash
MVF_DEMO_MODE=true npm run dev   # modo demo local: memória, nada é salvo, login desativado
```

Verificação:

```bash
npm run lint       # ESLint
npm run build      # build de produção + TypeScript
npm test           # 93 testes: motor, Kiwify, auth, e RLS em Postgres local (PGlite)
npm run plans:examples  # imprime os planos dos 5 perfis de exemplo
npm start          # serve o build
```

Operação (dry-run por padrão; detalhes em docs/KIWIFY.md):

```bash
npm run kiwify -- import --from AAAA-MM-DD --to AAAA-MM-DD [--execute]
npm run kiwify -- reconcile [--execute] [--active]
npm run kiwify -- probe --from AAAA-MM-DD --to AAAA-MM-DD        # só leitura, sem PII
npm run kiwify -- grant-order --order <id>[,<id>] [--execute]    # piloto por pedido
npm run preflight -- --target homologacao [--remote]            # checa configuração sem imprimir valores
npm run dev:lan                                                  # demo no celular (mesma rede Wi-Fi) — docs/GRAVACAO_MOBILE.md
npm run admin:role -- grant --email … --role admin --actor "Nome" [--execute] [--create-user]
```

## O que está pronto

| Rota | Estado |
|---|---|
| `/inicio` | Dashboard: próximo passo, resumo do plano, jornada, rotina do dia, acesso rápido, avisos e pontos (simulação). |
| `/meu-plano` | Plano gerado pelo motor: etapas, filtros, conclusão, detalhes, “Ver minhas respostas”, “Ajustar meu plano”. Antes do onboarding, mostra uma trilha de exemplo. |
| `/onboarding` | Onboarding conversacional roteirizado (11 perguntas), resumo editável, criação e ajuste do plano com prévia. Rascunho salvo. |
| `/login`, `/auth/confirm` | Link mágico (Supabase), sem cadastro público, resposta neutra, `returnTo` seguro. |
| `/acesso-indisponivel` | Conta sem compra ativa (não localizada, reembolsada, estornada). |
| `/admin` | Só equipe com papel no banco; aluna recebe 403. Saúde da integração Kiwify. |
| `/api/webhooks/kiwify` | Webhook assinado (HMAC-SHA1), deduplicado, confirmado na API. |
| Demais itens do menu | Página “Em breve” com o escopo planejado, sem dados fictícios. |

Também: sidebar recolhível com grupos, drawer mobile, estados de loading/erro/404 e
estados vazios. Testado em 375, 768 e 1440 px sem overflow horizontal.

## Estrutura

```
src/
  app/
    layout.tsx              # fontes, metadados, <html lang="pt-BR">
    globals.css             # design tokens (fonte única de cores)
    not-found.tsx
    (app)/                  # telas internas com o shell
      layout.tsx            # SessionProvider + PlanProvider + AppShell
      loading.tsx, error.tsx
      inicio/ meu-plano/ onboarding/   # telas implementadas
      aulas/ … admin/       # placeholders "Em breve"
  components/
    layout/                 # shell, sidebar, header, drawer, notificações, sessão demo
    ui/                     # Button, Badge, Card, ProgressBar, PageHeader, EmptyState
    plan/                   # PlanProvider (store único), PlanView, TaskCard, dialogs, PhaseTrack
    onboarding/             # OnboardingFlow, QuestionField, AnswersSummary, PlanChangeDialog
    dashboard/              # DashboardView, QuickAccess, PointsCard
    feature-placeholder.tsx
  config/                   # navigation.ts, brand.ts, onboarding-questions.ts (perguntas + validação)
  demo/                     # FIXTURES DE DEMONSTRAÇÃO (isoladas)
  lib/                      # plan.ts (seletores puros), personalization/ (motor + testes)
  types/                    # contratos de dados
docs/
  DECISOES.md               # decisões arquiteturais
  ROADMAP.md                # próximos módulos
  PERSONALIZACAO.md         # regras do motor e os 5 perfis de exemplo
  AUTH_E_ACESSO.md          # login, autorização, papéis, configuração Supabase/SMTP
  KIWIFY.md                 # webhook, importação, reconciliação
  BANCO.md                  # tabelas, RLS, funções, migrations
supabase/migrations/        # schema versionado
supabase/tests/             # testes de RLS (PGlite)
scripts/                    # CLIs: kiwify.ts, admin-role.ts, print-example-plans.ts
scripts/print-example-plans.ts
CLAUDE.md                   # regras permanentes para o assistente de código
```

## Limites do protótipo

- **Personalização por regras, não por IA.** A “conversa” é roteirizada; regras em
  [docs/PERSONALIZACAO.md](docs/PERSONALIZACAO.md). Títulos de aulas e atividades são de demonstração.
- **Integrações não validadas ao vivo:** envio de e-mail, Supabase real e Kiwify real dependem de
  credenciais (ver “Para liberar as primeiras alunas”). A RLS foi testada em Postgres local.
- **Modo demo local:** memória, some ao recarregar; “Simular primeiro acesso” e “Visualizar como”
  existem só nele e não dão acesso a nada.
- **Notificações e avisos** são apenas interface; não há backend.
- **Módulos de demonstração** (Aulas, Virais, Estúdio IA, Comunidade, Marketplace, Conquistas, Lives,
  Suporte, Perfil): interativos só no modo demo, com dados de exemplo; sem vídeos reais (seguem na Kiwify).
- **Pontos/XP** são uma simulação local com regras provisórias, derivada das ações da demo.
- Cores aproximadas, fontes provisórias (Playfair Display + DM Sans, OFL) e marca em texto.

## Para liberar as primeiras alunas (ações manuais mínimas)

Passo a passo completo, com os portões de autorização: [docs/SETUP_REAL_04.md](docs/SETUP_REAL_04.md).
Resumo:

1. Supabase de **homologação**: projeto, chaves, Auth (sem cadastro, redirect exato, template) e migration.
2. **SMTP próprio** com domínio verificado (SPF/DKIM/DMARC) e rastreamento de cliques desligado.
3. Kiwify: credencial de API (só leitura de vendas), ID(s) do produto MVF.
4. Deploy de homologação com as variáveis; `npm run preflight -- --target homologacao --remote`.
5. `kiwify probe` → `import` em dry-run de 30 dias → conferir com o painel.
6. `kiwify grant-order` para 2–3 compradoras autorizadas; primeiro admin via `admin:role`.
7. Webhook de homologação (só produto MVF) e roteiro de testes C2–C7.
8. Registrar tudo em `docs/RELATORIO_PILOTO_04.md`; só então planejar produção.

## Próximos passos

1. Concluir a Fase C da homologação (Prompt 04) com evidências reais.
2. Prompt 05: catálogo real de aulas e módulo de gestão.

Detalhes em [docs/ROADMAP.md](docs/ROADMAP.md) e [docs/DECISOES.md](docs/DECISOES.md).
