/**
 * DEMONSTRAÇÃO — referências de vídeos para a galeria de Virais.
 *
 * São DESCRIÇÕES de exemplo escritas pela equipe do protótipo, não vídeos
 * reais nem criadoras reais. Não há métricas: a fonte de dados ainda não
 * está conectada. `sourceUrl` só pode receber um link real e verificado.
 */

export type ViralPlatform = "tiktok" | "instagram";
export type ViralKind = "organico" | "anuncio";
export type ViralCountry = "BR" | "US";
export type ViralCategory = "fisicos" | "apps" | "infoprodutos";
export type ViralFormat = "avatar_ia" | "maos_produto" | "rosto" | "narracao";

export interface ViralReference {
  id: string;
  title: string;
  platform: ViralPlatform;
  kind: ViralKind;
  country: ViralCountry;
  category: ViralCategory;
  format: ViralFormat;
  durationSec: number;
  hook: string;
  structure: string[];
  cta: string;
  whyItWorks: string;
  /** Ordem de entrada na curadoria (maior = mais recente). Não é data real. */
  curationOrder: number;
  sourceUrl: string | null;
}

export const PLATFORM_LABEL: Record<ViralPlatform, string> = { tiktok: "TikTok", instagram: "Instagram" };
export const KIND_LABEL: Record<ViralKind, string> = { organico: "Orgânico", anuncio: "Anúncio" };
export const COUNTRY_LABEL: Record<ViralCountry, string> = { BR: "Brasil", US: "EUA" };
export const CATEGORY_LABEL: Record<ViralCategory, string> = {
  fisicos: "Produtos físicos",
  apps: "Apps",
  infoprodutos: "Infoprodutos",
};
export const FORMAT_LABEL: Record<ViralFormat, string> = {
  avatar_ia: "Avatar IA",
  maos_produto: "Mãos e produto",
  rosto: "Aparecendo",
  narracao: "Narração",
};

