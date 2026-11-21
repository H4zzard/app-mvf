/**
 * DEMONSTRAÇÃO — Regras da comunidade e FAQ.
 *
 * Não havia textos oficiais da NUMI Insiders no projeto. Tudo abaixo é
 * CONTEÚDO DEMONSTRATIVO PENDENTE DE REVISÃO da equipe: não é regra oficial
 * nem vinculante. Sem regras do TikTok Shop, preços ou comissões.
 */
import { DEMO_FAQ } from "./agenda.ts";

export interface CommunityRule {
  id: string;
  title: string;
  body: string;
}

export const DEMO_RULES: CommunityRule[] = [
  { id: "r-respeito", title: "Respeito acima de tudo", body: "Trate todas as alunas com gentileza. Críticas são bem-vindas quando construtivas." },
  { id: "r-privacidade", title: "Privacidade", body: "Não compartilhe dados pessoais seus ou de outras pessoas, como telefone, endereço ou documentos." },
  { id: "r-spam", title: "Sem spam ou divulgação", body: "Evite links de venda, sorteios ou divulgação de outros produtos e serviços nos espaços da comunidade." },
  { id: "r-promessas", title: "Sem promessas de resultado", body: "Não publique promessas de ganhos ou resultados garantidos. Compartilhe processos e aprendizados." },
  { id: "r-conteudo", title: "Conteúdo do curso", body: "As aulas e materiais são para uso pessoal. Não redistribua o conteúdo fora da plataforma." },
  { id: "r-moderacao", title: "Moderação", body: "A equipe pode ocultar postagens que não sigam estas orientações e falar com você em particular." },
];

export type FaqTopic = "plano" | "aulas" | "comunidade" | "pontos" | "conta";

export const FAQ_TOPICS: Record<FaqTopic, string> = {
  plano: "Meu plano",
  aulas: "Aulas e materiais",
  comunidade: "Comunidade",
  pontos: "Pontos e recompensas",
  conta: "Conta e acesso",
};

export interface FaqEntry {
  id: string;
  topic: FaqTopic;
  question: string;
  answer: string;
}

const TOPIC_MAP: Record<string, FaqTopic> = { plano: "plano", aulas: "aulas", ferramentas: "aulas", conta: "conta" };

export const DEMO_FAQ_FULL: FaqEntry[] = [
  ...DEMO_FAQ.map((f) => ({ id: f.id, topic: TOPIC_MAP[f.topic] ?? "aulas", question: f.question, answer: f.answer })),
  { id: "faq-materiais", topic: "aulas", question: "Onde baixo os materiais das aulas?", answer: "Na Central de Materiais. Nesta demonstração, os arquivos ainda não foram adicionados, e cada material mostra isso com clareza." },
  { id: "faq-postar", topic: "comunidade", question: "Em quais espaços posso publicar?", answer: "Em Boas-vindas, Mural de conquistas, Dúvidas & dicas e Bastidores. Avisos NUMI é só para a equipe." },
  { id: "faq-salas", topic: "comunidade", question: "O que são as salas Elite+ e Icon?", answer: "Salas exclusivas. O acesso real será definido pelo seu plano e verificado pela plataforma." },
  { id: "faq-xp", topic: "pontos", question: "Como ganho XP?", answer: "Concluindo aulas e atividades, participando da comunidade, usando o Estúdio IA e completando desafios. Cada ação conta uma vez." },
  { id: "faq-pontos-dinheiro", topic: "pontos", question: "Pontos valem dinheiro?", answer: "Não. Pontos medem o seu engajamento na plataforma e podem ser trocados por recompensas quando a loja estiver ativa." },
  { id: "faq-ranking", topic: "pontos", question: "Como funciona o ranking?", answer: "Pela soma de XP de engajamento. O ranking nunca mostra faturamento, vendas ou comissões." },
];
