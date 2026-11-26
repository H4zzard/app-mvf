/**
 * Transcrição TXT do atendimento — formato ÚNICO (memória e banco usam esta função).
 *
 * - Datas guardadas em UTC; exibidas em America/Recife.
 * - Mensagens completas, na ordem (`seq`), sem resumir nem alterar o texto.
 * - Saída em UTF-8 com quebras \n. Módulo puro.
 */
import type { SupportConversation, SupportMessage } from "./types.ts";

export const TRANSCRIPT_TIME_ZONE = "America/Recife";

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TRANSCRIPT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** “26/11/2026 15:23:10” no fuso de Recife a partir de um ISO em UTC. */
export function formatRecife(iso: string): string {
  const parts = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

const SENDER_LABEL: Record<SupportMessage["sender"], string> = {
  student: "ALUNA",
  assistant: "ASSISTENTE MVF",
  system: "SISTEMA",
};

const STATUS_LABEL = { open: "Em andamento", closing: "Encerrando", closed: "Encerrado" } as const;

export class TranscriptError extends Error {}

/**
 * Gera o TXT. Recusa (lança) se a sequência de mensagens tiver buraco ou
 * repetição — melhor falhar o arquivamento do que salvar histórico incompleto.
 */
export function buildTranscript(conv: SupportConversation, messages: SupportMessage[], closedAt: string): string {
  const ordered = [...messages].sort((a, b) => a.seq - b.seq);
  ordered.forEach((m, i) => {
    if (m.seq !== i + 1) throw new TranscriptError(`sequência inválida na mensagem ${m.id} (esperado ${i + 1}, veio ${m.seq})`);
    if (m.conversationId !== conv.id) throw new TranscriptError(`mensagem ${m.id} não pertence ao atendimento ${conv.id}`);
  });
  const lines = [
    "ATENDIMENTO MVF",
    `ID: ${conv.id}`,
    `Aluna: ${conv.ownerLabel}`,
    `Início: ${formatRecife(conv.startedAt)}`,
    `Encerramento: ${formatRecife(closedAt)}`,
    `Fuso horário: ${TRANSCRIPT_TIME_ZONE}`,
    ...(conv.handoffRequestedAt ? [`Encaminhamento solicitado: ${formatRecife(conv.handoffRequestedAt)}${conv.handoffTopic ? ` (${conv.handoffTopic})` : ""}`] : []),
    `Mensagens: ${ordered.length}`,
    "",
  ];
  for (const m of ordered) {
    lines.push(`[${formatRecife(m.createdAt)}] ${SENDER_LABEL[m.sender]}`);
    lines.push(m.content);
    lines.push("");
  }
  lines.push("FIM DO ATENDIMENTO");
  lines.push(`Status: ${STATUS_LABEL.closed}`);
  return `${lines.join("\n")}\n`;
}

/** Nome de arquivo seguro para o download. */
export function transcriptFileName(conv: Pick<SupportConversation, "id" | "startedAt">): string {
  const d = formatRecife(conv.startedAt).slice(0, 10).split("/").reverse().join("-");
  return `atendimento-mvf-${d}-${conv.id.slice(0, 8)}.txt`;
}
