/**
 * DEMONSTRAÇÃO — Loja de Recompensas e Ranking.
 *
 * Recompensas são EXEMPLOS: não há estoque, envio, agenda nem disponibilidade
 * real, e o resgate não dispara nenhuma operação externa.
 * Perfis do ranking são FICTÍCIOS e marcados como exemplo. O ranking usa só
 * XP de engajamento — nunca faturamento, comissão ou vendas.
 */

export type RewardCategory = "mentoria" | "produto" | "beneficio";

export interface Reward {
  id: string;
  title: string;
  description: string;
  category: RewardCategory;
  cost: number;
  /** Imagem OFICIAL quando fizer sentido (sem fotos aleatórias). */
  image?: string;
}

export const REWARD_CATEGORY_LABEL: Record<RewardCategory, string> = {
  mentoria: "Mentoria e feedback",
  produto: "Produtos NUMI",
  beneficio: "Benefícios especiais",
};

export const DEMO_REWARDS: Reward[] = [
  { id: "rw-destaque-mural", title: "Destaque no Mural", description: "Sua conquista em destaque no Mural da comunidade.", category: "beneficio", cost: 60 },
  { id: "rw-live-antecipada", title: "Lugar reservado em live", description: "Prioridade para enviar perguntas em uma live da equipe.", category: "beneficio", cost: 120 },
  { id: "rw-feedback-perfil", title: "Feedback de perfil", description: "Uma análise do seu perfil feita pela equipe.", category: "mentoria", cost: 150 },
  { id: "rw-analise-video", title: "Análise de 1 vídeo", description: "Comentários da equipe sobre um vídeo seu.", category: "mentoria", cost: 220 },
  { id: "rw-kit-numi", title: "Kit NUMI", description: "Produto NUMI para criar conteúdo.", category: "produto", cost: 400, image: "/area-membros/numi-produto-exclusivo.png" },
  { id: "rw-mentoria-grupo", title: "Mentoria em grupo", description: "Encontro em grupo pequeno com a equipe.", category: "mentoria", cost: 550, image: "/area-membros/acompanhamento-mvf-scale.png" },
];

export interface RankingProfile {
  id: string;
  name: string;
  initials: string;
  xp: number;
  /** Sempre true nos dados de demonstração. */
  isExample: boolean;
}

export const DEMO_RANKING: RankingProfile[] = [
  { id: "rk-1", name: "Júlia (exemplo)", initials: "JU", xp: 340, isExample: true },
  { id: "rk-2", name: "Paula (exemplo)", initials: "PA", xp: 285, isExample: true },
  { id: "rk-3", name: "Renata (exemplo)", initials: "RE", xp: 240, isExample: true },
  { id: "rk-4", name: "Carla (exemplo)", initials: "CA", xp: 175, isExample: true },
  { id: "rk-5", name: "Bianca (exemplo)", initials: "BI", xp: 130, isExample: true },
  { id: "rk-6", name: "Lívia (exemplo)", initials: "LI", xp: 90, isExample: true },
  { id: "rk-7", name: "Sofia (exemplo)", initials: "SO", xp: 45, isExample: true },
];
