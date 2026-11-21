/**
 * DEMONSTRAÇÃO — vitrine do Marketplace.
 *
 * Nenhum catálogo oficial da NUMI foi fornecido: todos os itens são
 * PRODUTOS DEMONSTRATIVOS, sem preço, sem comissão e sem foto real.
 * Substitua por nomes, imagens e regras oficiais quando forem entregues.
 */

export type ProductCategory = "skincare" | "maquiagem" | "cabelos" | "corpo";

export interface DemoProduct {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  highlights: string[];
  /** Ideias de ângulo de conteúdo (exemplos, não promessas). */
  contentAngles: string[];
  suggestedFormats: ("avatar_ia" | "maos_produto" | "narracao")[];
}

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  skincare: "Skincare",
  maquiagem: "Maquiagem",
  cabelos: "Cabelos",
  corpo: "Corpo e banho",
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "p-hidratante",
    name: "Hidratante facial (demonstrativo)",
    category: "skincare",
    description: "Item de exemplo para ensaiar roteiros de rotina de cuidados.",
    highlights: ["Textura fácil de mostrar em close", "Bom para vídeos de rotina"],
    contentAngles: ["Rotina da noite em 3 passos", "Textura sem fala", "Responder dúvida de comentário"],
    suggestedFormats: ["maos_produto", "avatar_ia"],
  },
  {
    id: "p-serum",
    name: "Sérum (demonstrativo)",
    category: "skincare",
    description: "Item de exemplo para demonstrar aplicação com conta-gotas.",
    highlights: ["Visual elegante na bancada", "Aplicação rápida de filmar"],
    contentAngles: ["Unboxing com som ambiente", "Como eu encaixo na rotina"],
    suggestedFormats: ["maos_produto", "narracao"],
  },
  {
    id: "p-batom",
    name: "Batom (demonstrativo)",
    category: "maquiagem",
    description: "Item de exemplo para vídeos de cor e acabamento.",
    highlights: ["Swatch no braço funciona bem em close", "Combina com formato de lista"],
    contentAngles: ["Três formas de usar", "Look rápido para o trabalho"],
    suggestedFormats: ["maos_produto", "avatar_ia"],
  },
  {
    id: "p-base",
    name: "Base (demonstrativo)",
    category: "maquiagem",
    description: "Item de exemplo para demonstrações de aplicação.",
    highlights: ["Demonstração em tempo real", "Bom para formato problema → uso"],
    contentAngles: ["Aplicação em 30 segundos", "Avatar explica como escolher o tom"],
    suggestedFormats: ["avatar_ia", "narracao"],
  },
  {
    id: "p-mascara-capilar",
    name: "Máscara capilar (demonstrativo)",
    category: "cabelos",
    description: "Item de exemplo para rotinas de cuidado com os cabelos.",
    highlights: ["Textura cremosa em close", "Rotina de domingo"],
    contentAngles: ["Ritual de domingo", "Passo a passo com as mãos"],
    suggestedFormats: ["maos_produto"],
  },
  {
    id: "p-oleo-corporal",
    name: "Óleo corporal (demonstrativo)",
    category: "corpo",
    description: "Item de exemplo para vídeos sensoriais.",
    highlights: ["Brilho e textura chamam atenção", "Ótimo para vídeos sem fala"],
    contentAngles: ["Momento de autocuidado", "Close de textura com luz natural"],
    suggestedFormats: ["maos_produto", "narracao"],
  },
];
