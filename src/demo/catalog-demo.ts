/**
 * DEMONSTRAÇÃO — camada de aulas e materiais de EXEMPLO sobre o catálogo oficial.
 *
 * As 19 aulas de `lessons.ts` (IDs ESTÁVEIS usados pelo plano e pelo progresso)
 * são distribuídas nos módulos oficiais por tema. Todas têm `origin: "demonstrativo"`
 * e nenhuma tem vídeo. Quando a equipe cadastrar aulas oficiais num módulo, as de
 * exemplo daquele módulo saem automaticamente (ver src/lib/catalog/build.ts).
 */
import type { CatalogLesson, CatalogMaterial, MaterialCategory } from "@/types/catalog";
import type { DemoOverlay } from "../lib/catalog/build.ts";
import { DEMO_LESSONS } from "./lessons.ts";
import { getLessonDetail } from "./library.ts";

/** Módulo oficial → aulas de exemplo (na ordem). */
export const DEMO_PLACEMENT: Record<string, string[]> = {
  "m-primeiro-acesso": ["l-boas-vindas"],
  "m-primeiros-passos": ["l-fundamentos-shop", "l-conta-elegibilidade", "l-comparar-formatos"],
  "m-configuracoes-essenciais": ["l-escolher-produto"],
  "m-protocolo": ["l-checklist", "l-alegacoes"],
  "m-virando-creator": ["l-edicao-simples"],
  "m-venda-sua-imagem": ["l-camera", "l-demonstracao"],
  "m-venda-sem-aparecer": ["l-maos-enquadramento", "l-close-produto", "l-narracao"],
  "m-influenciador-digital": ["l-ia-primeiros-passos", "l-personagem-ia"],
  "m-laboratorio-avatares": ["l-consistencia", "l-flow"],
  "m-roteirista-invisivel": ["l-roteiro"],
  "m-ajuste-de-rota": ["l-metricas"],
};

const MATERIAL_CATEGORY: Record<string, MaterialCategory> = {
  "Comece por aqui": "tiktok-shop",
  Fundamentos: "tiktok-shop",
  Conformidade: "tiktok-shop",
  Publicação: "tiktok-shop",
  Análise: "tiktok-shop",
  Produto: "produtos",
  "Avatar de IA": "ia",
};

function buildDemo(): DemoOverlay {
  const lessons: CatalogLesson[] = [];
  const materials: CatalogMaterial[] = [];
  for (const [moduleId, ids] of Object.entries(DEMO_PLACEMENT)) {
    ids.forEach((id, i) => {
      const base = DEMO_LESSONS.find((l) => l.id === id);
      if (!base) return;
      const detail = getLessonDetail(id);
      lessons.push({
        id,
        moduleId,
        title: base.title,
        order: i + 1,
        durationMinutes: base.durationMinutes,
        level: base.level,
        tags: base.tags,
        prerequisites: [],
        summary: detail.summary,
        practice: detail.practice,
        media: { kind: "none" },
        materialIds: detail.materials.map((m) => m.id),
        origin: "demonstrativo",
        availability: "disponivel",
      });
      for (const m of detail.materials) {
        materials.push({
          id: m.id,
          title: m.title,
          kind: m.kind,
          category: MATERIAL_CATEGORY[base.module] ?? "roteiros",
          description: "",
          lessonId: id,
          file: { kind: "none" },
          origin: "demonstrativo",
        });
      }
    });
  }
  return { lessons, materials };
}

export const DEMO_OVERLAY: DemoOverlay = buildDemo();
