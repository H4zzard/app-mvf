# Motor de personalização (v1.0.0)

Perfil do onboarding → plano de ação. **Determinístico**: sem IA, sem rede, sem relógio. A mesma
entrada gera sempre o mesmo plano. Uma IA futura poderá trabalhar sobre os mesmos dados e regras.

| Peça | Arquivo |
|---|---|
| Perguntas, opções, condições e validação | `src/config/onboarding-questions.ts` |
| Contexto derivado do perfil (núcleos, flags) | `src/lib/personalization/context.ts` |
| Catálogo de atividades + regras de inclusão (conteúdo **demo**) | `src/demo/task-catalog.ts` |
| Motor (seleção, dependências, dias, etapas) | `src/lib/personalization/engine.ts` |
| Prévia de mudanças ao ajustar respostas | `src/lib/personalization/diff.ts` |
| Testes | `*.test.ts` ao lado de cada módulo (`npm test`) |
| Imprimir os 5 planos de exemplo | `npm run plans:examples` |

## Pipeline

1. **Contexto**: `aparecer = sim` → núcleo `camera`. Caso contrário, os formatos escolhidos
   (até 2) viram núcleos `avatar`, `maos`, `narracao`, ou `explorar` (exclusivo). Formato vazio
   cai em `explorar` (nunca plano vazio).
2. **Seleção**: cada atividade do catálogo tem `include(ctx)`. A ordem do catálogo é a ordem global.
3. **Dependências**: só ficam pré-requisitos presentes no plano **e anteriores** → sem referências
   inválidas nem ciclos. Pré-requisitos recomendam ordem e **não bloqueiam**.
4. **Dias sugeridos**: preenche cada dia até o tempo diário (15/30/60/90). Uma atividade maior
   que o dia não é fracionada: ocupa dias inteiros (`daySuggestion`–`dayEnd`, “continuação”).
   A aula de métricas sempre começa em um dia novo depois de publicar.
5. **Etapas**: até 6 modelos fixos (Preparação, Perfil e produto, Formato, Produção, Publicação,
   Análise). Só entram etapas com atividades (4–6).

## Regras de composição

| Condição | Efeito |
|---|---|
| Todas | Base: boas-vindas, fundamentos, **elegibilidade** (conta × venda), escolher produto, **alegações e diretrizes**, roteiro, produzir, checklist, publicar, métricas, próximos vídeos. |
| Aparecer = sim | Câmera: preparação para câmera, teste de 30 s, demonstração de produto. Sem avatar. |
| Avatar de IA | Personagem, ficha, consistência/prompt, variações, Google Flow (ferramenta externa — o app não gera vídeo). |
| Avatar + nunca usou IA | + “Primeiros passos com ferramentas de IA”. |
| Mãos e produto | Enquadramento/luz, close, 3 takes de teste, edição simples. Nunca exige rosto. |
| Narração e imagens | Narração, sequência visual, edição simples. |
| Dois formatos | Une os núcleos; aulas comuns (fundamentos, roteiro, edição) aparecem **uma vez**. |
| Talvez / Quero explorar | Comparar formatos + escolher o primeiro experimento + edição simples. “Talvez” com formato escolhido começa sem aparecer. |
| Conta “não” / “não sei” | + checagem da conta antes de publicar. |
| NUMI “não” / “não sei” | + confirmar acesso a produtos/links antes de escolher produto e publicar. Sem inventar comissão. |
| Já vendeu | Boas-vindas, fundamentos e aula de produto ficam **opcionais** (exceto se a dificuldade for justamente essa); + revisar vídeos anteriores; sem ajuste de perfil. **Elegibilidade e alegações nunca são opcionais.** |
| Objetivo consistência | + reservar horários + lote de 3 vídeos. Dificuldade “organização” também inclui os horários. |
| Objetivo melhorar resultados | + revisar vídeos anteriores. |
| Dificuldade (gravar, roteiros, editar, produto, TikTok Shop) | Muda as justificativas; “editar” inclui a aula de edição em qualquer formato. |
| Equipamento | Dicas no plano (sem prometer compatibilidade do Google Flow em celular). |
| Próximo passo | Em andamento → primeira obrigatória pendente com pré-requisitos cumpridos → primeira obrigatória → opcional. |

## Os 5 perfis obrigatórios

Valores completos em `src/demo/example-profiles.ts`.

| Perfil | Atividades | Dias | O que muda e por quê |
|---|---|---|---|
| 1 · Iniciante, avatar, 30 min, celular, conta não pronta | 21 | 22 | Núcleo de avatar + IA básica (nunca usou IA) + checagem da conta. Dica sobre os requisitos do Google Flow, porque ela usa só o celular. |
| 2 · Iniciante, mãos/produto, 15 min, conta pronta | 18 | 35 | Núcleo de mãos + edição; sem câmera e sem avatar; sem checagem de conta. 15 min/dia distribui por mais dias, e as atividades longas viram continuação. |
| 3 · Aparece, já vendeu, 60 min, consistência | 19 | 12 | Núcleo de câmera sem avatar. Fundamentos opcionais, mas elegibilidade e alegações seguem obrigatórias. Entram revisar vídeos, horários e lote semanal. |
| 4 · Indecisa, explorar, 30 min, NUMI “não sei” | 19 | 20 | Comparar formatos + experimento, sem núcleo fixo. Confirmar acesso NUMI e checagem de conta. A justificativa de publicar deixa claro que comissão não é garantida. |
| 5 · Avatar + mãos, 90+ min | 23 | 9 | Os dois núcleos, sem duplicar fundamentos, roteiro e edição. Sem IA básica (usa IA com frequência). 90 min/dia concentra o plano. |

## Replanejamento

O progresso é guardado por **ID estável** (`statusMap`) e nunca por índice ou título. Ajustar
respostas regenera o plano e **mantém o `statusMap` inteiro**: uma atividade que sai do plano
guarda seu status na sessão e volta com ele se for selecionada de novo. Antes de aplicar, a aluna
vê uma prévia (`diffPlans`: entram, saem, concluídas mantidas/guardadas/recuperadas) e confirma.
O primeiro plano criado a partir da trilha de exemplo começa sem o progresso fictício do exemplo.
