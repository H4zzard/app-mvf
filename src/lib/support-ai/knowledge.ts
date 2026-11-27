/**
 * Base de conhecimento do Assistente MVF — pipeline PURO de importação.
 *
 * validar → extrair texto → segmentar → metadados → prévia → duplicatas →
 * versões → indexar → publicar só o que está APROVADO.
 *
 * Formatos aceitos agora: .md, .txt, .vtt e .srt (transcrições). PDF exige
 * extração de texto fora do app (ver docs/SUPORTE_IA.md) — é recusado aqui,
 * nunca “lido pela metade”.
 */
import type { ApprovalStatus, KnowledgeAccess, KnowledgeChunk, KnowledgeDocument, KnowledgeType } from "./types.ts";

export const KNOWLEDGE_TYPES: KnowledgeType[] = [
  "transcricao",
  "pdf",
  "material",
  "faq",
  "documento_interno",
  "tutorial_app",
  "guia_tiktok_shop",
  "regras",
  "produto",
  "procedimento_atendimento",
];
const STATUSES: ApprovalStatus[] = ["rascunho", "em_revisao", "aprovado", "arquivado"];
const ACCESS: KnowledgeAccess[] = ["alunas", "equipe"];

export const ACCEPTED_EXTENSIONS = [".md", ".txt", ".vtt", ".srt"] as const;

/** Hash FNV-1a de 32 bits (hex). Determinístico, sem dependências — só para detectar repetição. */
export function textHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/* ------------------------------ Extração ------------------------------ */

/** Remove numeração e marcas de tempo de legendas (.vtt/.srt), mantendo só a fala. */
export function stripSubtitles(raw: string): string {
  return raw
    .replace(/^WEBVTT.*$/m, "")
    .split(/\r?\n/)
    .filter((l) => !/^\d+$/.test(l.trim()) && !/-->/.test(l) && !/^(NOTE|STYLE|REGION)\b/.test(l.trim()))
    .map((l) => l.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .join(" ");
}

/** Normaliza o texto extraído: quebras consistentes, sem espaços sobrando, sem caracteres de controle. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Cabeçalho simples no topo do arquivo (estilo front matter):
 * ---
 * id: aula-configurar-perfil
 * title: Como configurar o perfil
 * type: transcricao
 * ...
 * ---
 */
export function parseFrontMatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

export type ParseResult = { ok: true; doc: KnowledgeDocument } | { ok: false; errors: string[] };

const ID_RE = /^[a-z0-9][a-z0-9-]{2,80}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida um arquivo de conhecimento (nome + conteúdo bruto) e devolve o documento normalizado. */
export function parseKnowledgeFile(fileName: string, raw: string): ParseResult {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf") return { ok: false, errors: ["PDF precisa de extração de texto antes (ver docs/SUPORTE_IA.md). Envie o .txt extraído."] };
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) return { ok: false, errors: [`Formato não aceito: ${ext}. Use ${ACCEPTED_EXTENSIONS.join(", ")}.`] };
  if (raw.includes("�")) return { ok: false, errors: ["O arquivo não está em UTF-8 válido."] };
  const { meta, body } = parseFrontMatter(raw);
  const content = cleanText(ext === ".vtt" || ext === ".srt" ? stripSubtitles(body) : body);
  // Campos pedagógicos opcionais da aula/módulo entram no texto indexado (melhoram a busca).
  const header = [
    meta.objective ? `Objetivo. ${meta.objective}` : "",
    meta.topics ? `Assuntos abordados. ${meta.topics}` : "",
    meta.keywords ? `Palavras-chave e dúvidas relacionadas. ${meta.keywords}` : "",
    meta.prerequisites ? `Pré-requisitos. ${meta.prerequisites}` : "",
  ].filter(Boolean);
  const text = header.length ? `${header.join("\n\n")}\n\n${content}` : content;
  return validateDocument({
    id: meta.id ?? "",
    title: meta.title ?? "",
    origin: meta.origin ?? fileName,
    type: (meta.type ?? (ext === ".vtt" || ext === ".srt" ? "transcricao" : "")) as KnowledgeType,
    moduleId: meta.module || undefined,
    lessonId: meta.lesson || undefined,
    version: Number(meta.version ?? "1"),
    updatedAt: meta.updated ?? "",
    status: (meta.status ?? "rascunho") as ApprovalStatus,
    access: (meta.access ?? "alunas") as KnowledgeAccess,
    text,
  });
}

