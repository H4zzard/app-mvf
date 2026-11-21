/**
 * DEMONSTRAÇÃO — comunidade.
 *
 * Perfis e postagens FICTÍCIOS, sempre marcados como exemplo. Nenhum relato
 * de ganho, venda ou resultado: só dúvidas, bastidores e marcos de processo.
 */

export type SpaceId = "boas-vindas" | "avisos" | "mural" | "duvidas" | "bastidores" | "elite" | "icon";

export interface CommunitySpace {
  id: SpaceId;
  label: string;
  description: string;
  /** Alunas podem publicar aqui? (Avisos: só equipe.) */
  studentsCanPost: boolean;
  /** Sala com acesso restrito (Elite+ / Icon). Na demo, sempre bloqueada. */
  restricted?: "Elite+" | "Icon";
}

export const SPACES: CommunitySpace[] = [
  { id: "boas-vindas", label: "Boas-vindas", description: "Apresente-se e conheça outras alunas.", studentsCanPost: true },
  { id: "avisos", label: "Avisos NUMI", description: "Comunicados da equipe.", studentsCanPost: false },
  { id: "mural", label: "Mural de conquistas", description: "Marcos da sua jornada: primeiro vídeo, primeira rotina…", studentsCanPost: true },
  { id: "duvidas", label: "Dúvidas & dicas", description: "Pergunte e ajude outras alunas.", studentsCanPost: true },
  { id: "bastidores", label: "Bastidores", description: "Como você grava, edita e se organiza.", studentsCanPost: true },
  { id: "elite", label: "Sala Elite+", description: "Sala exclusiva para alunas Elite+.", studentsCanPost: false, restricted: "Elite+" },
  { id: "icon", label: "Sala Icon", description: "Sala exclusiva para alunas Icon.", studentsCanPost: false, restricted: "Icon" },
];

export interface CommunityAuthor {
  name: string;
  initials: string;
  isMe?: boolean;
  isTeam?: boolean;
}

export interface CommunityComment {
  id: string;
  author: CommunityAuthor;
  body: string;
}

export interface CommunityPost {
  id: string;
  spaceId: SpaceId;
  author: CommunityAuthor;
  body: string;
  /** Curtidas de exemplo de outras pessoas (a sua é somada à parte). */
  baseLikes: number;
  comments: CommunityComment[];
  edited?: boolean;
}

const TEAM: CommunityAuthor = { name: "Equipe MVF (exemplo)", initials: "MV", isTeam: true };

export const SEED_POSTS: CommunityPost[] = [
  {
    id: "post-boas-vindas-equipe",
    spaceId: "avisos",
    author: TEAM,
    body: "Este é um aviso de exemplo. Os comunicados oficiais da equipe aparecerão aqui quando a comunidade estiver no ar.",
    baseLikes: 4,
    comments: [],
  },
  {
    id: "post-apresentacao-carla",
    spaceId: "boas-vindas",
    author: { name: "Carla (exemplo)", initials: "CA" },
    body: "Oi, gente! Começando agora, vou testar vídeos só com as mãos porque ainda tenho vergonha de aparecer. Alguém mais nessa?",
    baseLikes: 6,
    comments: [
      { id: "c-1", author: { name: "Júlia (exemplo)", initials: "JU" }, body: "Eu! Comecei pelo formato com mãos também." },
    ],
  },
  {
    id: "post-duvida-luz",
    spaceId: "duvidas",
    author: { name: "Renata (exemplo)", initials: "RE" },
    body: "Que luz vocês usam para gravar closes de textura? Perto da janela fica bom, mas à noite fico perdida.",
    baseLikes: 3,
    comments: [
      { id: "c-2", author: { name: "Paula (exemplo)", initials: "PA" }, body: "Uso um ring light pequeno atrás do celular, bem baixinho." },
      { id: "c-3", author: TEAM, body: "Tem uma aula sobre isso em Aulas → Mãos e produto." },
    ],
  },
  {
    id: "post-mural-primeiro-video",
    spaceId: "mural",
    author: { name: "Júlia (exemplo)", initials: "JU" },
    body: "Marco do dia: publiquei meu primeiro vídeo com avatar! Demorei para ajustar o prompt, mas consegui manter a personagem igual nas duas cenas.",
    baseLikes: 9,
    comments: [],
  },
  {
    id: "post-bastidores-cantinho",
    spaceId: "bastidores",
    author: { name: "Paula (exemplo)", initials: "PA" },
    body: "Montei um cantinho de gravação com uma caixa de papelão forrada de tecido. Ficou ótimo para os closes!",
    baseLikes: 5,
    comments: [],
  },
];

export const COMMUNITY_LIMITS = { maxPostLength: 600, maxCommentLength: 300 } as const;
