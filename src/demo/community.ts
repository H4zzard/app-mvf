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
  /** Alunas podem publicar aqui? (Avisos: só equipe.) Em salas restritas, só quem tem acesso. */
  studentsCanPost: boolean;
  /**
   * Sala com acesso restrito (Elite+ / Icon). Na demo fica bloqueada, a não ser na
   * SIMULAÇÃO de plano (que não é autorização). O acesso real será verificado no servidor.
   */
  restricted?: "Elite+" | "Icon";
}

/** Tipo da publicação (modelos do “Nova publicação”). Ausente = conversa livre. */
export type PostKind = "conversa" | "duvida" | "conquista" | "aprendizado" | "experiencia";

/** Vínculo opcional com uma aula do catálogo ou um desafio/missão. */
export interface PostLink {
  kind: "aula" | "desafio";
  id: string;
}

/** Estado de moderação. Ausente = publicada. (Futuro: “em_analise”, “removida”.) */
export type ModerationStatus = "publicada" | "oculta";

export const SPACES: CommunitySpace[] = [
  { id: "boas-vindas", label: "Boas-vindas", description: "Apresente-se e conheça outras alunas.", studentsCanPost: true },
  { id: "avisos", label: "Avisos NUMI", description: "Comunicados da equipe.", studentsCanPost: false },
  { id: "mural", label: "Mural de conquistas", description: "Marcos da sua jornada: primeiro vídeo, primeira rotina…", studentsCanPost: true },
  { id: "duvidas", label: "Dúvidas & dicas", description: "Pergunte e ajude outras alunas.", studentsCanPost: true },
  { id: "bastidores", label: "Bastidores", description: "Como você grava, edita e se organiza.", studentsCanPost: true },
  { id: "elite", label: "Sala Elite+", description: "Sala exclusiva para alunas Elite+.", studentsCanPost: true, restricted: "Elite+" },
  { id: "icon", label: "Sala Icon", description: "Sala exclusiva para alunas Icon.", studentsCanPost: true, restricted: "Icon" },
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
  /** Oculto pela moderação (simulação). */
  hidden?: boolean;
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
  kind?: PostKind;
  link?: PostLink;
  status?: ModerationStatus;
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
    id: "post-elite-boas-vindas",
    spaceId: "elite",
    author: TEAM,
    body: "Exemplo de conteúdo da Sala Elite+. Os encontros e materiais desta sala serão definidos pela equipe.",
    baseLikes: 2,
    comments: [],
  },
  {
    id: "post-icon-boas-vindas",
    spaceId: "icon",
    author: TEAM,
    body: "Exemplo de conteúdo da Sala Icon. O que acontece aqui será definido pela equipe.",
    baseLikes: 1,
    comments: [],
  },
  {
    id: "post-duvida-avatar",
    spaceId: "duvidas",
    kind: "duvida",
    link: { kind: "aula", id: "l-consistencia" },
    author: { name: "Bianca (exemplo)", initials: "BI" },
    body: "Minha personagem muda de rosto entre uma cena e outra. Vocês usam a mesma imagem de referência em todas?",
    baseLikes: 2,
    comments: [{ id: "c-4", author: { name: "Júlia (exemplo)", initials: "JU" }, body: "Uso sempre a mesma imagem e repito a descrição da ficha em todos os prompts." }],
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

export const COMMUNITY_LIMITS = {
  maxPostLength: 600,
  maxCommentLength: 300,
  /** Publicação curta demais não vale como participação (evita “oi” repetido). */
  minPostLength: 10,
  minCommentLength: 2,
  /** Denúncia: observação opcional. */
  maxReportNote: 300,
} as const;
