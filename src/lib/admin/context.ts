/**
 * Contexto REAL do painel: os mesmos dados que o app usa (somente leitura).
 * Nada aqui grava arquivos — o painel trabalha em memória e exporta para revisão.
 */
import { officialCatalogFile } from "../catalog/index.ts";
import { DEMO_OVERLAY } from "../../demo/catalog-demo.ts";
import { TASK_CATALOG } from "../../demo/task-catalog.ts";
import { DEMO_EVENTS } from "../../demo/agenda.ts";
import { SEED_POSTS } from "../../demo/community.ts";
import { officialProductsFile, productCatalog } from "../products/index.ts";
import { DEMO_SCRIPTS, OFFICIAL_SCRIPTS } from "../../demo/studio-scripts.ts";
import type { CatalogEditContext } from "./catalog-edit.ts";

export const catalogContext: CatalogEditContext = {
  file: officialCatalogFile,
  demo: DEMO_OVERLAY,
  refs: {
    tasks: TASK_CATALOG.filter((t) => t.lessonId).map((t) => ({ id: t.id, title: typeof t.title === "string" ? t.title : t.id, lessonId: t.lessonId as string })),
    others: [
      ...DEMO_EVENTS.flatMap((e) => e.lessonIds.map((l) => ({ where: `Encontro “${e.title}”`, lessonId: l }))),
      ...productCatalog.all().flatMap((p) => p.lessonIds.map((l) => ({ where: `Produto “${p.name}”`, lessonId: l }))),
      ...SEED_POSTS.filter((p) => p.link?.kind === "aula").map((p) => ({ where: "Publicação de exemplo da Comunidade", lessonId: p.link!.id })),
    ],
  },
};

export const productsBase = officialProductsFile;
export const demoProducts = () => productCatalog.demo();
export const productExists = (id: string) => Boolean(productCatalog.get(id));
export const scriptsBase = OFFICIAL_SCRIPTS;
export const demoScripts = DEMO_SCRIPTS;
