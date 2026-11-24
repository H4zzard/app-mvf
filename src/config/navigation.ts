import {
  Award,
  BookOpen,
  CirclePlay,
  Flame,
  FolderOpen,
  Gift,
  House,
  MessageCircleHeart,
  LifeBuoy,
  MessagesSquare,
  Radio,
  Route,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Trophy,
  UserRound,
  Wallet,
  GraduationCap,
  WandSparkles,
  ShoppingBag,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { NavigationGroup, NavigationItem, UserRole } from "@/types";
import { DESTINATIONS, type Destination, type DestinationId } from "../lib/navigation/destinations.ts";

export const NAV_GROUPS: NavigationGroup[] = [
  { id: "aprender", label: "Aprender" },
  { id: "criar", label: "Criar e vender" },
  { id: "comunidade", label: "Comunidade" },
  { id: "conta", label: "Conta e ajuda" },
  { id: "gestao", label: "Gestão" },
];

/** Papéis que enxergam o grupo Gestão no menu (apenas visual). */
export const ADMIN_ROLES: UserRole[] = ["owner", "admin", "expert", "support", "moderator"];

/**
 * Fonte única da navegação. Ao implementar uma tela, troque `status` para
 * "available" e substitua o placeholder da rota pela página real.
 */
export const NAV_ITEMS: NavigationItem[] = [
  // Aprender
  {
    id: "inicio",
    label: "Início",
    href: "/inicio",
    icon: House,
    group: "aprender",
    status: "available",
    description: "Seu próximo passo, progresso e rotina sugerida.",
  },
  {
    id: "meu-plano",
    label: "Meu Plano",
    shortLabel: "Plano",
    href: "/meu-plano",
    icon: Route,
    group: "aprender",
    status: "available",
    description: "Sua trilha personalizada rumo à primeira comissão.",
  },
  {
    id: "onboarding",
    label: "Personalizar plano",
    href: "/onboarding",
    icon: MessageCircleHeart,
    group: "aprender",
    status: "available",
    description: "Perguntas rápidas para montar ou ajustar o seu plano.",
  },
  {
    id: "aulas",
    demoReady: true,
    label: "Aulas",
    href: "/aulas",
    icon: CirclePlay,
    group: "aprender",
    status: "soon",
    description:
      "Biblioteca completa de aulas do método, sempre disponível independentemente do seu plano.",
  },
  // Criar e vender
  {
    id: "videos-virais",
    demoReady: true,
    label: "Vídeos Virais",
    shortLabel: "Virais",
    href: "/videos-virais",
    icon: Flame,
    group: "criar",
    status: "soon",
    description:
      "Curadoria de vídeos de referência do TikTok, Instagram e anúncios, com métricas estimadas claramente rotuladas.",
  },
  {
    id: "estudio-ia",
    demoReady: true,
    label: "Estúdio IA",
    href: "/estudio-ia",
    icon: Sparkles,
    group: "criar",
    status: "soon",
    description:
      "Prompts, roteiros, personagens e cenas para usar no Google Flow, em português e inglês.",
  },
  {
    id: "marketplace",
    demoReady: true,
    label: "Produtos",
    href: "/marketplace",
    icon: Store,
    group: "criar",
    status: "soon",
    description: "Produtos NUMI com regras de comissão, materiais e roteiros relacionados.",
  },
  {
    id: "minhas-vendas",
    demoReady: true,
    label: "Minhas Vendas",
    href: "/minhas-vendas",
    icon: Wallet,
    group: "criar",
    status: "soon",
    description:
      "Acompanhamento de vendas e comissões a partir de fontes verificáveis.",
  },
  {
    id: "materiais",
    demoReady: true,
    label: "Materiais",
    href: "/materiais",
    icon: FolderOpen,
    group: "criar",
    status: "soon",
    description: "Arquivos de apoio, modelos e materiais de divulgação.",
  },
  // Comunidade
  {
    id: "comunidade",
    demoReady: true,
    label: "Comunidade MVF",
    shortLabel: "Tribo",
    href: "/comunidade",
    icon: MessagesSquare,
    group: "comunidade",
    status: "soon",
    description:
      "Boas-vindas, Avisos NUMI, Mural de conquistas, Dúvidas & dicas, Bastidores e salas exclusivas.",
  },
  {
    id: "lives",
    demoReady: true,
    label: "Lives",
    href: "/lives",
    icon: Radio,
    group: "comunidade",
    status: "soon",
    description: "Agenda e gravações das lives com a equipe.",
  },
  {
    id: "desafios",
    demoReady: true,
    label: "Desafios",
    href: "/desafios",
    icon: Target,
    group: "comunidade",
    status: "soon",
    description: "Desafios com critérios claros e ações verificáveis.",
  },
  {
    id: "ranking",
    demoReady: true,
    label: "Ranking",
    href: "/ranking",
    icon: Trophy,
    group: "comunidade",
    status: "soon",
    description:
      "Ranking que distingue resultados verificados de autodeclarados.",
  },
  {
    id: "conquistas",
    demoReady: true,
    label: "Conquistas",
    href: "/conquistas",
    icon: Award,
    group: "comunidade",
    status: "soon",
    description: "Níveis, selos e marcos da sua jornada.",
  },
  {
    id: "recompensas",
    demoReady: true,
    label: "Recompensas",
    href: "/recompensas",
    icon: Gift,
    group: "comunidade",
    status: "soon",
    description: "Loja de recompensas com estoque e regras de resgate.",
  },
  // Conta
  {
    id: "perfil",
    label: "Perfil",
    href: "/perfil",
    icon: UserRound,
    group: "conta",
    status: "available",
    description: "Sua conta, evolução e ajuda.",
  },
  {
    id: "suporte",
    demoReady: true,
    label: "Suporte",
    href: "/suporte",
    icon: LifeBuoy,
    group: "conta",
    status: "soon",
    description: "Atendimento individual com a equipe.",
  },
  {
    id: "regras-faq",
    demoReady: true,
    label: "Regras & FAQ",
    href: "/regras-faq",
    icon: BookOpen,
    group: "conta",
    status: "soon",
    description: "Regras da comunidade e perguntas frequentes.",
  },
  // Gestão
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    icon: ShieldCheck,
    group: "gestao",
    status: "soon",
    description: "Gestão de alunas, conteúdos, comunidade e permissões por cargo.",
    visibleTo: ADMIN_ROLES,
  },
];

