# Meu Plano 2.0: jornada interativa

> **Ideia central:** a aluna abre Meu Plano, vê **o que fazer agora**, recebe **uma ação por tela**
> (com print e resultado esperado), marca “Concluí esta etapa” e segue para a próxima.
> As fases e microetapas atuais são uma **proposta técnica preliminar**, baseada na reunião de
> 23/11/2026. **Não são a metodologia oficial**: precisam da confirmação da expert.

## Como está organizado

| Camada | Arquivo | Papel |
|---|---|---|
| Personalização (sem mudança) | `src/lib/personalization/engine.ts` + `src/demo/task-catalog.ts` | Decide **quais atividades** entram no plano a partir do onboarding. |
| Jornada (nova) | `src/demo/journey-catalog.ts` | Fases e microetapas (proposta), ligadas às atividades por `owner`. |
| Motor da jornada | `src/lib/journey/journey.ts` (puro) | Estados, etapa atual, progresso, concluir/desfazer/escolher, replanejamento, validação. |
| Prints | `src/content/jornada-prints.json` + `public/jornada/` | Capturas reais cadastradas pela equipe. |
| Telas | `src/components/plan/plan-view.tsx` (mapa) e `journey-step.tsx` (execução) | `/meu-plano` e `/meu-plano/etapa/[id]`. |

**Não existe segundo motor nem segunda fonte de respostas:** a jornada lê o plano já gerado e o
mesmo `statusMap` do `PlanProvider`.

### Fases (proposta)

6 fases e 57 microetapas no catálogo. Cada aluna vê só as que se aplicam a ela (cerca de 30 a 42).

| Fase | O que reúne |
|---|---|
| 1. Preparar sua conta | Boas-vindas, decisão “já tenho conta?”, instalar e criar (se precisar), TikTok Shop, requisitos (obrigatório), perfil (abrir edição, foto de rosto **ou** avatar, nome, bio, conferir) e conta pronta. |
| 2. Preparar sua presença | Confirmar o jeito de gravar e o núcleo de cada formato (câmera, avatar, mãos, narração, explorar). |
| 3. Escolher os produtos | Aula, acesso NUMI, listar o que tem em casa, ver os mais vendidos, comparar com o checklist, escolher até 3, preparar o primeiro, e alegações (obrigatório). |
| 4. Preparar o primeiro conteúdo | Formato, gancho, roteiro (com atalho para o Estúdio) e preparar, gravar e revisar, conforme o formato. |
| 5. Publicar | Checklist, conferir requisitos, legenda, publicar e confirmar (autorrelato). |
| 6. Criar sua rotina | Leitura de sinais, formatos, calendário (gravar em um dia e agendar), horários e lote semanal. |

## Regras de progressão

O estado de cada etapa é calculado pelo motor, a cada mudança:

| Estado | Quando |
|---|---|
| **Concluída** | Marcada pela aluna (ou a atividade antiga correspondente já estava concluída). |
| **Atual** (“Você está aqui”) | A primeira etapa aplicável, pendente e liberada, na ordem do catálogo. Só existe uma. |
| **Disponível** | Pendente e liberada. Aulas costumam ficar sempre liberadas. |
| **Bloqueada** | Tem pré-requisito pendente. A tela mostra “Libera depois de: …” com links. |
| **Não se aplica** | Fora do perfil da aluna. Mostra o motivo, nunca conta como concluída, e fica recolhida no mapa (“N etapas puladas”). |

- **Decisões** (ex.: já tem conta?) gravam um sinalizador (`t-j-flag-…`) que muda o caminho. A
  escolha pode ser trocada depois.
- **Desfazer** é possível em etapas concluídas. Se a atividade antiga estava concluída, ela volta a
  pendente e as outras microetapas dela ficam gravadas como concluídas.

## Progresso, XP e compatibilidade

- **Execução × aprendizado:** ações, decisões e confirmações contam como execução; etapas de aula
  contam como aprendizado. Os dois aparecem separados no mapa.
- **XP sem duplicação:** microetapas não dão XP sozinhas. Quando **todas** as microetapas aplicáveis
  de uma atividade antiga terminam, a atividade é marcada concluída e a regra existente
  (`computeXp`) conta **uma vez**. Concluir de novo não muda nada; desfazer tira o XP, e refazer
  devolve o mesmo valor.
- **Progresso histórico:**
  - atividade antiga concluída no checklist anterior faz as microetapas dela aparecerem concluídas;
  - nada é apagado ou renomeado;
  - os cenários da demo e o progresso real continuam válidos.
- **IDs:**
  - microetapas novas usam `t-j-…`;
  - atividades que viram uma única etapa mantêm o próprio ID (ex.: `t-aula-produto`);
  - todos seguem `^t-[a-z0-9-]{1,60}$`, o formato da tabela `user_task_progress`;
  - a Server Action do plano aceita esses IDs, então alunas reais gravam progresso **sem migration**;
  - replanejar (`apply_onboarding`) não apaga progresso.
