# Estúdio IA: três geradores de TEXTO

> **Regra central:** o App MVF só escreve **texto**. Imagens, animações, voz e vídeos são criados
> **fora do app, no Google Flow** (ou em outra plataforma que a aluna escolher).
>
> O **DeepSeek** será, no futuro, apenas o **modelo de linguagem** que redige prompts e roteiros.
> Ele não gera imagem nem vídeo e não recebe arquivos de mídia.
>
> **Hoje nenhuma IA está conectada:** os resultados vêm de um modelo local, determinístico, e a tela
> sempre mostra “Demonstração · modelo local (sem IA)”.

## As três ferramentas

| Rota | Ferramenta | Entrada | Saída (texto) | Onde vira mídia |
|---|---|---|---|---|
| `/estudio-ia/personagem` | **Criar Personagem** | Características em 9 grupos, modo Básico/Avançado, “✎ LIVRE”, “Surpreenda-me”, “Tenho imagem de referência” | Prompt de imagem em inglês, JSON com os mesmos atributos, resumo da ficha em português e ficha salva | Google Flow (imagem) |
| `/estudio-ia/animar` | **Animar Personagem** | Ficha salva ou “Já tenho imagem pronta”, produto opcional, roteiro (biblioteca ou colado) em Gancho / Desenvolvimento / CTA, movimento, câmera, voz, ritmo, duração do take | Prompt geral, um card por take, “Copiar tudo” e teleprompter | Google Flow (vídeo e áudio) |
| `/estudio-ia/roteiros` | **Roteiros para Gravar Aparecendo** | Briefing do produto (nome, descrição e modo de uso obrigatórios), estilo, fala, local, tom, público, CTA | 10 roteiros com gancho, desenvolvimento, CTA, fala completa, como gravar e duração estimada | A aluna grava com o celular (sem Flow) |

A rota `/estudio-ia` mostra exatamente esses três cards, as fichas salvas e os roteiros salvos na
sessão. Fora do modo demo e da prévia autorizada, as quatro rotas mostram “Em breve”, uma decisão
feita no servidor (`DemoModule`).

### Jornadas

**Personagem (avatar):**
1. Em Criar Personagem, gere e copie o prompt.
2. No Google Flow, crie a imagem.
3. Volte ao app e toque em **Usar no Animador**. A ficha chega selecionada.
4. Escolha a fala e copie os prompts por take.
5. No Google Flow, gere os vídeos usando a mesma imagem como referência.

**Aparecer:**
1. Em Roteiros para Gravar Aparecendo, descreva o produto.
2. Receba os 10 roteiros.
3. Edite, favorite ou copie.
4. Grave com o celular.

O app não executa nenhuma etapa no Flow e não promete que o Flow produzirá exatamente o que o texto
descreve.

## Arquitetura

| Arquivo | Papel |
|---|---|
| `src/lib/studio/contracts.ts` | Tipos e a porta `TextGenerationProvider` (detalhes abaixo). |
| `src/lib/studio/presets.ts` | Presets originais MVF (rótulo em PT, trecho em EN) e o helper do “livre”. |
| `src/lib/studio/character.ts` | Prompt de imagem, realismo automático contextual, JSON, ficha e “Surpreenda-me”. |
| `src/lib/studio/animation.ts` | Divisão em takes **sem alterar a fala**, separação de roteiro colado, prompts por take, “Copiar tudo”. |
| `src/lib/studio/recording-scripts.ts` | Dez ângulos, ajuste ao que foi informado, variação, edição e validação de saída. |
| `src/lib/studio/claims.ts` | Avisos sobre alegações de saúde e beleza, urgência e números de venda. |
| `src/lib/studio/provider.ts` | `localDemoTextGenerator` e `getTextProvider()` (remoto bloqueado). |
| `src/lib/studio/drafts.ts` | Tipos dos rascunhos por ferramenta. |
| `src/demo/studio-scripts.ts` | Biblioteca do Animador, derivada dos modelos de exemplo do MVF. |
| `src/components/estudio/*` | Painel, as três ferramentas e os campos compartilhados. |

`contracts.ts` define estes tipos:
- `CharacterBrief` e `CharacterPromptOutput` (`visualPrompt`, `structuredAttributes`, `language`, `notes`);
- `AnimationBrief` e `AnimationPromptOutput` (`fullPrompt`, `takes[]`, `teleprompter`, `exactDialogue`, `continuityNotes`);
- `RecordingScriptBrief` e `RecordingScriptsOutput` (exatamente `scripts[10]`, cada um com `angle`, `hook`, `body`, `cta`, `fullSpeech`, `filmingDirections` e `estimatedSeconds`);
- `TextGenerationProvider`.

O estado da demo fica no `DemoProvider`, em memória:
- `studioCharacters`: até 20 fichas;
- `studioDrafts`: formulário e último resultado de cada ferramenta, sincronizados com atraso de
  350 ms e ao sair da tela;
