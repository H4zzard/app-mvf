/**
 * Recuperação de conhecimento (RAG) — 1ª implementação: busca TEXTUAL.
 *
 * Mesma estratégia que a migration prepara no Postgres (tsvector português +
 * ranking); aqui em memória para o modo demo e para testes. A interface
 * `Retriever` permite trocar por busca semântica (pgvector) depois, sem mexer
 * no restante. Módulo puro.
 */
import { normalize, stem } from "../support/search.ts";
import { chunkDocument, looksLikeInjection } from "./knowledge.ts";
import type { KnowledgeChunk, KnowledgeDocument } from "./types.ts";

export interface RetrievedChunk {
  chunk: KnowledgeChunk;
  doc: KnowledgeDocument;
  score: number;
}

export interface Retriever {
  search(query: string, opts?: { limit?: number }): Promise<RetrievedChunk[]>;
}

const STOP = new Set(
  "a o as os de da do das dos e em no na nos nas um uma uns umas para pra por com que meu minha eu nao como se ao me mais ja esta ta sobre qual quais onde posso consigo sem quero tem ter fazer faco voce vc isso esse essa ele ela oi oii ola bom boa dia tarde noite obrigada obrigado ajuda ajudar preciso".split(" "),
);

export function terms(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem)
    .filter((w) => w.length > 1);
}

/** Índice em memória com BM25 simplificado sobre os trechos dos documentos utilizáveis. */
export function createMemoryRetriever(docs: KnowledgeDocument[], opts: { minScore?: number } = {}): Retriever & { size: number; skipped: string[] } {
  const skipped: string[] = [];
  const entries: { chunk: KnowledgeChunk; doc: KnowledgeDocument; tf: Map<string, number>; len: number; norm: string; titleTerms: Set<string> }[] = [];
  for (const doc of docs) {
    for (const chunk of chunkDocument(doc)) {
      // Trecho com cara de instrução ao modelo nunca vai para o contexto.
      if (looksLikeInjection(chunk.text)) {
        skipped.push(chunk.id);
        continue;
      }
      const ts = terms(`${doc.title} ${chunk.text}`);
      const tf = new Map<string, number>();
      for (const t of ts) tf.set(t, (tf.get(t) ?? 0) + 1);
      entries.push({ chunk, doc, tf, len: ts.length, norm: normalize(`${doc.title} ${chunk.text}`).replace(/[^a-z0-9]+/g, " "), titleTerms: new Set(terms(doc.title)) });
    }
  }
  const N = entries.length || 1;
  const avg = entries.reduce((s, e) => s + e.len, 0) / N || 1;
  const df = new Map<string, number>();
  for (const e of entries) for (const t of e.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const minScore = opts.minScore ?? 1.2;

  return {
    size: entries.length,
    skipped,
    async search(query, o = {}) {
      const q = [...new Set(terms(query))];
      if (!q.length) return [];
      // Pares de palavras da pergunta (inclui “sem aparecer”, “meus produtos”): bônus por frase exata.
      const words = normalize(query).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
      const bigrams = words.slice(1).map((w, i) => `${words[i]} ${w}`).filter((b) => b.length >= 9 && !/^(como|onde|qual|que|eu|o|a|de|do|da) /.test(b));
      const k1 = 1.2;
      const b = 0.75;
      const scored = entries
        .map((e) => {
          let score = 0;
          let matched = 0;
          let rareMatch = false;
          for (const t of q) {
            // prefixo (radicais curtos) conta como ocorrência
            let f = e.tf.get(t) ?? 0;
            if (!f) for (const [k, v] of e.tf) if (k.length > 3 && t.length > 3 && (k.startsWith(t) || t.startsWith(k))) f += v * 0.6;
            if (!f) continue;
            matched++;
            if ((df.get(t) ?? 0) / N < 0.12) rareMatch = true;
            const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
            score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * e.len) / avg));
          }
          for (const bg of bigrams) if (e.norm.includes(` ${bg} `) || e.norm.startsWith(`${bg} `)) score += 3;
          // Título que cobre a pergunta inteira (guias são nomeados pela tarefa: “Como salvar produtos”).
          const inTitle = (t: string) => [...e.titleTerms].some((k) => k === t || (k.length > 3 && t.length > 3 && (k.startsWith(t) || t.startsWith(k))));
          if (q.length >= 2 && q.every(inTitle)) score += 2;
          // Um termo comum sozinho (ex.: “gravar”) não basta para afirmar que o trecho responde.
          if (q.length >= 2 && matched < 2 && !rareMatch) score = 0;
          return { chunk: e.chunk, doc: e.doc, score };
        })
        .filter((r) => r.score >= minScore)
        .sort((a, b2) => b2.score - a.score);
      // No máximo 2 trechos por documento, para variar as fontes.
      const perDoc = new Map<string, number>();
      const out: RetrievedChunk[] = [];
      for (const r of scored) {
        const n = perDoc.get(r.doc.id) ?? 0;
        if (n >= 2) continue;
        perDoc.set(r.doc.id, n + 1);
        out.push(r);
        if (out.length >= (o.limit ?? 4)) break;
      }
      return out;
    },
  };
}
