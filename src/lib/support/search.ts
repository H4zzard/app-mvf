/**
 * Busca da Central de Ajuda. Módulo PURO.
 *
 * Tolera acentos, maiúsculas, plural e variações simples de palavras
 * (“vídeos” ≈ “video”, “acessar” ≈ “acesso”) e alguns sinônimos do domínio
 * (“login” ≈ “entrar” ≈ “acesso”). Sem dependências e sem rede.
 */

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const STOP = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "um", "uma", "para", "pra", "por", "com", "que", "meu", "minha", "eu", "nao", "como", "se", "ao", "me", "mais", "ja", "esta", "ta", "sobre", "qual", "quais", "onde", "posso", "consigo", "sem", "quero", "tem", "ter", "fazer", "faco"]);

/**
 * Radical simples para português (suficiente para a busca da ajuda), em três
 * passos, no máximo uma regra por passo: plural → derivação/verbo → vogal final.
 * Ex.: vídeos→vide, comissões/comissão→comiss, gravação/gravar/gravando→grav.
 */
export function stem(word: string): string {
  let w = normalize(word).replace(/[^a-z0-9]/g, "");
  if (w.length <= 3) return w;
  const passes: [RegExp, string][][] = [
    [
      [/coes$/, "cao"],
      [/oes$/, "ao"],
      [/aes$/, "ao"],
      [/ais$/, "al"],
      [/eis$/, "el"],
      [/ns$/, "m"],
      [/([rzs])es$/, "$1"],
      [/s$/, ""],
    ],
    [
      [/(acao|icao|ucao|cao)$/, ""],
      [/(ando|endo|indo)$/, ""],
      [/(amos|emos|imos)$/, ""],
      [/(ado|ada|ido|ida)$/, ""],
      [/(ar|er|ir)$/, ""],
    ],
    [[/[aoe]$/, ""]],
  ];
  for (const rules of passes) {
    for (const [re, rep] of rules) {
      const next = w.replace(re, rep);
      if (next !== w && next.length >= 3) {
        w = next;
        break;
      }
    }
  }
  return w;
}

/** Grupos de sinônimos (radicais). Termo de um grupo encontra qualquer outro do grupo. */
const SYNONYMS: string[][] = [
  ["acess", "entr", "login", "logar", "link", "magic", "senh"],
  ["vide", "aul", "modul", "curs"],
  ["tiktok", "shop", "loj", "afili", "vitrin"],
  ["estudi", "ia", "prompt", "gerad", "flow"],
  ["rotei", "fal", "script"],
  ["grav", "film", "camer"],
  ["comiss", "vend"],
  ["plan", "etap", "tarefa", "checklist"],
  ["live", "encontr", "agend"],
];

function expand(token: string): string[] {
  const group = SYNONYMS.find((g) => g.some((s) => token.startsWith(s) || s.startsWith(token)));
  return group ? [token, ...group] : [token];
}

/**
 * O termo (ou um sinônimo) aparece como prefixo de alguma palavra. O prefixo
 * invertido (“gravacao” ⊃ “grav”) vale só para o PRÓPRIO termo, com 5+ letras.
 */
function matches(list: string[], term: string): boolean {
  if (expand(term).some((v) => list.some((t) => t.startsWith(v)))) return true;
  return term.length >= 5 && list.some((t) => t.length >= 5 && term.startsWith(t));
}

export function tokens(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .map(stem)
    .filter(Boolean);
}

/**
 * Pontua o quanto os campos combinam com a consulta (0 = não combina).
 * Todo termo da consulta precisa aparecer (direto ou por sinônimo); termos
 * no título valem mais.
 */
export function helpScore(query: string, title: string, ...rest: string[]): number {
  const q = tokens(query);
  if (!q.length) return 0;
  const titleT = tokens(title);
  const bodyT = tokens(rest.join(" "));
  const hit = (list: string[], term: string) => matches(list, term);
  const direct = (list: string[], term: string) => list.some((t) => t.startsWith(term));
  let score = 0;
  for (const term of q) {
    if (hit(titleT, term)) score += direct(titleT, term) ? 4 : 3;
    else if (hit(bodyT, term)) score += 1;
    else return 0;
  }
  return score;
}

/** Ordena itens pela pontuação (estável), descartando os que não combinam. */
export function rankHelp<T>(query: string, items: T[], fields: (item: T) => [string, ...string[]]): T[] {
  const rank = (score: (q: string, ...f: [string, ...string[]]) => number, min: number) =>
    items
      .map((item, i) => ({ item, i, s: score(query, ...fields(item)) }))
      .filter((x) => x.s >= min)
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((x) => x.item);
  const strict = rank(helpScore, 1);
  // Nenhum item com TODOS os termos: mostra os que mais se aproximam.
  return strict.length ? strict : rank(overlapScore, 2);
}

/**
 * Sobreposição (para recomendar a partir de texto livre): soma os termos que
 * aparecem, sem exigir todos. Título vale mais.
 */
export function overlapScore(query: string, title: string, ...rest: string[]): number {
  const q = [...new Set(tokens(query))].filter((t) => t.length >= 3);
  if (!q.length) return 0;
  const titleT = tokens(title);
  const bodyT = tokens(rest.join(" "));
  const hit = (list: string[], term: string) => matches(list, term);
  return q.reduce((sum, term) => sum + (hit(titleT, term) ? 2 : hit(bodyT, term) ? 1 : 0), 0);
}
