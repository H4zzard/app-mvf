/**
 * Persona da atendente — ÚNICO lugar para trocar o nome e os textos curtos de interface.
 * Não é segredo (aparece na tela). O system prompt completo fica em `system-prompt.ts`
 * (somente servidor). Módulo puro.
 */
export const ASSISTANT = {
  /** Nome da atendente. Troque aqui e ele muda no chat, no prompt e no TXT. */
  name: "Nina",
  /** Como aparece no cabeçalho do chat. */
  role: "Assistente virtual do MVF",
} as const;

/** Rótulo do remetente na transcrição TXT (ex.: “NINA (ASSISTENTE MVF)”). */
export const transcriptAssistantLabel = () => `${ASSISTANT.name.toUpperCase()} (ASSISTENTE MVF)`;

/** Saudações de abertura (variadas para não soar repetitivo). */
export const GREETINGS = [
  `Oii! Eu sou a ${ASSISTANT.name}, do suporte MVF 💗 Me conta, em que posso te ajudar?`,
  `Oi! Aqui é a ${ASSISTANT.name}. Pode me contar sua dúvida que eu te ajudo.`,
  `Olá! Sou a ${ASSISTANT.name}, do suporte MVF. Como posso te ajudar hoje?`,
];

/** Despedidas do encerramento automático por resolução (curtas, sem nova pergunta). */
export const FAREWELLS = [
  "Que bom que deu certo! 💗 Sempre que precisar, é só chamar.",
  "Perfeito! Fico feliz que resolveu. Qualquer coisa, é só chamar 😊",
  "Que bom! Sempre que precisar, tô por aqui 💛",
];