export function validateDocument(d: KnowledgeDocument): ParseResult {
  const errors: string[] = [];
  if (!ID_RE.test(d.id)) errors.push("id inválido (minúsculas, números e hífen; 3–81 caracteres).");
  if (d.title.trim().length < 3) errors.push("title obrigatório.");
  if (!KNOWLEDGE_TYPES.includes(d.type)) errors.push(`type inválido (use: ${KNOWLEDGE_TYPES.join(", ")}).`);
  if (!Number.isInteger(d.version) || d.version < 1) errors.push("version deve ser inteiro ≥ 1.");
  if (!DATE_RE.test(d.updatedAt)) errors.push("updated deve ser AAAA-MM-DD.");
  if (!STATUSES.includes(d.status)) errors.push(`status inválido (use: ${STATUSES.join(", ")}).`);
  if (!ACCESS.includes(d.access)) errors.push("access deve ser alunas ou equipe.");
  if (d.text.length < 40) errors.push("texto vazio ou curto demais depois da extração.");
  if (/https?:\/\/\S+\.(mp4|m3u8|mov)\b/i.test(d.text)) errors.push("não coloque URL de vídeo no texto (só referência à aula).");
  if (/\((cole aqui|escreva|descreva|objetivo da aula|assuntos, separados|palavras e d[uú]vidas|m[oó]dulos ou aulas que v[eê]m antes)/i.test(d.text)) errors.push("modelo ainda não preenchido: troque os textos entre parênteses pelo conteúdo real.");
  return errors.length ? { ok: false, errors } : { ok: true, doc: d };
}

/* ------------------------------ Segmentação ------------------------------ */

/**
 * Divide em trechos de ~`target` caracteres respeitando parágrafos e frases,
 * com uma frase de sobreposição para não perder contexto na fronteira.
 */
export function chunkDocument(doc: KnowledgeDocument, target = 700): KnowledgeChunk[] {
  const sentences = doc.text
    .split(/\n{2,}/)
    .flatMap((p) => p.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let cur: string[] = [];
  let len = 0;
  for (const s of sentences) {
    if (len + s.length > target && cur.length) {
      chunks.push(cur.join(" "));
      cur = [cur[cur.length - 1]]; // sobreposição de uma frase
      len = cur[0].length;
    }
    cur.push(s);
    len += s.length + 1;
  }
  if (cur.length) chunks.push(cur.join(" "));
  return chunks.map((text, ord) => ({ id: `${doc.id}#${ord}`, docId: doc.id, ord, text, hash: textHash(text) }));
}

/* ------------------------- Prévia, duplicatas e versões ------------------------- */

export interface ImportPlanItem {
  id: string;
  title: string;
  action: "novo" | "nova_versao" | "sem_mudanca" | "conflito_versao" | "duplicado";
  status: ApprovalStatus;
  chunks: number;
  note?: string;
}

/**
 * Compara a importação com o que já existe. Nunca sobrescreve em silêncio:
 * texto igual = sem mudança; texto diferente exige versão maior; mesmo texto
 * com outro id = duplicado.
 */
export function planImport(incoming: KnowledgeDocument[], existing: KnowledgeDocument[]): ImportPlanItem[] {
  const byId = new Map(existing.map((d) => [d.id, d]));
  const byHash = new Map(existing.map((d) => [textHash(d.text), d.id]));
  const seen = new Map<string, string>();
  return incoming.map((d) => {
    const h = textHash(d.text);
    const chunks = chunkDocument(d).length;
    const base = { id: d.id, title: d.title, status: d.status, chunks };
    const dupOf = byHash.get(h) ?? seen.get(h);
    seen.set(h, d.id);
    const old = byId.get(d.id);
    if (!old) return dupOf && dupOf !== d.id ? { ...base, action: "duplicado" as const, note: `mesmo texto de ${dupOf}` } : { ...base, action: "novo" as const };
    if (textHash(old.text) === h && old.status === d.status) return { ...base, action: "sem_mudanca" as const };
    if (d.version <= old.version) return { ...base, action: "conflito_versao" as const, note: `texto mudou: use version > ${old.version}` };
    return { ...base, action: "nova_versao" as const };
  });
}

/** Só documentos aprovados entram no atendimento real. O modo demo pode usar rascunhos (rotulados). */
export function usableDocuments(docs: KnowledgeDocument[], opts: { includeDrafts: boolean; audience: KnowledgeAccess }): KnowledgeDocument[] {
  return docs.filter(
    (d) =>
      d.status !== "arquivado" &&
      (d.status === "aprovado" || opts.includeDrafts) &&
      (d.access === "alunas" || opts.audience === "equipe"),
  );
}

/* ------------------------- Injeção de instruções ------------------------- */

const INJECTION: RegExp[] = [
  /ignor[ea]\w*\s+(todas\s+)?(as\s+)?(instru[cç][oõ]es|regras|orienta[cç][oõ]es)/i,
  /ignore\s+(all\s+|any\s+)?(previous|prior|above)\s+(instructions|rules)/i,
  /(system\s*prompt|prompt\s+do\s+sistema|instru[cç][oõ]es\s+do\s+sistema)/i,
  /voc[eê]\s+(agora\s+)?([eé]|ser[aá])\s+(um|uma)\s+(outr[oa]|nov[oa])/i,
  /you\s+are\s+now\b/i,
  /revel[ae]\w*\s+(as\s+)?(suas\s+|tuas\s+)?(instru[cç][oõ]es|regras|prompt)/i,
  /<\s*\/?\s*(system|base_mvf|resumo_da_conversa)\s*>/i,
];

/** Trecho tenta dar ordens ao modelo? (fica FORA do contexto e é sinalizado na importação). */
export function looksLikeInjection(text: string): boolean {
  return INJECTION.some((re) => re.test(text));
}
