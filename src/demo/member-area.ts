/**
 * Área de membros — catálogo em trilhos (estilo streaming).
 *
 * As CAPAS e os NOMES dos módulos vêm dos arquivos oficiais fornecidos pelo
 * operador (`imagens-area-membros/` → copiados para `public/area-membros/`).
 * A DISTRIBUIÇÃO das aulas de exemplo pelos módulos é DEMONSTRATIVA (por tema):
 * o conteúdo real de cada módulo continua na área de membros da Kiwify.
 * Mapeamento documentado em docs/AREA_MEMBROS.md.
 */
import type { OnboardingProfile } from "@/types";

export const MEMBER_ASSETS = {
  banner: "/area-membros/banner-area-membros.jpg",
  logo: "/area-membros/logo-numi.jpg",
} as const;

export type RailId = "primeiros-passos" | "formacao" | "avatar" | "escala" | "suporte" | "high-wealth";

export interface MemberRail {
  id: RailId;
  title: string;
  subtitle: string;
}

export const MEMBER_RAILS: MemberRail[] = [
  { id: "primeiros-passos", title: "Primeiros passos", subtitle: "Comece por aqui e prepare sua base." },
  { id: "formacao", title: "Formação MVF", subtitle: "O método para vender no TikTok Shop." },
  { id: "avatar", title: "Avatar de IA · sem aparecer", subtitle: "Crie conteúdo sem precisar gravar o rosto." },
  { id: "escala", title: "Estratégia e escala", subtitle: "Ajustes de rota e próximos níveis." },
  { id: "suporte", title: "Suporte e acompanhamento", subtitle: "Ao vivo, mentoria e atendimento." },
  { id: "high-wealth", title: "Desafio High Wealth e bônus", subtitle: "Mentalidade, rotina e organização." },
];

export interface MemberModule {
  id: string;
  title: string;
  /** Linha curta exibida sob o título (tom neutro, sem promessas). */
  tagline: string;
  cover: string;
  railId: RailId;
  /** Aulas de EXEMPLO associadas (IDs estáveis de src/demo/lessons.ts). */
  lessonIds: string[];
  /** Destino próprio quando o módulo é uma área do app (ex.: Lives, Suporte). */
  href?: string;
}

const c = (file: string) => `/area-membros/${file}.png`;

export const MEMBER_MODULES: MemberModule[] = [
  // Primeiros passos
  { id: "m-primeiro-acesso", title: "Primeiro acesso", tagline: "Comece aqui", cover: c("primeiro-acesso"), railId: "primeiros-passos", lessonIds: ["l-boas-vindas"] },
  { id: "m-primeiros-passos", title: "Primeiros passos", tagline: "Onboarding", cover: c("primeiros-passos"), railId: "primeiros-passos", lessonIds: ["l-fundamentos-shop", "l-conta-elegibilidade", "l-comparar-formatos"] },
  { id: "m-configuracoes-essenciais", title: "Configurações essenciais", tagline: "E escolha do produto", cover: c("configuracoes-essenciais"), railId: "primeiros-passos", lessonIds: ["l-escolher-produto"] },
  { id: "m-protocolo", title: "Protocolo pré-postagem", tagline: "Antes de publicar", cover: c("protocolo-pre-postagem"), railId: "primeiros-passos", lessonIds: ["l-checklist", "l-alegacoes"] },
  // Formação MVF
  { id: "m-virando-creator", title: "Virando creator do TikTok Shop", tagline: "Sua nova rotina de criadora", cover: c("virando-creator-do-tiktok-shop"), railId: "formacao", lessonIds: ["l-edicao-simples"] },
  { id: "m-venda-sua-imagem", title: "Venda no TikTok usando sua imagem", tagline: "Para quem quer aparecer", cover: c("venda-no-tiktok-usando-sua-imagem"), railId: "formacao", lessonIds: ["l-camera", "l-demonstracao"] },
  { id: "m-venda-sem-aparecer", title: "Venda no TikTok sem aparecer", tagline: "Mãos, produto e narração", cover: c("venda-no-tiktok-sem-aparecer"), railId: "formacao", lessonIds: ["l-maos-enquadramento", "l-close-produto", "l-narracao"] },
  { id: "m-vitrine-viral", title: "Sua vitrine viral do zero", tagline: "Perfil pronto para vender", cover: c("sua-vitrine-viral-do-zero"), railId: "formacao", lessonIds: [] },
  { id: "m-live-shop", title: "Live Shop", tagline: "Vendas ao vivo", cover: c("live-shop"), railId: "formacao", lessonIds: [] },
  { id: "m-numi-produto", title: "NUMI: o produto exclusivo", tagline: "Conheça o produto", cover: c("numi-produto-exclusivo"), railId: "formacao", lessonIds: [] },
  // Avatar de IA
  { id: "m-influenciador-digital", title: "Crie seu influenciador digital", tagline: "Vídeos prontos sem precisar gravar", cover: c("crie-seu-influenciador-digital"), railId: "avatar", lessonIds: ["l-ia-primeiros-passos", "l-personagem-ia"] },
  { id: "m-laboratorio-avatares", title: "Laboratório de avatares", tagline: "Personagem consistente", cover: c("laboratorio-de-avatares"), railId: "avatar", lessonIds: ["l-consistencia", "l-flow"] },
  { id: "m-roteirista-invisivel", title: "Roteirista invisível", tagline: "Roteiros que vendem com clareza", cover: c("roteirista-invisivel"), railId: "avatar", lessonIds: ["l-roteiro"] },
  // Estratégia e escala
  { id: "m-ajuste-de-rota", title: "Ajuste de rota e escala", tagline: "Onde está o erro?", cover: c("ajuste-de-rota-e-escala"), railId: "escala", lessonIds: ["l-metricas"] },
  { id: "m-estrategias-secretas", title: "Estratégias secretas de escala", tagline: "Próximo nível", cover: c("estrategias-secretas-de-escala"), railId: "escala", lessonIds: [] },
  { id: "m-seja-reconhecida", title: "Seja reconhecida", tagline: "Presença e autoridade", cover: c("seja-reconhecida"), railId: "escala", lessonIds: [] },
  // Suporte e acompanhamento
  { id: "m-suporte-individual", title: "Suporte individual", tagline: "Club VIP e suporte", cover: c("suporte-individual"), railId: "suporte", lessonIds: [], href: "/suporte" },
  { id: "m-aulas-ao-vivo", title: "Aulas ao vivo", tagline: "Acesse aqui", cover: c("aulas-ao-vivo"), railId: "suporte", lessonIds: [], href: "/lives" },
  { id: "m-acompanhamento-scale", title: "Acompanhamento MVF Scale", tagline: "Mentoria MVF Scale", cover: c("acompanhamento-mvf-scale"), railId: "suporte", lessonIds: [] },
  // High Wealth e bônus
  { id: "m-desafio-21-dias", title: "Desafio 21 dias High Wealth", tagline: "Desafio High Wealth", cover: c("desafio-21-dias-high-wealth"), railId: "high-wealth", lessonIds: [] },
  { id: "m-frequencias", title: "Frequências da prosperidade", tagline: "Bônus", cover: c("frequencias-da-prosperidade"), railId: "high-wealth", lessonIds: [] },
  { id: "m-audios-autoafirmacao", title: "Áudios de autoafirmação", tagline: "Bônus", cover: c("audios-de-autoafirmacao"), railId: "high-wealth", lessonIds: [] },
  { id: "m-planilha-financeira", title: "Planilha de organização financeira", tagline: "Bônus", cover: c("planilha-de-organizacao-financeira"), railId: "high-wealth", lessonIds: [] },
];

