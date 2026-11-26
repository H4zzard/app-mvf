/**
 * Navegação 2.0 — os SETE destinos principais (fonte única, pura e testável).
 *
 * A barra inferior (celular/tablet) e a lateral (desktop) mostram exatamente
 * estes destinos, nesta ordem. Não existe menu “Mais”: toda rota do app tem um
 * destino “dono”, que fica ativo também nas subpáginas (ex.: /ranking → Perfil).
 *
 * Sem React e sem ícones aqui (os ícones ficam em `src/config/navigation.ts`),
 * para que os testes rodem com `node --test`.
 */

export type DestinationId = "inicio" | "plano" | "aulas" | "estudio" | "produtos" | "tribo" | "perfil";

export interface Destination {
  id: DestinationId;
  /** Rótulo visível na barra (curto). */
  label: string;
  /** Nome por extenso (lateral do desktop, trilha do cabeçalho). */
  fullLabel: string;
  /** Rótulo ainda mais curto para telas < 360 px (nunca menos legível: só menos letras). */
  compactLabel?: string;
  /**
   * Nome acessível. Sempre CONTÉM as palavras visíveis (WCAG 2.5.3 “rótulo no nome”),
   * para que comando de voz funcione com o que está escrito na tela.
   */
  a11yLabel: string;
  /** Página principal do destino. */
  href: string;
  /** Prefixos de rota que pertencem a este destino (além do próprio href). */
  owns: string[];
}

export const DESTINATIONS: readonly Destination[] = [
  { id: "inicio", label: "Início", fullLabel: "Início", a11yLabel: "Início", href: "/inicio", owns: ["/inicio"] },
  { id: "plano", label: "Plano", fullLabel: "Meu Plano", a11yLabel: "Meu Plano", href: "/meu-plano", owns: ["/meu-plano", "/onboarding"] },
  { id: "aulas", label: "Aulas", fullLabel: "Aulas", a11yLabel: "Aulas", href: "/aulas", owns: ["/aulas", "/materiais"] },
  { id: "estudio", label: "Estúdio", fullLabel: "Estúdio IA", compactLabel: "IA", a11yLabel: "Estúdio IA", href: "/estudio-ia", owns: ["/estudio-ia", "/videos-virais"] },
  { id: "produtos", label: "Produtos", fullLabel: "Produtos", compactLabel: "Loja", a11yLabel: "Loja de produtos", href: "/marketplace", owns: ["/marketplace", "/minhas-vendas"] },
  { id: "tribo", label: "Tribo", fullLabel: "Tribo", a11yLabel: "Tribo, Comunidade MVF", href: "/comunidade", owns: ["/comunidade", "/lives"] },
  {
    id: "perfil",
    label: "Perfil",
    fullLabel: "Perfil",
    a11yLabel: "Perfil",
    href: "/perfil",
    owns: ["/perfil", "/desafios", "/ranking", "/conquistas", "/recompensas", "/suporte", "/regras-faq", "/admin", "/mais"],
  },
];

export const DESTINATION_IDS: readonly DestinationId[] = DESTINATIONS.map((d) => d.id);

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Destino “dono” de uma rota (subpáginas incluídas). `undefined` fora do app. */
export function destinationForPath(pathname: string): Destination | undefined {
  const path = pathname.split(/[?#]/)[0] || "/";
  return DESTINATIONS.find((d) => d.owns.some((p) => matches(path, p)));
}

export function getDestination(id: DestinationId): Destination {
  const d = DESTINATIONS.find((x) => x.id === id);
  if (!d) throw new Error(`Destino desconhecido: ${id}`);
  return d;
}

/**
 * Rotas em “modo foco”: o App Shell esconde a barra inferior E a lateral.
 * Para o futuro primeiro acesso com vídeo, basta acrescentar o prefixo da rota
 * aqui (ex.: "/primeiro-acesso") — sem reconstruir o shell.
 */
export const FOCUS_ROUTE_PREFIXES: readonly string[] = [
  // Atendimento do Assistente MVF: tela cheia (o design da barra não muda; ela só não aparece).
  "/suporte/chat",
];

/**
 * A navegação do app fica oculta:
 * - em rotas de foco (lista acima);
 * - no onboarding AINDA NÃO concluído (sem perfil salvo): o primeiro acesso é um
 *   caminho único. Ao ajustar um plano existente, a navegação continua visível.
 * Login, confirmação de e-mail, recuperação de acesso e /gestao têm layouts
 * próprios, fora do App Shell — a barra nem existe lá.
 */
export function isAppNavHidden(pathname: string, ctx: { hasProfile: boolean }): boolean {
  const path = pathname.split(/[?#]/)[0] || "/";
  if (FOCUS_ROUTE_PREFIXES.some((p) => matches(path, p))) return true;
  return matches(path, "/onboarding") && !ctx.hasProfile;
}

/* ------------------------------------------------------------------ */
/* Entradas secundárias (o que antes ficava no “Mais”)                  */
/* ------------------------------------------------------------------ */

export interface SecondaryLink {
  /** ID do item em `NAV_ITEMS` (para ícone e “Em breve”). */
  navId: string;
  label: string;
  description: string;
  href: string;
}

/** Perfil › Minha evolução. Levam às telas já existentes (gamificação não muda). */
export const EVOLUTION_LINKS: readonly SecondaryLink[] = [
  { navId: "desafios", label: "Desafios", description: "Metas com critérios claros", href: "/desafios" },
  { navId: "ranking", label: "Ranking", description: "Sua posição entre as alunas", href: "/ranking" },
  { navId: "conquistas", label: "Conquistas", description: "Nível, XP e selos", href: "/conquistas" },
  { navId: "recompensas", label: "Recompensas", description: "Troque seus pontos", href: "/recompensas" },
];

/**
 * Ajuda e informações (Perfil, rodapés do Início e das Aulas). A Central de ajuda
 * reúne as respostas rápidas e o contato com a equipe; Regras e FAQ abrem a seção
 * certa da página existente por `?secao=`.
 */
export const HELP_LINKS: readonly SecondaryLink[] = [
  { navId: "suporte", label: "Central de ajuda", description: "Respostas rápidas e contato com o suporte", href: "/suporte" },
  { navId: "regras-faq", label: "Perguntas frequentes", description: "Dúvidas comuns sobre plano, aulas e pontos", href: "/regras-faq?secao=faq" },
  { navId: "regras-faq", label: "Regras da plataforma", description: "Combinados da comunidade", href: "/regras-faq?secao=regras" },
  { navId: "regras-faq", label: "Orientações de acesso", description: "Conta, login e acesso", href: "/regras-faq?secao=conta" },
];
