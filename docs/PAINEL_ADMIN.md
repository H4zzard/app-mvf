# Painel administrativo (Prompt 13A): demonstrativo e local

> **Regra central:** o painel em `/gestao` existe **só no computador de quem desenvolve**. Ele
> trabalha em memória, valida com as mesmas regras dos arquivos oficiais e **exporta arquivos para
> revisão**. Não grava nada no projeto, no banco ou no navegador, e não tem login fictício.

## Como acessar

```bash
MVF_DEMO_MODE=true MVF_ADMIN_DEMO=true npm run dev
# abra http://localhost:3000/gestao
```

O servidor só libera o painel quando as **três** condições valem ao mesmo tempo
(`readConfig().adminDemo`):

| Condição | Por quê |
|---|---|
| `NODE_ENV=development` | Só existe no `npm run dev`. Build e produção nunca liberam. |
| `MVF_DEMO_MODE=true` | Sessão de demo local, sem contas reais. |
| `MVF_ADMIN_DEMO=true` | Ativação explícita do painel. |

### Proteção (no servidor, não no menu)

1. **Proxy** (`src/proxy.ts`): qualquer `/gestao…` fora dessas condições recebe **HTTP 404 antes da
   renderização**, em qualquer modo (demo sem a flag, Supabase, produção). Parâmetro na URL não
   muda nada.
2. **Layout da rota** (`src/app/(gestao)/gestao/layout.tsx`): a mesma checagem por requisição
   (`getViewer()` + `adminDemoAllowed`) mostra “não encontrada” como segunda defesa.
3. **Preflight:** `npm run preflight -- --target homologacao|producao` acusa erro se `MVF_ADMIN_DEMO`
   estiver ligado.
4. **Indexação:** a página não é indexada (`robots: noindex`).

O `/admin` real (saúde da integração Kiwify, protegido por papel do banco) **não mudou**.

## O que é simulado

| Item | Na demonstração | No futuro (backend) |
|---|---|---|
| Perfil (Administrador, Editor, Revisor, Moderador, Suporte) | Escolhido no menu. **Não é segurança.** | Papel em `user_roles`, verificado no servidor. |
| Salvar rascunho | Só memória; recarregar descarta. | Tabela de rascunhos com RLS. |
| “Aprovado” | Marcado por um perfil simulado. **Não é aprovação real.** | Registro de quem aprovou e quando. |
| “Publicado localmente” | Só nas prévias do painel. **Não vai para a Vercel nem para alunas.** | Publicação real por Server Action. |
| Exportar | Baixa JSON/CSV no navegador. | Igual, além do histórico no banco. |

Nenhum dado de alunas, vendas, acessos ou visualizações é exibido: esses indicadores aparecem como
“Aguardando integração”.

## Perfis e permissões

A matriz é a única existente (`src/lib/auth/permissions.ts`), com três permissões novas:

| Permissão | Papéis |
|---|---|
| `content:edit` | `admin`, `expert` |
| `content:review` | `admin`, `expert` |
| `content:publish` | `admin` |

| Perfil no painel | Papel no app | Pode |
|---|---|---|
| Administrador | `admin` (existe) | Editar, revisar e publicar. |
| Editor de conteúdo | **ainda não existe** | Editar e enviar para revisão. |
| Revisor | **ainda não existe** | Aprovar ou devolver. |
| Moderador | `moderator` (existe) | Nada de conteúdo (Comunidade fica para o 13B). |
| Suporte | `support` (existe) | Nada de conteúdo (Suporte fica para o 13B). |

“Editor de conteúdo” e “Revisor” são **conceitos** (`src/lib/admin/roles.ts`). Criá-los no banco
exige migration e decisão do operador (em aberto). Nenhum papel foi alterado no banco.

## Fluxo editorial

As mudanças de status estão em `src/lib/content/editorial.ts`:

```
Rascunho → Em revisão → Aprovado (demonstração) → Publicado localmente
   ↑            │  ↓ devolver        │ reabrir           │ despublicar
   └── Arquivado ← (de qualquer etapa) ──────────────────┘
```

| Transição | Permissão | Validação |
|---|---|---|
| Enviar para revisão | editar | Sem erros de estrutura. |
| Aprovar | revisar | Sem erros **e** completo. |
| Publicar localmente | publicar | Sem erros **e** completo. |
| Devolver, reabrir, arquivar ou restaurar | conforme a regra | — |

O que conta como “completo”:
- **Aula:** resumo, duração, e vídeo ou “Em breve”.
- **Produto:** tudo de `productGaps`.
- **Roteiro:** gancho, desenvolvimento, CTA, resumo, origem e **autorização de uso**.

Editar o conteúdo de algo que já estava em revisão ou aprovado faz o item **voltar a rascunho**.
O botão de cada transição fica desabilitado quando ela não é possível, e o motivo aparece logo
abaixo.

## O que cada tela faz

### Visão geral (`/gestao`)

- **Números do projeto:** 23 módulos, aulas oficiais e de exemplo, produtos, roteiros e agenda.
- **Pendências de conteúdo:** vindas dos validadores existentes (`catalog.gaps`, `productGaps`,
  agenda e canais de suporte).

### Cursos e aulas (`/gestao/cursos`)

- **Módulos:**
  - capas oficiais;
  - reordenar dentro do trilho;
  - frase de apoio, disponibilidade e “recomendado para” (perfis do onboarding);
  - prévia de quais aulas a aluna veria.
