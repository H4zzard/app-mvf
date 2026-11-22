/**
 * DEMONSTRAÇÃO — Central de Materiais.
 *
 * Nenhum arquivo real de material existe no projeto (inspecionado: só imagens
 * em public/area-membros). Por isso TODO material tem `file: null` e a tela
 * informa “Arquivo ainda não disponível” — sem download falso.
 * Os materiais de aula vêm do CATÁLOGO (src/lib/catalog); a capa usada é a capa
 * OFICIAL do módulo da aula.
 */
import type { MaterialCategory as CatalogMaterialCategory, MaterialKind } from "@/types/catalog";
import { catalog } from "../lib/catalog/index.ts";

export type MaterialCategory = CatalogMaterialCategory;

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
  kind: MaterialKind;
  category: MaterialCategory;
  description: string;
  lessonId: string | null;
  cover: string | null;
  /** Sempre `null` na tela: arquivos vêm por referência e só serão servidos pelo servidor. */
  file: string | null;
}

const KIND_DESCRIPTION: Record<MaterialKind, string> = {
  checklist: "Lista para conferir item a item.",
  modelo: "Modelo para preencher com as suas informações.",
  guia: "Guia de consulta rápida.",
};

/** Materiais do CATÁLOGO (oficiais ou de exemplo), com a capa oficial do módulo da aula. */
const fromCatalog: Material[] = catalog.materials().map((m) => {
  const lesson = m.lessonId ? catalog.getLesson(m.lessonId) : undefined;
  return {
    id: m.id,
    title: m.title,
    kind: m.kind,
    category: m.category,
    description: m.description || `${KIND_DESCRIPTION[m.kind]}${lesson ? ` Acompanha a aula “${lesson.title}”.` : ""}`,
    lessonId: lesson?.id ?? null,
    cover: lesson ? (catalog.getModule(lesson.moduleId)?.cover ?? null) : null,
    file: null,
  };
});

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

export const DEMO_MATERIALS: Material[] = [...fromCatalog, ...NUMI_MATERIALS.filter((n) => !fromCatalog.some((m) => m.id === n.id))];