export function getNavItem(id: string): NavigationItem {
  const item = NAV_ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Item de navegação desconhecido: ${id}`);
  return item;
}

export function findNavItemByPath(pathname: string): NavigationItem | undefined {
  return NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
}

/** Filtro VISUAL por papel. Não é controle de acesso. */
export function isNavItemVisible(item: NavigationItem, role: UserRole): boolean {
  return !item.visibleTo || item.visibleTo.includes(role);
}

/**
 * Navegação 2.0: os sete destinos (barra inferior no celular, lateral no desktop).
 * Ordem, rótulos e rotas vêm de `src/lib/navigation/destinations.ts` (puro, testado);
 * aqui só se acrescentam os ícones. Não existe menu “Mais”.
 */
const DESTINATION_ICONS: Record<DestinationId, LucideIcon> = {
  inicio: House,
  plano: Route,
  aulas: GraduationCap,
  estudio: WandSparkles,
  produtos: ShoppingBag,
  tribo: UsersRound,
  perfil: UserRound,
};

export type PrimaryNavItem = Destination & { icon: LucideIcon };

export const PRIMARY_NAV: readonly PrimaryNavItem[] = DESTINATIONS.map((d) => ({ ...d, icon: DESTINATION_ICONS[d.id] }));

/** “Em breve” para quem vê o item: no modo demo, módulos com tela mock ficam disponíveis. */
export function isItemSoon(item: NavigationItem, demo: boolean): boolean {
  return item.status === "soon" && !(demo && item.demoReady);
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