- **Aulas:**
  - **validação:** busca e filtros, criar e editar com `parseCatalogFile`, o mesmo validador do
    arquivo oficial e do CLI;
  - **vídeo:** só por **identificador** (Kiwify, YouTube, Vimeo ou arquivo próprio). URL é recusada;
  - **materiais:** só os oficiais, hoje nenhum;
  - **pré-requisitos:** escolhidos entre as aulas oficiais;
  - **prévia:** usa o `LessonPlayer` real.
- **Substituir aula de exemplo:**
  - a aula oficial usa o **mesmo ID** (o progresso e as tarefas do plano continuam);
  - nenhum texto do exemplo é copiado;
  - aliases existentes ficam como estão, e um alias nunca vira ID de aula.
- **Excluir:** antes de remover, o painel mostra onde a aula é usada (tarefas do plano,
  pré-requisitos, encontros, produtos, publicações, aliases) e pede confirmação explícita.

### Produtos NUMI (`/gestao/produtos`)

- **Oficiais:** editáveis. **Demonstrativos:** só consulta, porque o validador recusa preço,
  comissão, link, benefício ou a marca NUMI neles.
- **Validação:** usa o `parseProduct` existente, sem nenhum atalho.
- **Comercial:** preço exige data; comissão exige fonte e data; links precisam ser https.
- **Status:** rascunho e em revisão viram `approval` no arquivo. O “Creme Multifuncional 3 em 1”
  continua rascunho até ter o cadastro completo.
- **Prévia:** o card real do Marketplace (`ProductCard`) e um resumo do detalhe. Preço e comissão só
  aparecem com o produto aprovado.

### Roteiros e presets (`/gestao/roteiros`)

- **Estrutura:** contrato central `StudioScript` (`src/lib/studio/library.ts`). O **Animador lê dele**:
  roteiros da equipe com status “aprovado”, mais os exemplos do app. Não há biblioteca paralela.
- **Campos:** gancho, desenvolvimento, CTA, categoria, formato, idioma, duração (ou calculada pela
  fala), tags, produto relacionado, origem e autorização.
- **Recusados:** o selo “validado comercialmente” e roteiros sem autorização na hora de aprovar. Os
  100 roteiros de referência de terceiros não foram importados.
- **Prévia:** como o roteiro aparece no Animador, usando o gerador real de takes. A fala nunca é
  alterada.
- **Presets:** de personagem, câmera, iluminação, estilo e voz, agrupados e só para consulta. A
  edição de presets fica para depois.

### Revisar e exportar (`/gestao/alteracoes`)

- **Revisar:** alterações pendentes com antes × depois, por item. Dá para descartar um item ou tudo,
  sempre com confirmação.
- **Validar:** cada arquivo é validado com as regras oficiais antes de liberar o download.
- **Exportar:**

| Arquivo | Conteúdo | Importação |
|---|---|---|
| `catalogo-oficial.json` | Base + edições de módulos + aulas **aprovadas**. | `npm run catalog -- check arquivo.json` |
| `aulas-aprovadas.csv` | Colunas do modelo de aulas. | `npm run catalog -- import-csv aulas.csv` |
| `produtos-oficiais.json` / `produtos.csv` | Colunas do modelo de produtos; imagem aceita `caminho\|texto\|capa-oficial`. | `npm run products -- check` / `import` |
| `roteiros-oficiais.json` | Roteiros da equipe (todos os status). | Copiar para `src/content/` e rodar `npm test`. |
| `alteracoes-painel-AAAA-MM-DD.json` | Relatório completo, inclusive rascunhos. | Só para revisão humana. |

A mensagem de sucesso aparece **depois** que o arquivo é gerado.

## Como importar (procedimento)

1. Exporte e revise o arquivo e o relatório com a equipe.
2. Rode a **prévia** do CLI correspondente. Nada é gravado sem `--write`.
3. Confira conflitos: um valor oficial já cadastrado só muda com `--overwrite`.
4. Grave com `--write`, depois rode `npm test` e `npm run build`, e faça commit com autorização.

O painel nunca executa a importação.

## Limitações conhecidas

- **Prévias só no painel:** o catálogo das telas das alunas é carregado uma vez, a partir dos
  arquivos. Refletir as edições do painel nas telas da demo exigiria tornar o catálogo reativo, uma
  mudança estrutural arriscada. Por isso as prévias usam os mesmos componentes e as mesmas regras,
  mas ficam dentro do painel.
- **Memória:** tudo some ao recarregar (o navegador avisa se houver alterações pendentes).
- **Mídia:** não há upload de vídeo nem de imagem. Imagens precisam estar em `/public` e entram por
  caminho.
- **Fora desta etapa:** módulos de trilho e curso não são criados no painel (só editados), e a
  edição de presets fica para depois.
- **404 autenticado (do Prompt 12):** em build de produção **com sessão real**, ainda falta validar,
  sem deploy.

## Integração futura com o banco

- **Tabelas:**
  - `courses`, `rails`, `modules`, `lessons`, `materials`, `products`, `studio_scripts`, com o mesmo
    contrato dos tipos atuais;
  - `content_status` (status, autor, revisor, datas) e histórico de mudanças.
- **Escritas:** Server Actions com `authorizeMemberAction()` e `can(roles, "content:*")`, validação
  com os mesmos módulos puros (`parseCatalogFile`, `parseProduct`, `checkScript`) e função SQL com
  RLS. Nada é aceito vindo pronto do cliente.
- **Leitura:** as APIs `catalog`, `productCatalog` e `SCRIPT_LIBRARY` passam a ler do servidor,
  mantendo as mesmas assinaturas.
- **Painel em produção:** só depois disso, protegido por papel do banco, como o `/admin` atual. Até
  lá, `/gestao` continua 404 fora do desenvolvimento.
