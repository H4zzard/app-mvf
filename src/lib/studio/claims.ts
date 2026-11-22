/**
 * Proteção de alegações (saúde/beleza, urgência e números de venda).
 *
 * Não bloqueia: AVISA. A aluna só deve usar uma alegação se ela constar nas
 * informações oficiais do produto. Também serve para conferir que os modelos
 * locais nunca escrevem esse tipo de promessa. Módulo puro.
 */

export type ClaimKind = "saude" | "urgencia" | "numeros";

export interface ClaimWarning {
  term: string;
  kind: ClaimKind;
  message: string;
}

const RULES: { kind: ClaimKind; re: RegExp }[] = [
  {
    kind: "saude",
    re: /(?<![\p{L}])(curas?|curar|trata|tratamento|elimina|eliminar|acaba com|emagrec\p{L}*|rejuvenesc\p{L}*|anti[- ]?idade|remove rugas|fim das rugas|milagr\p{L}*|garantid[oa]s?|100 ?%|cientificamente comprovad[oa]|clinicamente|dermatologicamente testad[oa]|sem efeitos colaterais|aprovad[oa] pela anvisa|resultado imediato|definitiv[oa])(?![\p{L}])/giu,
  },
  { kind: "urgencia", re: /(?<![\p{L}])(últimas unidades|só hoje|acaba hoje|estoque limitado|por tempo limitado|promoção relâmpago|corre que)(?![\p{L}])/giu },
  { kind: "numeros", re: /(?<![\p{L}])(mais vendid[oa]|vendi \d+|\d+ ?mil vendas|milhares de clientes)(?![\p{L}])/giu },
];

const MESSAGE: Record<ClaimKind, (t: string) => string> = {
  saude: (t) => `“${t}” é uma alegação de saúde ou beleza. Só use se constar nas informações oficiais do produto.`,
  urgencia: (t) => `“${t}” cria urgência. Só use se a condição for real e confirmada.`,
  numeros: (t) => `“${t}” cita números ou ranking de vendas. Não use sem fonte oficial.`,
};

export function findClaims(text: string): ClaimWarning[] {
  const seen = new Set<string>();
  const out: ClaimWarning[] = [];
  for (const { kind, re } of RULES) {
    for (const m of text.matchAll(re)) {
      const term = m[0].toLowerCase();
      if (seen.has(term)) continue;
      seen.add(term);
      out.push({ term, kind, message: MESSAGE[kind](term) });
    }
  }
  return out;
}
