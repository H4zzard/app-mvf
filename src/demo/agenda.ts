/**
 * DEMONSTRAÇÃO — agenda de lives e central de ajuda.
 *
 * Eventos de EXEMPLO, sem data, horário, link ou gravação reais e sem
 * atribuir presença a nenhuma pessoa. FAQ só sobre o uso do app (não traz regras
 * do TikTok Shop, preços ou comissões).
 */

import type { CommunityEvent } from "../lib/events/schedule.ts";

const demoEvent = (e: Omit<CommunityEvent, "schedule" | "streamUrl" | "replay" | "replayAuthorized" | "origin" | "audience"> & Partial<Pick<CommunityEvent, "audience">>): CommunityEvent => ({
  schedule: { status: "a_confirmar" },
  streamUrl: null,
  replay: null,
  replayAuthorized: false,
  origin: "demonstrativo",
  audience: "todas",
  ...e,
});

/**
 * Eventos de EXEMPLO: nenhum tem data, horário, link ou gravação (o schema
 * recusa). Os IDs dos três primeiros são estáveis (lista de lembrete da demo).
 */
export const DEMO_EVENTS: CommunityEvent[] = [
  demoEvent({
    id: "ev-roteiros-avatar",
    title: "Roteiros para vídeos com avatar",
    kind: "live",
    host: "Equipe MVF",
    description: "Exemplo de live: montando um roteiro do zero e transformando em cenas.",
    topics: ["Roteiro em 3 partes", "Ficha da personagem", "Takes no Google Flow"],
    ended: false,
    materialIds: ["m-roteiro", "m-cenas"],
    lessonIds: ["l-roteiro", "l-flow"],
  }),
  demoEvent({
    id: "ev-plantao-duvidas",
    title: "Plantão de dúvidas",
    kind: "plantao",
    host: "Equipe MVF",
    description: "Exemplo de encontro para tirar dúvidas sobre o plano e as atividades.",
    topics: ["Meu Plano", "Primeiros passos"],
    ended: false,
    materialIds: [],
    lessonIds: [],
  }),
  demoEvent({
    id: "ev-bastidores-maos",
    title: "Bastidores: gravando só com as mãos",
    kind: "live",
    host: "Equipe MVF",
    description: "Exemplo de live mostrando luz, fundo e closes de produto.",
    topics: ["Luz e fundo", "Closes de textura"],
    ended: false,
    materialIds: ["m-luz", "m-closes"],
    lessonIds: ["l-maos-enquadramento", "l-close-produto"],
  }),
  demoEvent({
    id: "ev-elite-mentoria",
    title: "Encontro da Sala Elite+",
    kind: "encontro",
    host: "Equipe MVF",
    description: "Exemplo de encontro exclusivo. O formato real será definido pela equipe.",
    topics: ["Formato a definir pela equipe"],
    ended: false,
    materialIds: [],
    lessonIds: [],
    audience: "Elite+",
  }),
  demoEvent({
    id: "ev-anterior-boas-vindas",
    title: "Boas-vindas à turma",
    kind: "encontro",
    host: "Equipe MVF",
    description: "Exemplo de encontro anterior. A gravação aparece aqui quando for cadastrada e autorizada.",
    topics: ["Como usar o app", "Primeiros passos"],
    ended: true,
    materialIds: ["m-mapa"],
    lessonIds: ["l-boas-vindas"],
  }),
  demoEvent({
    id: "ev-anterior-estudio",
    title: "Tirando dúvidas do Estúdio IA",
    kind: "plantao",
    host: "Equipe MVF",
    description: "Exemplo de plantão anterior sobre o Estúdio IA.",
    topics: ["Estúdio IA", "Google Flow"],
    ended: true,
    materialIds: ["m-ia"],
    lessonIds: ["l-ia-primeiros-passos"],
  }),
];

export interface FaqItem {
  id: string;
  topic: "plano" | "aulas" | "ferramentas" | "conta";
  question: string;
  answer: string;
}

export const FAQ_TOPIC_LABEL: Record<FaqItem["topic"], string> = {
  plano: "Meu plano",
  aulas: "Aulas",
  ferramentas: "Ferramentas",
  conta: "Conta e acesso",
};

export const DEMO_FAQ: FaqItem[] = [
  {
    id: "faq-plano",
    topic: "plano",
    question: "Como o meu plano é montado?",
    answer: "Pelas respostas do “Personalizar plano”. As mesmas respostas geram sempre o mesmo plano, com etapas e atividades na ordem recomendada.",
  },
  {
    id: "faq-ajustar",
    topic: "plano",
    question: "Posso mudar meu plano depois?",
    answer: "Sim. Em Meu Plano, toque em “Ajustar meu plano”. Você vê uma prévia das mudanças antes de confirmar, e o que já concluiu continua guardado.",
  },
  {
    id: "faq-aulas",
    topic: "aulas",
    question: "Onde estão os vídeos das aulas?",
    answer: "Nesta versão de demonstração, os vídeos ainda não foram adicionados ao app. As aulas oficiais continuam na área de membros atual.",
  },
  {
    id: "faq-estudio",
    topic: "ferramentas",
    question: "O Estúdio IA gera vídeos?",
    answer: "Não. Ele monta textos de prompt e roteiro para você copiar e usar no Google Flow, que é uma ferramenta externa.",
  },
  {
    id: "faq-virais",
    topic: "ferramentas",
    question: "Os números dos vídeos virais são reais?",
    answer: "A galeria mostra referências de exemplo e ainda não tem fonte de dados conectada. Por isso não exibimos visualizações, vendas ou faturamento.",
  },
  {
    id: "faq-acesso",
    topic: "conta",
    question: "Como entro na plataforma?",
    answer: "Com o e-mail usado na compra. Você recebe um link de acesso por e-mail, sem senha.",
  },
];