export const DEMO_VIRALS: ViralReference[] = [
  {
    id: "v-rotina-3-passos",
    title: "Rotina de skincare em 3 passos",
    platform: "tiktok",
    kind: "organico",
    country: "BR",
    category: "fisicos",
    format: "maos_produto",
    durationSec: 28,
    hook: "Minha rotina da noite em menos de um minuto.",
    structure: ["Gancho com o resultado do ritual pronto na bancada", "Passo 1, 2 e 3 em closes de mãos", "Textura do produto em câmera lenta", "Fechamento com a bancada organizada"],
    cta: "Comente “rotina” que eu mostro a da manhã.",
    whyItWorks: "Promessa simples, ritmo rápido e foco na textura, sem prometer resultado.",
    curationOrder: 12,
    sourceUrl: null,
  },
  {
    id: "v-avatar-duvida",
    title: "Avatar responde dúvida de comentário",
    platform: "tiktok",
    kind: "organico",
    country: "BR",
    category: "fisicos",
    format: "avatar_ia",
    durationSec: 34,
    hook: "Me perguntaram se dá para usar todo dia. Vamos lá.",
    structure: ["Print do comentário na tela", "Avatar responde olhando para a câmera", "Mostra o modo de uso em 2 cenas", "Convite para mandar outra dúvida"],
    cta: "Deixe sua dúvida que eu respondo no próximo vídeo.",
    whyItWorks: "Conversa direta com a audiência e reaproveitamento de comentários.",
    curationOrder: 11,
    sourceUrl: null,
  },
  {
    id: "v-unboxing-asmr",
    title: "Unboxing com som ambiente",
    platform: "instagram",
    kind: "organico",
    country: "BR",
    category: "fisicos",
    format: "maos_produto",
    durationSec: 22,
    hook: "Chegou e eu não aguentei esperar.",
    structure: ["Caixa fechada sobre a mesa", "Abertura lenta com som da embalagem", "Primeiro contato com a textura", "Produto posicionado para a foto final"],
    cta: "Salve para ver a review completa.",
    whyItWorks: "Curiosidade e sensação tátil prendem a atenção nos primeiros segundos.",
    curationOrder: 10,
    sourceUrl: null,
  },
  {
    id: "v-ad-problema-solucao",
    title: "Anúncio problema → uso do produto",
    platform: "tiktok",
    kind: "anuncio",
    country: "BR",
    category: "fisicos",
    format: "rosto",
    durationSec: 30,
    hook: "Se a sua maquiagem não dura até o almoço, olha isso.",
    structure: ["Situação do dia a dia em 3 segundos", "Apresentação do produto", "Aplicação em tempo real", "Chamada para conferir na loja"],
    cta: "Toque no link para ver o produto.",
    whyItWorks: "Situação reconhecível e demonstração de uso, sem números de resultado.",
    curationOrder: 9,
    sourceUrl: null,
  },
  {
    id: "v-us-grwm",
    title: "Get ready with me — morning edition",
    platform: "tiktok",
    kind: "organico",
    country: "US",
    category: "fisicos",
    format: "rosto",
    durationSec: 45,
    hook: "Get ready with me for a busy Monday.",
    structure: ["Rosto sem maquiagem e café na mão", "Produtos aparecem um a um", "Conversa leve enquanto aplica", "Look final e saída de casa"],
    cta: "Follow for the evening routine.",
    whyItWorks: "Formato de companhia: a audiência fica pela conversa, não só pelo produto.",
    curationOrder: 8,
    sourceUrl: null,
  },
  {
    id: "v-us-ad-avatar",
    title: "UGC ad with AI presenter",
    platform: "instagram",
    kind: "anuncio",
    country: "US",
    category: "fisicos",
    format: "avatar_ia",
    durationSec: 20,
    hook: "Three reasons this went straight into my bag.",
    structure: ["Avatar segurando o produto", "Motivo 1, 2 e 3 com texto na tela", "Close do produto", "Chamada final"],
    cta: "Tap to shop.",
    whyItWorks: "Lista curta e escaneável, ótima para quem assiste sem som.",
    curationOrder: 7,
    sourceUrl: null,
  },
  {
    id: "v-app-organizacao",
    title: "App de organização da rotina",
    platform: "tiktok",
    kind: "anuncio",
    country: "BR",
    category: "apps",
    format: "narracao",
    durationSec: 25,
    hook: "Eu parei de esquecer compromissos com uma mudança simples.",
    structure: ["Tela bagunçada de lembretes", "Narração mostrando o app", "Antes e depois da agenda", "Convite para testar"],
    cta: "Baixe e teste por conta própria.",
    whyItWorks: "Demonstração de tela clara e narração calma.",
    curationOrder: 6,
    sourceUrl: null,
  },
  {
    id: "v-info-curso",
    title: "Bastidores de quem estuda à noite",
    platform: "instagram",
    kind: "organico",
    country: "BR",
    category: "infoprodutos",
    format: "narracao",
    durationSec: 32,
    hook: "Como eu encaixo 30 minutos de estudo na rotina.",
    structure: ["Cenário à noite com caderno", "Narração da rotina", "Tela do conteúdo estudado", "Reflexão final"],
    cta: "Me conta: qual horário funciona para você?",
    whyItWorks: "Identificação com a rotina real, sem promessa de ganho.",
    curationOrder: 5,
    sourceUrl: null,
  },
  {
    id: "v-textura-close",
    title: "Close de textura sem fala",
    platform: "tiktok",
    kind: "organico",
    country: "BR",
    category: "fisicos",
    format: "maos_produto",
    durationSec: 15,
    hook: "Só a textura. Sem falar nada.",
    structure: ["Close extremo do produto fechado", "Abertura e textura na ponta dos dedos", "Espalhando na mão", "Produto em pé ao final"],
    cta: "Quer ver aplicado? Comente.",
    whyItWorks: "Curto, visual e fácil de reproduzir só com as mãos.",
    curationOrder: 4,
    sourceUrl: null,
  },
  {
    id: "v-us-app-habits",
    title: "Habit tracker storytime",
    platform: "tiktok",
    kind: "organico",
    country: "US",
    category: "apps",
    format: "rosto",
    durationSec: 38,
    hook: "I tried tracking one habit for a month. Here's what changed.",
    structure: ["Abertura com o celular na mão", "História curta do mês", "Tela do app", "Conclusão honesta"],
    cta: "Would you try it?",
    whyItWorks: "Storytelling pessoal e conclusão sem exageros.",
    curationOrder: 3,
    sourceUrl: null,
  },
  {
    id: "v-avatar-lista",
    title: "Avatar: 3 erros ao escolher hidratante",
    platform: "instagram",
    kind: "organico",
    country: "BR",
    category: "fisicos",
    format: "avatar_ia",
    durationSec: 30,
    hook: "Três erros que eu cometia ao escolher hidratante.",
    structure: ["Avatar com o produto ao fundo", "Erro 1, 2 e 3 com texto na tela", "Como escolher melhor", "Convite para salvar"],
    cta: "Salve para lembrar na próxima compra.",
    whyItWorks: "Formato de lista educa e gera salvamentos.",
    curationOrder: 2,
    sourceUrl: null,
  },
  {
    id: "v-info-us-ad",
    title: "Course ad with screen recording",
    platform: "instagram",
    kind: "anuncio",
    country: "US",
    category: "infoprodutos",
    format: "narracao",
    durationSec: 27,
    hook: "This is the exact checklist I use before posting.",
    structure: ["Gravação de tela do checklist", "Narração item a item", "Exemplo aplicado", "Chamada para saber mais"],
    cta: "Learn more.",
    whyItWorks: "Mostra o método na prática em vez de prometer resultado.",
    curationOrder: 1,
    sourceUrl: null,
  },
];
