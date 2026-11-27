/**
 * Modelo LOCAL do Assistente (sem IA) — só para a demonstração e testes.
 *
 * Não é um “chatbot de respostas fixas” fingindo ser IA: a interface o rotula
 * como “modelo local (sem IA)”. Ele usa a MESMA recuperação da base e o MESMO
 * histórico que o modelo real receberia, para validar o fluxo de ponta a ponta.
 * Nunca inventa conteúdo: só repete trechos recuperados. Módulo puro.
 */
import { normalize } from "../support/search.ts";
import { terms } from "./retrieval.ts";
import { detectHandoff, HANDOFF_LABEL } from "./escalation.ts";
import { wantsLesson } from "./decisions.ts";
import { ASSISTANT } from "./persona.ts";
import type { ChatTurn, ProviderResult, SupportProvider } from "./types.ts";

const OPENINGS = ["Ahh, entendi!", "Claro!", "Pode deixar!", "Entendi.", "Vamos resolver isso."];

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

/** Trechos do bloco <base_mvf> do contexto. */
function baseEntries(turns: ChatTurn[]): { title: string; lessonId: string | null; text: string }[] {
  const block = turns.find((t) => t.role === "system" && t.content.startsWith("<base_mvf>"))?.content ?? "";
  return [...block.matchAll(/\[\d+\] (.+?)\n([\s\S]*?)(?=\n\n\[\d+\] |\n<\/base_mvf>)/g)].map((m) => ({
    title: m[1].replace(/ \[aula: .*?\]/, "").replace(/ \(rascunho em revisão\)$/, ""),
    lessonId: m[1].match(/id da aula: ([a-z0-9-]+)\]/)?.[1] ?? null,
    text: m[2].trim(),
  }));
}

/**
 * Frases do trecho que mais respondem à pergunta (por termos em comum), na ordem
 * original e sem cortar no meio. Só reorganiza o que está na base: nada inventado.
 */
function relevantSentences(text: string, question: string, max = 300): string {
  const q = new Set(terms(question));
  // “?” não separa: mantém pergunta frequente + resposta juntas. Títulos de seção (“Onde fica no app.”) saem.
  const sentences = text
    .split(/(?<=[.!])\s+/)
    .map((x) => x.replace(/^(Pergunta frequente|Onde fica no app|Quem pode usar|Passo a passo|Limitações)\.\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter((x) => x.length > 3 && !/^\d+\.?$/.test(x));
  const scored = sentences.map((s, i) => {
    let score = terms(s).filter((t) => q.has(t) || [...q].some((x) => x.length > 3 && (t.startsWith(x) || x.startsWith(t)))).length;
    if (/^(Hoje as alunas|Para alunas, ainda|Disponível para|Na demonstração)/.test(s)) score -= 0.5; // aviso de disponibilidade não substitui a resposta
    return { s, i, score };
  });
  const best = [...scored].sort((a, b) => b.score - a.score || a.i - b.i);
  const chosen: typeof scored = [];
  let len = 0;
  for (const c of best) {
    if (c.score === 0 && chosen.length) break;
    if (len + c.s.length > max && chosen.length) break;
    chosen.push(c);
    len += c.s.length + 1;
  }
  return chosen.sort((a, b) => a.i - b.i).map((c) => c.s).join(" ");
}

export function createLocalProvider(): SupportProvider {
  return {
    label: "modelo local (sem IA)",
    kind: "local",
    async complete(turns: ChatTurn[]): Promise<ProviderResult> {
      const convo = turns.filter((t) => t.role !== "system");
      const last = [...convo].reverse().find((t) => t.role === "user")?.content ?? "";
      const n = normalize(last).trim();
      const seed = convo.length;

      if (/^(oi+|ola|bom dia|boa tarde|boa noite|e ai)[!. ]*$/.test(n)) {
        // A saudação já foi feita na abertura: não se apresenta de novo.
        return { ok: true, text: pick(["Oi! Me conta, em que posso te ajudar?", "Oii! Pode falar, tô aqui pra ajudar."], seed) };
      }
      if (/^(obrigad[ao]|valeu|brigad[ao])[!. 💗]*$/.test(n)) {
        return { ok: true, text: pick(["Imagina! Conseguiu resolver?", "Por nada! Deu certo por aí?"], seed) };
      }
      // Só quando a pergunta é SOBRE a Nina (“vc é um robô?”), não quando cita IA no assunto.
      if (/\b(voce|vc|tu|ce)\s+(e|eh|seria)\s+(um |uma )?(robo|bot|ia|inteligencia artificial|humana|humano|pessoa|gente|de verdade|real)\b|\b(to|estou) falando com (um |uma )?(robo|bot|ia|pessoa|humano|humana)\b/.test(n)) {
        return { ok: true, text: `Sou a ${ASSISTANT.name}, assistente virtual do MVF 😊 Se precisar de alguém da equipe, é só tocar em “Falar com a equipe”.` };
      }

      // Assunto da equipe (reembolso, cobrança…): não responde com a base, encaminha.
      const handoff = detectHandoff(last);
      if (handoff) {
        const money = handoff === "reembolso" || handoff === "cobranca" || handoff === "pagamento";
        return {
          ok: true,
          text: `Entendi${money ? "." : " 💗"} Nesse caso (${HANDOFF_LABEL[handoff].toLowerCase()}), quem consegue verificar direitinho é nossa equipe responsável. Toque em “Falar com a equipe” aqui no chat, tá?`,
        };
      }

      const entries = baseEntries(turns);
      if (!entries.length) {
        return {
          ok: true,
          text: "Hmm, sobre isso eu ainda não tenho uma orientação confirmada aqui no MVF. Me conta um pouquinho mais do que vc precisa? Se for algo da sua conta ou pagamento, te mostro como falar com a equipe.",
        };
      }
      // Junta os trechos do MESMO documento que veio em primeiro (um guia pode ter vários trechos).
      const top = { ...entries[0], text: entries.filter((e) => e.title === entries[0].title).map((e) => e.text).join(" ") };
      const question = convo.filter((t) => t.role === "user").slice(-2).map((t) => t.content).join(" ");
      const parts = [pick(OPENINGS, seed), relevantSentences(top.text, question)];
      // Aula como fonte principal: oferece o botão pelo protocolo (o servidor valida o id).
      if (top.lessonId && wantsLesson(question)) {
        return { ok: true, text: `${pick(["Achei!", "Encontrei aqui!"], seed)} A aula “${top.title}” fala disso. ${relevantSentences(top.text, question, 180)} Deixei o botão aqui embaixo pra vc abrir 😊\n[[aula:${top.lessonId}]]` };
      }
      parts.push("Quer que eu explique algum passo com mais calma?");
      return { ok: true, text: parts.join(" ") };
    },
  };
}
