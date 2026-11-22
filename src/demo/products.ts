/**
 * DEMONSTRAÇÃO — produtos para treinar no Marketplace e no Estúdio IA.
 *
 * NÃO são produtos NUMI nem de marca parceira: marca “Exemplo”, sem foto, sem
 * preço, sem comissão, sem link e sem benefícios (o schema recusa esses dados
 * em produto demonstrativo). Descrição e modo de uso são textos neutros de
 * exemplo, para a aluna ensaiar o fluxo Marketplace → Estúdio.
 *
 * Os IDs são estáveis (favoritos, cenários e “Meus produtos” dependem deles).
 * O catálogo oficial fica em src/content/produtos-oficiais.json.
 */
import type { Product } from "../lib/products/types.ts";
import { CATEGORY_LABEL } from "../lib/products/display.ts";

export type { ProductCategory } from "../lib/products/types.ts";
/** Compatibilidade com telas/testes antigos. */
export type DemoProduct = Product;
export const PRODUCT_CATEGORY_LABEL = CATEGORY_LABEL;

const demo = (p: Pick<Product, "id" | "name" | "category" | "shortDescription" | "description" | "howToUse" | "characteristics" | "restrictions" | "materialIds" | "lessonIds" | "contentTags" | "formats"> & Partial<Pick<Product, "availability" | "isNew">>): Product => ({
  brand: "Exemplo",
  origin: "demonstrativo",
  approval: "aprovado",
  availability: "disponivel",
  isNew: false,
  images: [],
  approvedBenefits: [],
  price: null,
  commission: null,
  affiliation: { status: "a_confirmar", conditions: "", affiliateUrl: null },
  productUrl: null,
  ...p,
});

export const DEMO_PRODUCTS: Product[] = [
  demo({
    id: "p-hidratante",
    name: "Hidratante facial",
    category: "skincare",
    shortDescription: "Exemplo para ensaiar roteiros de rotina de cuidados.",
    description: "Hidratante facial em creme, de exemplo, para treinar vídeos de rotina.",
    howToUse: "Aplique uma pequena quantidade no rosto limpo. Espalhe com movimentos suaves.",
    characteristics: ["Pote com tampa de rosca", "Textura cremosa, fácil de mostrar em close"],
    restrictions: ["Não fale em resultado ou tratamento: use só as informações oficiais do produto real"],
    materialIds: ["m-closes", "m-alegacoes"],
    lessonIds: ["l-close-produto", "l-alegacoes"],
    contentTags: ["rotina", "textura", "passo-a-passo"],
    formats: ["aparecendo", "maos_produto", "avatar_ia"],
  }),
  demo({
    id: "p-serum",
    name: "Sérum",
    category: "skincare",
    shortDescription: "Exemplo para demonstrar aplicação com conta-gotas.",
    description: "Sérum de exemplo em frasco com conta-gotas, para treinar demonstração de aplicação.",
    howToUse: "Pingue duas gotas na ponta dos dedos. Espalhe no rosto limpo e espere secar.",
    characteristics: ["Frasco de vidro com conta-gotas", "Textura líquida e leve"],
    restrictions: ["Evite contato com os olhos"],
    materialIds: ["m-demo", "m-alegacoes"],
    lessonIds: ["l-demonstracao"],
    contentTags: ["textura", "unboxing", "passo-a-passo"],
    formats: ["maos_produto", "narracao_imagens", "aparecendo"],
    isNew: true,
  }),
  demo({
    id: "p-batom",
    name: "Batom",
    category: "maquiagem",
    shortDescription: "Exemplo para vídeos de cor e acabamento.",
    description: "Batom em bastão, de exemplo, para treinar vídeos de cor e acabamento.",
    howToUse: "Aplique direto nos lábios, do centro para os cantos.",
    characteristics: ["Bastão com tampa", "Swatch no braço aparece bem em close"],
    restrictions: [],
    materialIds: ["m-closes"],
    lessonIds: ["l-close-produto"],
    contentTags: ["apresentacao", "duvidas"],
    formats: ["aparecendo", "maos_produto", "avatar_ia"],
  }),
  demo({
    id: "p-base",
    name: "Base",
    category: "maquiagem",
    shortDescription: "Exemplo para demonstrações de aplicação.",
    description: "Base líquida de exemplo, para treinar demonstrações de aplicação.",
    howToUse: "Espalhe pequenas porções no rosto com esponja ou pincel.",
    characteristics: ["Frasco com válvula"],
    restrictions: [],
    materialIds: ["m-demo"],
    lessonIds: ["l-demonstracao"],
    contentTags: ["passo-a-passo", "duvidas"],
    formats: ["aparecendo", "avatar_ia", "narracao_imagens"],
    availability: "em_breve",
  }),
  demo({
    id: "p-mascara-capilar",
    name: "Máscara capilar",
    category: "cabelos",
    shortDescription: "Exemplo para rotinas de cuidado com os cabelos.",
    description: "Máscara capilar em creme, de exemplo, para treinar vídeos de rotina com as mãos.",
    howToUse: "Aplique nos fios úmidos, do comprimento às pontas. Enxágue depois.",
    characteristics: ["Pote grande", "Textura cremosa"],
    restrictions: [],
    materialIds: ["m-closes", "m-luz"],
    lessonIds: ["l-maos-enquadramento"],
    contentTags: ["rotina", "textura", "sem-fala"],
    formats: ["maos_produto"],
  }),
  demo({
    id: "p-oleo-corporal",
    name: "Óleo corporal",
    category: "corpo",
    shortDescription: "Exemplo para vídeos sensoriais.",
    description: "Óleo corporal de exemplo, para treinar vídeos sensoriais com luz natural.",
    howToUse: "Aplique algumas gotas na pele e espalhe com as mãos.",
    characteristics: ["Frasco transparente", "Brilho aparece bem com luz natural"],
    restrictions: [],
    materialIds: ["m-luz"],
    lessonIds: ["l-maos-enquadramento"],
    contentTags: ["textura", "sem-fala"],
    formats: ["maos_produto", "narracao_imagens"],
    availability: "indisponivel",
  }),
];
