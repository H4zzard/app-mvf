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
import type { ChatTurn, ProviderResult, SupportProvider } from "./types.ts";

const OPENINGS = ["Entendi.", "Certo.", "Pode deixar.", "Claro!", "Tudo bem."];

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

/** Trechos do bloco <base_mvf> do contexto. */
function baseEntries(turns: ChatTurn[]): { title: string; lesson: boolean; text: string }[] {
  const block = turns.find((t) => t.role === "system" && t.content.startsWith("<base_mvf>"))?.content ?? "";
  return [...block.matchAll(/\[\d+\] (.+?)\n([\s\S]*?)(?=\n\n\[\d+\] |\n<\/base_mvf>)/g)].map((m) => ({
    title: m[1].replace(/ \[aula: .*?\]/, "").replace(/ \(rascunho em revisão\)$/, ""),
    lesson: m[1].includes("[aula:"),
    text: m[2].trim(),
  }));
}

/**
 * Frases do trecho que mais respondem à pergunta (por termos em comum), na ordem
 * original e sem cortar no meio. Só reorganiza o que está na base: nada inventado.
 */
function relevantSentences(text: string, question: string, max = 300): string {
  const q = new Set(terms(question));
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const scored = sentences.map((s, i) => ({ s, i, score: terms(s).filter((t) => q.has(t) || [...q].some((x) => x.length > 3 && (t.startsWith(x) || x.startsWith(t)))).length }));
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
        return { ok: true, text: pick(["Oii! Me conta, em que posso te ajudar?", "Oi! Como posso te ajudar hoje?"], seed) };
      }
      if (/\b(obrigad[ao]|valeu|resolvi|deu certo|consegui)\b/.test(n)) {
        return { ok: true, text: pick(["Que bom! 💗 Precisa de mais alguma coisa?", "Fico feliz que deu certo. Posso ajudar em mais algo?"], seed) };
      }
      if (/\b(robo|bot|ia|automatic|humano|pessoa de verdade)\b/.test(n) && /\?/.test(last)) {
        return { ok: true, text: "Sou um atendimento automatizado do MVF. Se precisar de alguém da equipe, toque em “Falar com a equipe”." };
      }

      // Assunto da equipe (reembolso, cobrança…): não responde com a base, encaminha.
      const handoff = detectHandoff(last);
      if (handoff) {
        return {
          ok: true,
          text: `Entendi. ${HANDOFF_LABEL[handoff]} precisa ser visto pela equipe MVF, porque eu não consigo alterar conta, matrícula, cobrança ou reembolso. Toque em “Falar com a equipe” aqui no chat.`,
        };
      }

      const entries = baseEntries(turns);
      if (!entries.length) {
        return {
          ok: true,
          text: "Ainda não tenho uma orientação confirmada sobre isso na base do MVF. Pode me contar um pouco mais do que está acontecendo? Se for algo de conta ou pagamento, posso te encaminhar para a equipe.",
        };
      }
      const [top] = entries;
      const question = convo.filter((t) => t.role === "user").slice(-2).map((t) => t.content).join(" ");
      const parts = [pick(OPENINGS, seed), relevantSentences(top.text, question)];
      // Só aponta aula quando ela É a fonte principal (sem afirmar relação que não foi confirmada).
      if (top.lesson) parts.push(`Isso está na aula “${top.title}”.`);
      parts.push("Quer que eu explique algum passo com mais calma?");
      return { ok: true, text: parts.join(" ") };
    },
  };
}
