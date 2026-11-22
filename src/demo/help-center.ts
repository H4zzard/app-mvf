/**
 * Central de Ajuda — conteúdo de APOIO ao uso do app.
 *
 * Só fatos sobre o próprio app (como entrar, onde ficam as coisas, o que é
 * demonstração). Nada de regras do TikTok Shop, preços, comissões ou respostas
 * “oficiais” da equipe: nesses casos o texto remete às aulas e ao suporte.
 * Canais oficiais de atendimento ainda não foram informados (lista vazia).
 */
import type { TicketCategory } from "../lib/support/tickets.ts";
import { DEMO_FAQ } from "./agenda.ts";

export type HelpTopic = Exclude<TicketCategory, "outro"> | "plano" | "comunidade";

export interface HelpShortcut {
  topic: Exclude<TicketCategory, "outro">;
  label: string;
  description: string;
  /** Palavras usadas para recomendar aulas e materiais do catálogo. */
  keywords: string;
}

export const HELP_SHORTCUTS: HelpShortcut[] = [
  { topic: "acesso", label: "Acesso e login", description: "Link de entrada, e-mail da compra", keywords: "acesso conta boas-vindas mapa do app" },
  { topic: "aulas", label: "Aulas e plano", description: "Vídeos, progresso, próximo passo", keywords: "aulas plano primeiros passos" },
  { topic: "tiktok-shop", label: "TikTok Shop", description: "Conta, afiliação, regras", keywords: "tiktok shop conta elegibilidade produto" },
  { topic: "conteudo", label: "Criação de conteúdo", description: "Gravar, roteiro, formatos", keywords: "roteiro gravação mãos câmera formatos" },
  { topic: "estudio", label: "Estúdio IA", description: "Prompts, roteiros, Google Flow", keywords: "ia avatar personagem flow prompts" },
];

export interface HelpFaq {
  id: string;
  topic: HelpTopic;
  question: string;
  answer: string;
}

const FROM_AGENDA: Record<string, HelpTopic> = { plano: "plano", aulas: "aulas", ferramentas: "estudio", conta: "acesso" };

export const HELP_FAQ: HelpFaq[] = [
  ...DEMO_FAQ.map((f) => ({ id: f.id, topic: f.id === "faq-virais" ? ("conteudo" as const) : FROM_AGENDA[f.topic], question: f.question, answer: f.answer })),
  {
    id: "faq-link-nao-chegou",
    topic: "acesso",
    question: "Não recebi o e-mail com o link de acesso",
    answer: "Confira as pastas de spam e promoções e use o mesmo e-mail da compra. Se não chegar, peça um novo link na tela de entrada.",
  },
  {
    id: "faq-link-expirou",
    topic: "acesso",
    question: "O link de acesso não funciona",
    answer: "Os links de acesso expiram depois de um tempo. Peça um novo na tela de entrada e abra-o no mesmo celular ou computador.",
  },
  {
    id: "faq-regras-tiktok",
    topic: "tiktok-shop",
    question: "Quais são as regras para vender ou me afiliar no TikTok Shop?",
    answer: "As regras são definidas pelo TikTok Shop e podem mudar. Siga as aulas oficiais do curso e, na dúvida, abra uma solicitação. O app não substitui as orientações da plataforma.",
  },
  {
    id: "faq-meus-produtos",
    topic: "tiktok-shop",
    question: "Adicionar um produto em Meus produtos faz a afiliação?",
    answer: "Não. Meus produtos é só a sua lista de organização dentro do app. A afiliação acontece no TikTok Shop.",
  },
  {
    id: "faq-comissao",
    topic: "tiktok-shop",
    question: "Onde vejo o valor da comissão de um produto?",
    answer: "No Marketplace, a comissão aparece só depois de confirmada pela equipe, com a data da conferência. Até lá, o app mostra “A confirmar”.",
  },
  {
    id: "faq-sem-aparecer",
    topic: "conteudo",
    question: "Não quero aparecer. Consigo criar conteúdo?",
    answer: "Sim. O plano tem caminhos com mãos e produto, narração e avatar. Ajuste suas respostas em Meu Plano para ver o caminho certo para você.",
  },
  {
    id: "faq-alegacoes",
    topic: "conteudo",
    question: "Posso dizer que o produto trata ou cura algo?",
    answer: "Use só as informações e os benefícios aprovados pela marca. Na dúvida, não afirme: veja a aula sobre alegações de produto.",
  },
  {
    id: "faq-estudio-ia-real",
    topic: "estudio",
    question: "O Estúdio IA usa inteligência artificial?",
    answer: "Nesta versão, os textos vêm de um modelo local, sem IA conectada, e a tela informa isso. Revise sempre antes de usar.",
  },
  {
    id: "faq-estudio-midia",
    topic: "estudio",
    question: "Onde crio as imagens e os vídeos?",
    answer: "No Google Flow, uma ferramenta externa. O Estúdio monta os textos (prompts e falas) para você copiar e colar lá.",
  },
  {
    id: "faq-lives-data",
    topic: "comunidade",
    question: "Quando acontecem as lives?",
    answer: "As datas são divulgadas pela equipe. Enquanto não forem confirmadas, aparecem como “Data a confirmar” em Lives.",
  },
  {
    id: "faq-denuncia",
    topic: "comunidade",
    question: "Vi uma publicação inadequada na comunidade. O que faço?",
    answer: "Toque em “Denunciar” na publicação ou no comentário e escolha o motivo. Nesta demonstração, a denúncia fica registrada só no seu navegador.",
  },
];

