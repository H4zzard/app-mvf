/**
 * Instância do catálogo usada pelo app: arquivo OFICIAL validado + camada de
 * EXEMPLO. Ponto único de acesso a conteúdo (o painel admin/banco substituirá a
 * origem dos dados depois, mantendo esta API).
 *
 * Se o arquivo oficial tiver erro, o build/testes falham (não sobe catálogo inválido).
 */
import raw from "../../content/catalogo-oficial.json" with { type: "json" };
import { parseCatalogFile } from "./schema.ts";
import { buildCatalog, createCatalogApi } from "./build.ts";
import { DEMO_OVERLAY } from "../../demo/catalog-demo.ts";

const parsed = parseCatalogFile(raw);
if (!parsed.ok) {
  throw new Error(`Catálogo oficial inválido (src/content/catalogo-oficial.json):\n- ${parsed.errors.join("\n- ")}`);
}

/** Enquanto não houver aulas oficiais suficientes, as de exemplo preenchem os módulos vazios. */
export const INCLUDE_DEMO_LESSONS = true;

export const officialCatalogFile = parsed.file;
export const catalog = createCatalogApi(buildCatalog(parsed.file, INCLUDE_DEMO_LESSONS ? DEMO_OVERLAY : null));
