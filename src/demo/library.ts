/**
 * DEMONSTRAÇÃO — biblioteca de aulas para a navegação mock.
 *
 * Reaproveita os IDs ESTÁVEIS de `lessons.ts` (o plano aponta para eles).
 * Descrições e materiais são textos de exemplo; nenhuma aula tem vídeo
 * disponível ainda (as aulas reais seguem na área de membros da Kiwify).
 * Quando houver origem de vídeo permitida, preencha `video` com a URL real.
 */
import type { Lesson } from "@/types";
import { DEMO_LESSONS } from "./lessons.ts";

export type LibraryCategoryId = "primeiros-passos" | "produto" | "criacao" | "avatar-ia" | "publicar";

export interface LibraryCategory {
  id: LibraryCategoryId;
  label: string;
  /** Módulos (campo `Lesson.module`) que pertencem à categoria. */
  modules: string[];
}

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  { id: "primeiros-passos", label: "Primeiros passos", modules: ["Comece por aqui", "Fundamentos", "Conformidade"] },
  { id: "produto", label: "Produto", modules: ["Produto"] },
  {
    id: "criacao",
    label: "Criação",
    modules: ["Roteiros", "Formatos", "Aparecendo", "Mãos e produto", "Narração e imagens", "Edição"],
  },
  { id: "avatar-ia", label: "Avatar IA", modules: ["Avatar de IA"] },
  { id: "publicar", label: "Publicar e analisar", modules: ["Publicação", "Análise"] },
];

export interface LessonMaterial {
  id: string;
  title: string;
  kind: "checklist" | "modelo" | "guia";
}

export interface LessonDetail {
  summary: string;
  /** O que a aluna pratica depois da aula (texto de exemplo). */
  practice: string;
  materials: LessonMaterial[];
  /** URL de vídeo REAL quando existir. `null` = vídeo ainda não adicionado. */
  video: string | null;
}