export function getModule(id: string): MemberModule | undefined {
  return MEMBER_MODULES.find((m) => m.id === id);
}

export function moduleOfLesson(lessonId: string): MemberModule | undefined {
  return MEMBER_MODULES.find((m) => m.lessonIds.includes(lessonId));
}

export function modulesOfRail(railId: RailId): MemberModule[] {
  return MEMBER_MODULES.filter((m) => m.railId === railId);
}

/**
 * Seleção personalizada (determinística) a partir do perfil do onboarding.
 * Sem perfil, devolve a trilha de início. Nunca repete módulo.
 */
export function recommendModules(profile: OnboardingProfile | null | undefined, limit = 6): { modules: MemberModule[]; reason: string } {
  if (!profile) {
    return { modules: modulesOfRail("primeiros-passos").slice(0, limit), reason: "Para quem está começando" };
  }
  const ids: string[] = [];
  const reasons: string[] = [];
  if (profile.experience !== "ja_vendi") {
    ids.push("m-primeiros-passos", "m-configuracoes-essenciais");
    reasons.push("começando");
  }
  if (profile.wantsToAppear === "sim") {
    ids.push("m-venda-sua-imagem");
    reasons.push("vai aparecer nos vídeos");
  } else {
    if (profile.formats.includes("avatar_ia") || profile.formats.includes("quero_explorar")) {
      ids.push("m-influenciador-digital", "m-laboratorio-avatares");
      reasons.push("avatar de IA");
    }
    if (profile.formats.includes("maos_produto") || profile.formats.includes("narracao_imagens") || profile.wantsToAppear === "nao") {
      ids.push("m-venda-sem-aparecer");
      reasons.push("sem aparecer");
    }
  }
  if (profile.mainBlocker === "roteiros") ids.unshift("m-roteirista-invisivel");
  else ids.push("m-roteirista-invisivel");
  if (profile.mainBlocker === "escolher_produto") ids.splice(1, 0, "m-configuracoes-essenciais");
  ids.push("m-protocolo");
  const unique = [...new Set(ids)].map((id) => getModule(id)).filter((m): m is MemberModule => m !== undefined);
  const label = reasons.length ? `Para o seu perfil: ${[...new Set(reasons)].join(" · ")}` : "Para o seu perfil";
  return { modules: unique.slice(0, limit), reason: label };
}
