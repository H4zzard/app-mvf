/**
 * DEMONSTRAÇÃO — agenda de lives e central de ajuda.
 *
 * Eventos de EXEMPLO, sem data, horário ou link reais e sem atribuir
 * presença a nenhuma pessoa. FAQ só sobre o uso do app (não traz regras
 * do TikTok Shop, preços ou comissões).
 */

export interface DemoEvent {
  id: string;
  title: string;
  host: string;
  description: string;
  format: "Ao vivo" | "Plantão";
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: "ev-roteiros-avatar",
    title: "Roteiros para vídeos com avatar",
    host: "Equipe MVF",
    description: "Exemplo de live: montando um roteiro do zero e transformando em cenas.",
    format: "Ao vivo",
  },
  {
    id: "ev-plantao-duvidas",
    title: "Plantão de dúvidas",
    host: "Equipe MVF",
    description: "Exemplo de encontro para tirar dúvidas sobre o plano e as atividades.",
    format: "Plantão",
  },
  {
    id: "ev-bastidores-maos",
    title: "Bastidores: gravando só com as mãos",
    host: "Equipe MVF",
    description: "Exemplo de live mostrando luz, fundo e closes de produto.",
    format: "Ao vivo",
  },
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