- `studioSeed`: semente consumida uma vez.

Tudo some ao recarregar a página ou reiniciar a demo, e nada disso entra na restauração opcional
(D59).

Conexões entre telas:
- **Virais → Estúdio:** abre Animar (formato avatar) ou Roteiros (outros formatos), com o banner
  “Inspirado em”. O gancho do viral aparece só como referência e nunca vira fala sozinho.
- **Marketplace → Roteiros:** preenche nome e categoria. O produto é demonstrativo; a aluna descreve
  as características reais.
- **Ficha → Animador:** a ficha chega selecionada, com a aparência em inglês editável.

## Regras garantidas por teste

1. **Fala intacta:** a concatenação das falas dos takes é igual, token a token, ao texto aprovado.
   Isso vale em todas as combinações de ritmo e duração.
   - O corte acontece entre frases.
   - Uma frase só é dividida (em vírgula e, por último, em palavras) se não couber em um take, e o
     app avisa.
   - Nada é truncado, traduzido ou reescrito.
   - Direção em inglês, fala no idioma escolhido.
2. **Fala no take:** ocupa no máximo 80% da duração do take, que é de 4, 6 ou 8 s. São estimativas,
   e o app pede para conferir no Flow o que o plano e o modelo oferecem.
3. **Regenerar só muda a direção:** trocar câmera, voz ou atmosfera e regenerar não muda os diálogos.
4. **JSON coerente:** é válido e usa os mesmos valores do prompt.
   - O LIVRE usa o texto da aluna; LIVRE vazio é erro.
   - Idade adulta obrigatória (18 a 80).
5. **Imagem de referência:** o texto pede para preservar a identidade, sem descrever traços e sem
   alegar análise. Há aviso de consentimento.
6. **Dez roteiros de verdade:** sempre dez, com ângulos e ganchos diferentes e sobreposição de
   vocabulário limitada.
   - Os ângulos dependem dos fatos: comparação e diferencial só aparecem com diferencial ou
     benefício informado; “cuidados” só com limitações.
   - O ângulo do estilo escolhido vem primeiro.
7. **Nada inventado nos roteiros:** nenhuma alegação, preço, desconto, escassez ou número de venda.
   - A oferta só entra com a confirmação “verdadeira e atual”.
   - Experiência pessoal fica entre colchetes, para a aluna completar.
8. **Isolamento:** nenhuma chamada de rede, `process.env`, `NEXT_PUBLIC_*` ou SDK de mídia em
   `src/lib/studio` e `src/components/estudio`.
   - `getTextProvider("deepseek")` devolve o local.
   - Fichas e rascunhos ficam fora do snapshot.

## Referências de terceiros

Os documentos do gerador MVM serviram **só como referência funcional** (campos, “livre”,
realismo automático, takes, teleprompter). Código, textos, perfis de voz, CTA e os 100 roteiros
**não** foram copiados.

Os presets, o realismo, os moldes de roteiro e a biblioteca são originais do MVF. A biblioteca
real só receberá roteiros próprios ou licenciados da equipe NUMI, no formato de `LibraryScript`
com `source: "validado"`.

## Integração futura: DeepSeek como API de LINGUAGEM, no servidor

Fazer **depois** do MVP mock aprovado:

1. **Provedor no servidor:** `DeepSeekTextProvider` como módulo `server-only`, chamado só por Server
   Action ou Route Handler autenticados. Nunca chamar pelo navegador.
2. **Configuração:**
   - chave em variável de ambiente privada, nunca `NEXT_PUBLIC_*`;
   - nome do modelo e URL base por ambiente, conferidos na documentação oficial no dia da integração;
   - entrada no `preflight`.
3. **Autorização:** `authorizeMemberAction()` com acesso ativo (compra) em toda chamada.
4. **Limites:**
   - por aluna e por dia;
   - orçamento mensal com desligamento automático;
   - tamanho máximo de entrada;
   - timeout de cerca de 30 s.
5. **Saída validada:**
   - pedir JSON e validar com `validateRecordingScriptsOutput` (exatamente 10) e equivalentes;
   - no Animador, checar `dialoguePreserved`: se a IA alterar a fala, a resposta é descartada;
   - passar `findClaims` na saída.
6. **Falhas:** cair no modelo local e avisar isso na tela. Nunca fingir que a IA respondeu.
7. **Logs:** sem e-mail, briefing completo ou texto gerado; só métricas (tokens, latência, erro).
8. **Reescrita da fala:** só sob pedido explícito, com prévia lado a lado e confirmação.
9. **Escopo:** sem SDK de imagem, vídeo, áudio ou embeddings. O DeepSeek recebe e devolve só texto.
10. **Rótulos:** trocar o rótulo “modelo local” pelo do provedor real só quando ele estiver de fato
    respondendo.