const DETAILS: Record<string, Omit<LessonDetail, "video">> = {
  "l-boas-vindas": {
    summary: "Como o seu plano é montado, o que significa cada etapa e como usar o app no dia a dia.",
    practice: "Abra o Meu Plano e encontre o seu próximo passo.",
    materials: [{ id: "m-mapa", title: "Mapa do app (exemplo)", kind: "guia" }],
  },
  "l-fundamentos-shop": {
    summary: "Uma visão geral de como funciona a venda como afiliada. Regras oficiais e atualizadas ficam nas aulas e nos canais da plataforma.",
    practice: "Anote três dúvidas para levar ao plantão de dúvidas.",
    materials: [{ id: "m-glossario", title: "Glossário de termos (exemplo)", kind: "guia" }],
  },
  "l-escolher-produto": {
    summary: "Critérios para escolher o primeiro produto: afinidade, facilidade de demonstrar e materiais disponíveis.",
    practice: "Escolha um produto do Marketplace e salve em Meus produtos.",
    materials: [
      { id: "m-criterios", title: "Checklist de escolha de produto (exemplo)", kind: "checklist" },
      { id: "m-ficha", title: "Ficha do produto (modelo)", kind: "modelo" },
    ],
  },
  "l-personagem-ia": {
    summary: "Como definir a personagem: estilo, cenário e tom de voz, antes de gerar qualquer cena.",
    practice: "Monte a ficha da sua personagem no Estúdio IA.",
    materials: [{ id: "m-ficha-personagem", title: "Ficha de personagem (modelo)", kind: "modelo" }],
  },
  "l-consistencia": {
    summary: "Descrever a personagem sempre do mesmo jeito para manter a aparência entre as cenas.",
    practice: "Gere dois prompts com a mesma ficha e compare as descrições.",
    materials: [{ id: "m-consistencia", title: "Checklist de consistência (exemplo)", kind: "checklist" }],
  },
  "l-roteiro": {
    summary: "Gancho, demonstração e chamada para ação: a estrutura básica de um vídeo curto de produto.",
    practice: "Escreva um roteiro de 30 segundos com o modelo da aula.",
    materials: [{ id: "m-roteiro", title: "Modelo de roteiro em 3 partes", kind: "modelo" }],
  },
  "l-flow": {
    summary: "Como transformar o roteiro em cenas e usar os prompts no Google Flow (ferramenta externa).",
    practice: "Copie um prompt do Estúdio IA e teste no Google Flow.",
    materials: [{ id: "m-cenas", title: "Roteiro de cenas (modelo)", kind: "modelo" }],
  },
  "l-checklist": {
    summary: "Revisão antes de publicar: áudio, legenda, enquadramento e alegações de produto.",
    practice: "Passe o checklist no seu próximo vídeo.",
    materials: [{ id: "m-checklist-publicar", title: "Checklist de publicação (exemplo)", kind: "checklist" }],
  },
  "l-metricas": {
    summary: "Como olhar os primeiros números com calma, sem tirar conclusões apressadas.",
    practice: "Registre as observações dos seus três primeiros vídeos.",
    materials: [{ id: "m-diario", title: "Diário de observações (modelo)", kind: "modelo" }],
  },
  "l-conta-elegibilidade": {
    summary: "Passos para preparar a conta. Requisitos oficiais podem mudar: confira sempre os canais da plataforma.",
    practice: "Confira a sua conta com o checklist da aula.",
    materials: [{ id: "m-conta", title: "Checklist da conta (exemplo)", kind: "checklist" }],
  },
  "l-alegacoes": {
    summary: "Como falar de cosméticos sem promessas de resultado e respeitando as diretrizes.",
    practice: "Revise um roteiro trocando promessas por descrições de uso.",
    materials: [{ id: "m-alegacoes", title: "Guia de linguagem segura (exemplo)", kind: "guia" }],
  },
  "l-comparar-formatos": {
    summary: "Avatar com IA, mãos e produto ou narração: vantagens de cada formato para começar.",
    practice: "Escolha um formato para os seus próximos três vídeos.",
    materials: [{ id: "m-formatos", title: "Comparativo de formatos (exemplo)", kind: "guia" }],
  },
  "l-camera": {
    summary: "Postura, luz e fala para quem quer aparecer, mesmo começando com o celular.",
    practice: "Grave um teste de 15 segundos só para você.",
    materials: [{ id: "m-camera", title: "Checklist de gravação (exemplo)", kind: "checklist" }],
  },
  "l-demonstracao": {
    summary: "Mostrar o produto em uso de forma clara, com começo, meio e fim.",
    practice: "Grave uma demonstração curta seguindo o roteiro.",
    materials: [{ id: "m-demo", title: "Roteiro de demonstração (modelo)", kind: "modelo" }],
  },
  "l-ia-primeiros-passos": {
    summary: "Primeiro contato com ferramentas de IA: o que elas fazem e o que ainda dependem de você.",
    practice: "Gere seu primeiro prompt no Estúdio IA.",
    materials: [{ id: "m-ia", title: "Primeiros passos com IA (guia)", kind: "guia" }],
  },
  "l-maos-enquadramento": {
    summary: "Enquadramento, fundo e luz para vídeos só com mãos e produto.",
    practice: "Monte seu cantinho de gravação e tire uma foto de teste.",
    materials: [{ id: "m-luz", title: "Checklist de luz e fundo (exemplo)", kind: "checklist" }],
  },
  "l-close-produto": {
    summary: "Closes, texturas e movimentos de mão que ajudam a mostrar o produto.",
    practice: "Grave três closes diferentes do mesmo produto.",
    materials: [{ id: "m-closes", title: "Lista de tomadas (modelo)", kind: "modelo" }],
  },
  "l-narracao": {
    summary: "Voz, ritmo e clareza para narrar vídeos de produto.",
    practice: "Grave a narração de um roteiro de 30 segundos.",
    materials: [{ id: "m-narracao", title: "Exercícios de narração (guia)", kind: "guia" }],
  },
  "l-edicao-simples": {
    summary: "Cortes, legendas e música para vídeos curtos, sem complicar.",
    practice: "Edite um vídeo curto com cortes e legenda.",
    materials: [{ id: "m-edicao", title: "Checklist de edição (exemplo)", kind: "checklist" }],
  },
};

export function getLessonDetail(id: string): LessonDetail {
  const d = DETAILS[id];
  return {
    summary: d?.summary ?? "Descrição em preparação.",
    practice: d?.practice ?? "Atividade prática em preparação.",
    materials: d?.materials ?? [],
    video: null,
  };
}

export function categoryOfLesson(lesson: Lesson): LibraryCategoryId {
  return LIBRARY_CATEGORIES.find((c) => c.modules.includes(lesson.module))?.id ?? "primeiros-passos";
}

export const LIBRARY_LESSONS: Lesson[] = DEMO_LESSONS;
