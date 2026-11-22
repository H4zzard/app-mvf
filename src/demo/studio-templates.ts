/**
 * Modelos de estrutura de roteiro do Estúdio IA.
 *
 * Os itens abaixo são EXEMPLOS (`source: "exemplo"`). Roteiros próprios ou
 * autorizados da equipe entram por `src/content/roteiros-oficiais.json`
 * (contrato em src/lib/studio/library.ts; fluxo em docs/PAINEL_ADMIN.md).
 * `{produto}` é substituído pelo nome informado no formulário.
 */

export interface TemplateBeat {
  /** Nome curto da parte do roteiro. */
  label: { pt: string; en: string };
  /** O que aparece em cena. */
  visual: { pt: string; en: string };
  /** Fala/narração sugerida. */
  line: { pt: string; en: string };
}

export interface ScriptTemplate {
  id: string;
  title: { pt: string; en: string };
  summary: string;
  beats: TemplateBeat[];
  source: "exemplo" | "validado";
}

export const STUDIO_TEMPLATES: ScriptTemplate[] = [
  {
    id: "tpl-gancho-demo-cta",
    title: { pt: "Gancho → demonstração → convite", en: "Hook → demo → invite" },
    summary: "A estrutura básica: chama atenção, mostra o uso e convida para a ação.",
    source: "exemplo",
    beats: [
      {
        label: { pt: "Gancho", en: "Hook" },
        visual: { pt: "{produto} aparece em primeiro plano", en: "{produto} appears in the foreground" },
        line: { pt: "Você precisa ver como eu uso o {produto}.", en: "You need to see how I use {produto}." },
      },
      {
        label: { pt: "Demonstração", en: "Demo" },
        visual: { pt: "aplicação do {produto} em close, mostrando a textura", en: "close-up application of {produto}, showing the texture" },
        line: { pt: "Olha a textura: eu aplico assim, com calma.", en: "Look at the texture: I apply it like this, slowly." },
      },
      {
        label: { pt: "Convite", en: "Invite" },
        visual: { pt: "{produto} posicionado na bancada para o fechamento", en: "{produto} placed on the counter for the closing shot" },
        line: { pt: "Quer ver a rotina completa? Comenta aqui.", en: "Want the full routine? Comment below." },
      },
    ],
  },
  {
    id: "tpl-rotina-3-passos",
    title: { pt: "Rotina em 3 passos", en: "3-step routine" },
    summary: "Mostra o produto dentro de uma rotina curta e fácil de reproduzir.",
    source: "exemplo",
    beats: [
      {
        label: { pt: "Abertura", en: "Opening" },
        visual: { pt: "bancada organizada com o {produto} ao centro", en: "tidy counter with {produto} in the center" },
        line: { pt: "Minha rotina em três passos, bem rapidinho.", en: "My routine in three quick steps." },
      },
      {
        label: { pt: "Passo 1 e 2", en: "Steps 1 and 2" },
        visual: { pt: "mãos preparando a pele antes do {produto}", en: "hands preparing the skin before {produto}" },
        line: { pt: "Primeiro eu preparo, depois entra o {produto}.", en: "First I prep, then comes {produto}." },
      },
      {
        label: { pt: "Passo 3", en: "Step 3" },
        visual: { pt: "aplicação final do {produto} em câmera lenta", en: "final application of {produto} in slow motion" },
        line: { pt: "E pronto. Simples assim.", en: "And done. That simple." },
      },
      {
        label: { pt: "Fechamento", en: "Closing" },
        visual: { pt: "{produto} em pé sobre a bancada", en: "{produto} standing on the counter" },
        line: { pt: "Salva para lembrar amanhã.", en: "Save this for tomorrow." },
      },
    ],
  },
  {
    id: "tpl-responde-duvida",
    title: { pt: "Respondendo uma dúvida", en: "Answering a question" },
    summary: "Parte de um comentário e responde com demonstração.",
    source: "exemplo",
    beats: [
      {
        label: { pt: "Pergunta", en: "Question" },
        visual: { pt: "comentário de dúvida aparece ao lado da apresentadora", en: "a question comment appears next to the presenter" },
        line: { pt: "Me perguntaram como usar o {produto}. Vem comigo.", en: "Someone asked how to use {produto}. Come with me." },
      },
      {
        label: { pt: "Resposta", en: "Answer" },
        visual: { pt: "demonstração do modo de uso do {produto}", en: "demonstration of how to use {produto}" },
        line: { pt: "Eu uso assim: pouca quantidade e espalho bem.", en: "I use it like this: a small amount, spread evenly." },
      },
      {
        label: { pt: "Próxima dúvida", en: "Next question" },
        visual: { pt: "apresentadora sorri e aponta para os comentários", en: "presenter smiles and points to the comments" },
        line: { pt: "Manda a sua dúvida que eu respondo no próximo.", en: "Send your question and I'll answer next." },
      },
    ],
  },
  {
    id: "tpl-lista-3-motivos",
    title: { pt: "Lista: 3 motivos", en: "List: 3 reasons" },
    summary: "Formato escaneável, bom para quem assiste sem som.",
    source: "exemplo",
    beats: [
      {
        label: { pt: "Promessa da lista", en: "List promise" },
        visual: { pt: "{produto} na mão, texto “3 motivos” na tela", en: "{produto} in hand, “3 reasons” on screen" },
        line: { pt: "Três motivos para o {produto} estar na minha nécessaire.", en: "Three reasons {produto} lives in my bag." },
      },
      {
        label: { pt: "Motivos 1 e 2", en: "Reasons 1 and 2" },
        visual: { pt: "closes alternados do {produto}", en: "alternating close-ups of {produto}" },
        line: { pt: "Um: é prático. Dois: cabe em qualquer rotina.", en: "One: it's practical. Two: it fits any routine." },
      },
      {
        label: { pt: "Motivo 3", en: "Reason 3" },
        visual: { pt: "{produto} sendo guardado na nécessaire", en: "{produto} being packed in a makeup bag" },
        line: { pt: "Três: eu gosto de usar todo dia.", en: "Three: I enjoy using it every day." },
      },
    ],
  },
  {
    id: "tpl-unboxing",
    title: { pt: "Unboxing sensorial", en: "Sensory unboxing" },
    summary: "Curiosidade e textura, ideal para o formato só com mãos.",
    source: "exemplo",
    beats: [
      {
        label: { pt: "Caixa fechada", en: "Closed box" },
        visual: { pt: "caixa fechada sobre a mesa, mãos se aproximando", en: "closed box on the table, hands approaching" },
        line: { pt: "Chegou e eu não aguentei esperar.", en: "It arrived and I couldn't wait." },
      },
      {
        label: { pt: "Abertura", en: "Unboxing" },
        visual: { pt: "abertura lenta revelando o {produto}", en: "slow unboxing revealing {produto}" },
        line: { pt: "Olha que delicado o {produto}.", en: "Look how delicate {produto} is." },
      },
      {
        label: { pt: "Primeiro contato", en: "First touch" },
        visual: { pt: "textura do {produto} na ponta dos dedos", en: "texture of {produto} on the fingertips" },
        line: { pt: "Primeira impressão: textura leve.", en: "First impression: a light texture." },
      },
    ],
  },
];

export function getTemplate(id: string): ScriptTemplate | undefined {
  return STUDIO_TEMPLATES.find((t) => t.id === id);
}