export interface HelpProblem {
  id: string;
  topic: Exclude<TicketCategory, "outro">;
  title: string;
  steps: string[];
  /** Tutoriais/telas do app relacionados. */
  links: { label: string; href: string }[];
}

export const HELP_PROBLEMS: HelpProblem[] = [
  {
    id: "pb-nao-consigo-entrar",
    topic: "acesso",
    title: "Não consigo entrar",
    steps: ["Use o mesmo e-mail da compra.", "Procure o e-mail de acesso no spam e em promoções.", "Peça um novo link na tela de entrada.", "Se nada resolver, abra uma solicitação abaixo."],
    links: [],
  },
  {
    id: "pb-aula-nao-abre",
    topic: "aulas",
    title: "A aula não abre ou o vídeo não aparece",
    steps: ["Nesta versão, os vídeos ainda não foram adicionados ao app.", "As aulas oficiais continuam na área de membros atual.", "Use o checklist de Meu Plano para acompanhar o que já fez."],
    links: [
      { label: "Abrir Aulas", href: "/aulas" },
      { label: "Abrir Meu Plano", href: "/meu-plano" },
    ],
  },
  {
    id: "pb-regras-comissao",
    topic: "tiktok-shop",
    title: "Dúvida sobre regras, afiliação ou comissão",
    steps: ["Veja as aulas oficiais sobre a conta e a escolha de produto.", "No Marketplace, preço e comissão só aparecem depois de confirmados pela equipe.", "Para casos específicos, abra uma solicitação."],
    links: [
      { label: "Abrir Marketplace", href: "/marketplace" },
      { label: "Abrir Aulas", href: "/aulas" },
    ],
  },
  {
    id: "pb-primeiro-video",
    topic: "conteudo",
    title: "Não sei como começar meu primeiro vídeo",
    steps: ["No Início, siga o seu próximo passo.", "Escolha um produto e gere roteiros no Estúdio IA.", "Grave em partes curtas e revise antes de publicar."],
    links: [
      { label: "Ver meu próximo passo", href: "/inicio" },
      { label: "Roteiros para gravar", href: "/estudio-ia/roteiros" },
    ],
  },
  {
    id: "pb-estudio-texto",
    topic: "estudio",
    title: "O texto gerado não ficou bom",
    steps: ["Revise o briefing: produto, descrição e modo de uso com informações reais.", "Edite o resultado: ele é um ponto de partida.", "Nesta versão o modelo é local (sem IA), então as variações são limitadas."],
    links: [{ label: "Abrir Estúdio IA", href: "/estudio-ia" }],
  },
];

/**
 * Canais oficiais de atendimento. VAZIO até a equipe informar (e-mail, WhatsApp,
 * horário). Nunca preencher com contato inventado.
 */
export const SUPPORT_CHANNELS: { label: string; value: string; href: string; hours?: string }[] = [];
