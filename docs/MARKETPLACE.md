# Marketplace NUMI

> **Regra central:** o Marketplace mostra **só o que a equipe cadastrou e confirmou**. Preço, comissão,
> afiliação, links e benefícios só aparecem quando o produto é **oficial e aprovado**, e o dado tem
> fonte e data de verificação. Em qualquer outro caso, a tela mostra **“A confirmar”**.

## Situação dos dados (22/11/2026)

| Origem | Produtos | O que existe |
|---|---|---|
| **Oficial** (`src/content/produtos-oficiais.json`) | 1: *Creme Multifuncional 3 em 1* (NUMI) | Nome e a capa oficial do módulo “NUMI: o produto exclusivo”, rotulada como arte da área de membros. Cadastro em `rascunho`: o resto está em branco. |
| **Demonstrativo** (`src/demo/products.ts`) | 6 (marca “Exemplo”) | Textos neutros para treinar. Sem foto, preço, comissão, link ou benefício (o schema recusa). |
| **Não informado** | — | Fotos de catálogo, descrição, modo de uso, características, benefícios aprovados, restrições, preço, comissão, condições e link de afiliação, demais produtos NUMI e marcas parceiras. |

Para ver as pendências por produto, rode `npm run products -- check`.

## Telas

| Rota | Conteúdo |
|---|---|
| `/marketplace` | Abas **Explorar · Salvos · Meus produtos**. Explorar: busca, categorias, filtros (origem e disponibilidade), Recomendados (pelo onboarding), Novidades, **Produtos NUMI** (oficiais), **Para treinar** (demonstrativos) e **Marcas parceiras — em breve**. |
| `/marketplace/[productId]` | Galeria, descrição, modo de uso, características, benefícios aprovados, restrições, condições comerciais, materiais, aulas relacionadas e “Preparar divulgação no Estúdio IA”. Seções sem dado não aparecem; os campos comerciais mostram “A confirmar”. ID inexistente: página “não encontrada”. |

As duas rotas passam pelo `DemoModule`: demo local ou prévia autorizada no servidor. Alunas reais veem
“Em breve”.

**Salvos** (coração) e **Meus produtos** (“Quero divulgar”) são listas separadas, em memória.
“Meus produtos” traz Criar roteiro, Animar, Ver detalhes, os materiais e Remover da lista. A interface
diz que **a lista não faz a afiliação no TikTok Shop**.

## Integração com o Estúdio IA

`src/lib/products/studio-bridge.ts`:

- **Criar roteiro**: abre *Roteiros para Gravar Aparecendo* com nome, categoria, descrição (+
  “Características: …”), modo de uso, restrições (como cuidados) e, **só se aprovado**, os benefícios.
  - O estilo escolhido no detalhe vem junto.
  - Tudo continua editável, e a geração das 10 abordagens é a mesma de antes.
  - O diferencial nunca é preenchido, porque é afirmação comparativa e só a aluna escreve.
- **Enviar ao Animador**: preenche só o nome e as características (até 300 caracteres).
  - A ficha escolhida e a fala não mudam.
  - Se a fala não citar o produto, aparece um aviso, sem reescrever nada.
- **Nunca** vai para o Estúdio: preço, comissão, fonte, link ou condição de afiliação.
- **Sem cortes:** itens que não cabem nos limites do Estúdio ficam de fora inteiros e o app avisa.
  Nenhuma frase é cortada.
- Os chips de produto do Animador e dos Roteiros vêm do mesmo `productCatalog`, sem os indisponíveis.

## Recomendações

`recommend.ts` usa as respostas do onboarding:
- quer aparecer;
- formatos (mãos, avatar, narração);
- nível de experiência;
- acesso ao NUMI.

Só entra produto que combina com o jeito de gravar da aluna, ou o NUMI quando ela diz ter acesso. Para
iniciantes, os cadastros mais completos pesam mais.

Nunca usa preço, comissão ou promessa de venda. Indisponível e “em breve” não entram. Sem onboarding,
aparece um convite para respondê-lo.

## Estrutura de dados (`src/lib/products/types.ts`)

| Campo | Regra |
|---|---|
| `id` | Estável, `minúsculas-e-hífens`. Nunca renomear (Salvos e Meus produtos dependem dele). |
| `brand`, `name`, `category` | `category` pode ser `null` (“Categoria a confirmar”). |
| `origin` | `oficial` ou `demonstrativo`. |
| `approval` | `rascunho`, `em_revisao` ou `aprovado`. |
| `availability` | `disponivel`, `em_breve`, `indisponivel` ou `a_confirmar`. |
| `isNew` | Destaque em “Novidades”. |
| `images[]` | Caminho local em `/public`, com `alt` obrigatório. `kind`: `foto` ou `capa-oficial`. |
| `shortDescription`, `description`, `howToUse` | Até 600 caracteres, o mesmo limite do Estúdio. |
| `characteristics[]`, `approvedBenefits[]`, `restrictions[]` | Até 12 itens de 200 caracteres. |
| `price` | `{ amount, currency: "BRL", verifiedAt }`. |
| `commission` | `{ value, type: percentual \| valor_fixo, source, verifiedAt }`. Sem fonte ou data, o arquivo é recusado. |
| `affiliation` | `{ status, conditions, affiliateUrl }`. |
| `productUrl` | Somente `https`. |
| `materialIds[]`, `lessonIds[]` | Conferidos pelo CLI contra a Central de Materiais e o catálogo de aulas. |
| `contentTags[]`, `formats[]` | Valores fixos (ver `schema.ts`). |
| `review[]` | Notas internas, não exibidas. |

## Como a equipe preenche

1. Copie `docs/catalogo/modelo-produtos.csv` para o Google Sheets (uma linha por produto).
   - Listas são separadas por `;`.
   - Imagens no formato `caminho|texto alternativo`.
2. Coloque as fotos em `public/produtos/`.
3. Exporte o CSV e rode a **prévia**: `npm run products -- import produtos.csv`.
4. Confira os novos, os atualizados e os **conflitos**. Um conflito é um valor oficial já cadastrado
   que mudaria; ele não é aplicado.
5. Grave com `--write`. Para aplicar conflitos revisados, use `--write --overwrite`.
6. Só depois da revisão da equipe, marque `aprovacao = aprovado`.
7. Rode `npm test` e `npm run build`.

Célula vazia **nunca apaga** um dado existente. A importação também aceita JSON (`{ "products": [...] }`).

## Integração real (próximas fases, sem implementar agora)

- **Banco/painel admin:**
  - tabela de produtos com o mesmo contrato e RLS de leitura para alunas ativas;
  - escrita só por papel de equipe;
  - histórico de alterações de preço e comissão;
  - a API `productCatalog` passa a ler do servidor.
- **Meus produtos/Salvos persistidos:** Server Action + função SQL, como o plano (nunca localStorage).
- **TikTok Shop:**
  - links oficiais e comissões só por fonte verificada, com data;
  - nenhuma integração externa direta pelo navegador.
- **Marcas parceiras:** mesmo contrato, com `brand` próprio, aparecendo só com parceria confirmada.
