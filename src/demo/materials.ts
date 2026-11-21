/**
 * DEMONSTRAÇÃO — Central de Materiais.
 *
 * Nenhum arquivo real de material existe no projeto (inspecionado: só imagens
 * em public/area-membros). Por isso TODO material tem `file: null` e a tela
 * informa “Arquivo ainda não disponível” — sem download falso.
 * Os materiais de aula vêm de src/demo/library.ts; a capa usada é a capa
 * OFICIAL do módulo da aula (src/demo/member-area.ts).
 */
import { LIBRARY_LESSONS, getLessonDetail, type LessonMaterial } from "./library.ts";
import { moduleOfLesson } from "./member-area.ts";

export type MaterialCategory = "tiktok-shop" | "roteiros" | "ia" | "produtos" | "numi";

export const MATERIAL_CATEGORY_LABEL: Record<MaterialCategory, string> = {
  "tiktok-shop": "TikTok Shop",
  roteiros: "Roteiros",
  ia: "IA e avatares",
  produtos: "Produtos",
  numi: "Materiais NUMI",
};

export interface Material {
  id: string;
  title: string;
  kind: LessonMaterial["kind"];
  category: MaterialCategory;
  description: string;
  lessonId: string | null;
  cover: string | null;
  /** URL do arquivo REAL quando existir. `null` = ainda não disponível. */
  file: string | null;
}

const CATEGORY_BY_MODULE: Record<string, MaterialCategory> = {
  "Comece por aqui": "tiktok-shop",
  Fundamentos: "tiktok-shop",
  Conformidade: "tiktok-shop",
  Publicação: "tiktok-shop",
  Análise: "tiktok-shop",
  Produto: "produtos",
  Roteiros: "roteiros",
  Formatos: "roteiros",
  Aparecendo: "roteiros",
  "Mãos e produto": "roteiros",
  "Narração e imagens": "roteiros",
  Edição: "roteiros",
  "Avatar de IA": "ia",
};

const KIND_DESCRIPTION: Record<LessonMaterial["kind"], string> = {
  checklist: "Lista para conferir item a item.",
  modelo: "Modelo para preencher com as suas informações.",
  guia: "Guia de consulta rápida.",
};

const fromLessons: Material[] = LIBRARY_LESSONS.flatMap((lesson) =>
  getLessonDetail(lesson.id).materials.map((m) => ({
    id: m.id,
    title: m.title,
    kind: m.kind,
    category: CATEGORY_BY_MODULE[lesson.module] ?? "tiktok-shop",
    description: `${KIND_DESCRIPTION[m.kind]} Acompanha a aula “${lesson.title}”.`,
    lessonId: lesson.id,
    cover: moduleOfLesson(lesson.id)?.cover ?? null,
    file: null,
  })),
);

const NUMI_MATERIALS: Material[] = [
  {
    id: "mat-numi-apresentacao",
    title: "Apresentação do produto NUMI (exemplo)",
    kind: "guia",
    category: "numi",
    description: "Espaço para a apresentação oficial do produto, a ser fornecida pela equipe NUMI.",
    lessonId: null,
    cover: "/area-membros/numi-produto-exclusivo.png",
    file: null,
  },
  {
    id: "mat-numi-alegacoes",
    title: "Alegações permitidas do produto (pendente)",
    kind: "guia",
    category: "numi",
    description: "Lista oficial do que pode ser dito sobre o produto. Aguardando o material aprovado da equipe.",
    lessonId: "l-alegacoes",
    cover: "/area-membros/protocolo-pre-postagem.png",
    file: null,
  },
];

export const DEMO_MATERIALS: Material[] = [...fromLessons, ...NUMI_MATERIALS];
