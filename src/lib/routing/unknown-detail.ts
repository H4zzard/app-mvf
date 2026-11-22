/**
 * Rotas de DETALHE com ID inexistente (aulas e produtos). Usado pelo Proxy para
 * responder HTTP 404 ANTES da renderização: com Cache Components, um
 * `notFound()` dentro da página chega depois do início do streaming (status 200),
 * como explica a documentação do Next (“The HTTP contract”).
 *
 * As rotas válidas não mudam: IDs existentes (e aliases de aulas, que redirecionam)
 * seguem para a página normalmente. A página mantém o `notFound()` como segunda defesa.
 */
import { catalog } from "../catalog/index.ts";
import { productCatalog } from "../products/index.ts";

const DETAIL = /^\/(aulas|marketplace)\/([^/]+)\/?$/;

export function isUnknownDetailPath(pathname: string): boolean {
  const m = DETAIL.exec(pathname);
  if (!m) return false;
  let id: string;
  try {
    id = decodeURIComponent(m[2]);
  } catch {
    return true; // codificação inválida nunca é um ID válido
  }
  if (m[1] === "aulas") return !catalog.getLesson(id);
  return !productCatalog.get(id);
}

/** Caminho sem rota correspondente: o Next responde 404 com a página “não encontrada”. */
export const NOT_FOUND_REWRITE = "/__mvf-nao-encontrado";
