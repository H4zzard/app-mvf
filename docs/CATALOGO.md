# Catálogo de conteúdo (cursos, módulos, aulas e materiais)

O catálogo é a **fonte única** do que aparece na área de aulas, no checklist e nas recomendações. A
estrutura já está pronta para virar tabelas no banco e telas no painel admin; hoje os dados ficam
num arquivo versionado.

| Camada | Arquivo | O que é |
|---|---|---|
| **Oficial** | `src/content/catalogo-oficial.json` | O que a equipe fornece ou aprova. Validado em todo teste e build. |
| **Exemplo** | `src/demo/catalog-demo.ts` | 19 aulas de exemplo que preenchem módulos ainda sem aula oficial. Sempre marcadas “Aula de exemplo”. |
| **Acesso** | `src/lib/catalog/` | Validação (`schema.ts`), montagem e consultas (`build.ts`), player (`media.ts`), recomendações (`profile-tags.ts`), CSV (`csv.ts`). |

## Estado atual (21/11/2026)

**Oficial:**
- os 23 módulos, com título e capa impressos nos pôsteres de `public/area-membros/`;
- a linha de apoio de cada módulo, só quando está impressa na capa.

**A confirmar pela equipe:**
- nome do curso (“Formação MVF”);
- os 6 trilhos (agrupamento);
- a ordem dos módulos;
- os perfis recomendados de cada módulo.

**Exemplo:** todas as 19 aulas, seus textos e os 20 materiais. Nenhuma aula tem vídeo.

**Faltando:**
- aulas oficiais dos 23 módulos;
- vídeos, durações e materiais reais.

Veja tudo com:
```bash
npm run catalog -- check
```

## Regras que o validador garante
- **IDs estáveis:** `m-…` para módulo, `l-…` para aula, `mat-…` para material, letras minúsculas,
  números e hífen. **Nunca renomeie um ID publicado**: o progresso das alunas depende dele.
- **Referências:** todo módulo aponta para um trilho existente, toda aula para um módulo existente e
  todo pré-requisito ou material para um item existente.
- **Capas** são caminhos em `/public` (ex.: `/area-membros/x.png`); o teste confere se o arquivo existe.
- **Nenhuma URL de vídeo ou arquivo no catálogo.** Guarde só o identificador. A URL será gerada no
  servidor, para quem tem acesso (link assinado). Links colados são recusados.
- **Origem:** o arquivo oficial só aceita `"origin": "oficial"`.
- **Disponibilidade:**
  - `disponivel`: aparece e pode ser assistida;
  - `em_breve`: aparece com estado “em breve”;
  - `oculto`: não aparece (despublicar).

## Como as aulas oficiais substituem as de exemplo
- Quando um módulo recebe **qualquer** aula oficial, as aulas de exemplo daquele módulo saem.
- **Compatibilidade com o checklist e o progresso:** se uma aula oficial ocupa o lugar de uma de
  exemplo (ex.: `l-roteiro`), registre o alias.
  - No JSON: `"lessonAliases": { "l-roteiro": "l-roteiro-oficial-1" }`.
  - Na planilha: a coluna `substitui_id`.
  - O plano e o progresso antigos passam a apontar para a aula nova, e o endereço antigo
    `/aulas/l-roteiro` redireciona para o novo.

## Como a equipe preenche (planilha)
1. Copie `docs/catalogo/modelo-aulas.csv` para o Google Sheets.
2. Apague a linha `l-exemplo-1` e preencha uma linha por aula:

| Coluna | Obrigatório | Exemplo / regra |
|---|---|---|
| `id` | sim | `l-primeiros-passos-1` (estável) |
| `modulo_id` | sim | um dos `m-…` de `catalogo-oficial.json` |
| `ordem` | sim | 1, 2, 3… dentro do módulo |
| `titulo` | sim | título oficial da aula |
| `duracao_min` | não | minutos; vazio = “duração a definir” |
| `nivel` | não | `fundamento`, `intermediario` ou `avancado` |
| `tags` | não | separadas por `;` (busca) |
| `prerequisitos` | não | IDs de aula separados por `;` |
| `resumo`, `pratica` | não | textos curtos |
| `video_provedor` | não | `kiwify`, `youtube`, `vimeo`, `outro` ou `proprio`; vazio = sem vídeo |
| `video_ref` | se tiver provedor | **identificador** do vídeo (nunca o link) |
| `materiais` | não | IDs `mat-…` separados por `;` (materiais precisam existir no JSON) |
| `disponibilidade` | não | `disponivel`, `em_breve` (padrão) ou `oculto` |
| `substitui_id` | não | ID da aula de exemplo que esta substitui (ex.: `l-roteiro`) |

3. Exporte como CSV e rode:
   ```bash
   npm run catalog -- import-csv aulas.csv           # prévia: valida e mostra pendências
   npm run catalog -- import-csv aulas.csv --write   # grava no catalogo-oficial.json
   npm test && npm run build
   ```

Módulos, trilhos e materiais oficiais são editados no próprio `catalogo-oficial.json` (mesmos campos
dos tipos em `src/types/catalog.ts`). Depois de editar, rode `npm run catalog -- check`.

## O que precisamos receber da equipe
1. **Lista oficial de aulas por módulo:** título, ordem, duração (se souber) e nível.
2. **Vídeos:** onde estão hospedados (Kiwify, YouTube não listado, Vimeo ou arquivo próprio) e o
   **identificador** de cada um. Nunca extraímos vídeos da Kiwify automaticamente.
3. **Materiais:** os arquivos (PDF, planilhas, modelos) e a aula a que pertencem.
4. **Confirmações:** nome do curso, agrupamento em trilhos, ordem dos módulos e para quais perfis
   cada módulo é recomendado.
5. **Equivalências:** quais aulas oficiais substituem as aulas de exemplo ligadas às tarefas do
   checklist. São 19 tarefas, listadas pelo `catalog -- check`.

## Recomendações (onboarding → módulos)
- `profileTags(perfil)` transforma as respostas em marcadores:
  - momento: `iniciante` ou `experiente`;
  - formato: `aparecer`, `sem_aparecer`, `avatar_ia`, `maos_produto`, `narracao` ou `explorar`;
  - bloqueio principal: `bloqueio_*`.
- Cada módulo declara `recommendedFor`:
  - coincidência com o bloqueio principal: +100;
  - outro marcador coincidente: +10;
  - `todos`: +1;
  - empates seguem a ordem do catálogo.
- Ajustar recomendação é editar dados, sem mexer em código.

## Preparado para o painel admin (próximas etapas)
Cada operação futura do painel corresponde a um campo daqui:

| Operação | Campo |
|---|---|
| Criar e editar módulos | `modules` |
| Reordenar | `order` |
| Vincular vídeo | `media` |
| Materiais | `materials` + `materialIds` |
| Recomendações | `recommendedFor` |
| Publicar ou ocultar | `availability` |

A troca da origem (arquivo → banco) acontece em `src/lib/catalog/index.ts`; as telas usam só a API
`catalog`.