- **Aulas × ações:**
  - concluir uma aula na biblioteca conclui **só** a etapa de aula correspondente (regra antiga,
    mantida);
  - nenhuma ação prática tem aula como gatilho, e há teste para isso;
  - assistir a uma aula de apoio não marca a ação.

## Personalização

A aplicabilidade usa o mesmo `deriveContext` do motor:

| Perfil | O que muda na jornada |
|---|---|
| Sem conta | Instalar e criar aparecem. |
| Com conta | A criação é pulada, com o motivo “Você já tem conta”. A decisão na jornada vence o onboarding. |
| Não aparece | Foto de avatar (atalho para o Estúdio), sem etapas de câmera, roteiro e gravação no Animador ou no Flow. |
| Aparece | Foto de rosto, câmera, demonstração e Roteiros para gravar. |
| Já vende | A configuração da conta sai do plano (pelo motor) e entra a revisão dos vídeos anteriores. |

**Replanejamento:** ao ajustar as respostas, a jornada é recalculada. Conclusões que continuam
válidas ficam; etapas que saíram não aparecem como concluídas, mas o registro fica guardado e volta
se o perfil voltar (`replanSummary`).

**Novo onboarding (futuro):** o contrato é o mesmo `OnboardingProfile` → `buildPlan` →
`buildJourney`. O onboarding em vídeo só precisa entregar as mesmas respostas.

## Como cadastrar prints

1. **Captura:** feita pela equipe, no celular, com a interface atual do app mostrado. Formato
   vertical (9:19,5), largura entre 720 e 1080 px, `.webp` (ou `.png`/`.jpg`), até 400 KB, sem
   dados pessoais visíveis.
2. **Arquivo:** salvar em `public/jornada/<id-da-etapa>-<ordem>.webp`.
3. **Manifesto:** adicionar em `src/content/jornada-prints.json`:

   ```json
   { "stepId": "t-j-perfil-abrir", "order": 1, "src": "/jornada/t-j-perfil-abrir-1.webp",
     "alt": "Tela do perfil com o botão Editar perfil", "caption": "Toque em Editar perfil",
     "screen": "TikTok · Perfil", "capturedAt": "2026-11-24", "tapHint": { "x": 50, "y": 30 } }
   ```

   `tapHint` é opcional: indica onde tocar, em porcentagem da imagem.
4. **Validação:** rode `npm test`. O validador recusa URL externa, `alt` curto, etapa inexistente e
   ordem repetida.

Sem print, a etapa mostra “Print desta etapa pendente de cadastro”. Nenhuma imagem genérica é usada
no lugar.

## Como escrever e cadastrar microetapas

- **Forma:** uma ação por tela. O título é imperativo e curto (até 60 caracteres); a instrução diz
  onde tocar e o quê (até 220); o resultado esperado é como a aluna sabe que terminou.
- **Tamanho:** não divida artificialmente. Se a ação é simples, ela fica em uma etapa só.
- **Conteúdo proibido:** métricas (CTR, conversão, estoque), valores, garantias e regras do TikTok
  sem confirmação. Procedimentos de app externo levam `procedureReview: true`.
- **Modelo de cadastro:** `docs/catalogo/modelo-microetapas.csv`. A linha de exemplo não é
  procedimento oficial. Hoje quem programa converte a planilha para `src/demo/journey-catalog.ts`; o
  painel fará isso no futuro.
- **Validação automática** (`checkJourneyCatalog`, roda no `npm test`):
  - IDs `t-…` únicos;
  - pré-requisitos só para etapas **anteriores**;
  - aulas existentes no catálogo;
  - atalhos para rotas reais;
  - **toda atividade do motor com ao menos uma etapa**;
  - nada de números ou garantias.
- **IDs:** nunca renomear um ID existente. Para trocar o conteúdo, mantenha o ID; para retirar,
  deixe a etapa sem aplicabilidade em vez de apagar o ID.

## Painel administrativo (futuro)

O contrato tipado (`JourneyStep`, `StepPrint`) foi feito para virar tabela. O painel `/gestao`
poderá editar títulos, instruções, prints e aulas de apoio, com o mesmo validador. Condições de
aplicabilidade continuarão em código revisado até haver uma linguagem simples para elas.

## Depende de confirmação da expert

- As 6 fases e a ordem.
- Todos os procedimentos do TikTok: instalar, criar conta, editar perfil, publicar.
- Modelos de bio genérica e prompts de avatar citados na reunião.
- O checklist de escolha de produto. Os critérios numéricos da reunião **não** foram usados.
- Quais aulas oficiais apoiam cada etapa. Hoje as aulas são de exemplo, e a etapa do perfil está sem
  aula.
- Os prints reais de cada etapa.
