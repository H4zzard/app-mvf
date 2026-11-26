/**
 * Cliente da API oficial da DeepSeek (formato OpenAI) — usado SÓ no servidor.
 *
 * POST {baseUrl}/chat/completions · Authorization: Bearer <chave>.
 * Modelo padrão `deepseek-flash` (conferido na documentação em 26/11/2026),
 * modo de raciocínio desligado (respostas curtas e rápidas), sem ferramentas
 * (nada de busca web, código ou ações externas).
 * `fetch` é injetável para testes. Nunca registra a chave nem o conteúdo.
 */
import { textHash } from "./knowledge.ts";
import type { ChatTurn, ProviderErrorCode, ProviderResult, SupportProvider } from "./types.ts";

export interface DeepSeekOptions {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxOutputTokens: number;
  fetchImpl?: typeof fetch;
}

export function mapHttpError(status: number): ProviderErrorCode {
  if (status === 401 || status === 403) return "auth";
  if (status === 402) return "budget";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 413 || status === 422) return "invalid";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "unavailable";
  return "unknown";
}

/** Identificador anônimo para o campo `user_id` da DeepSeek (sem dado pessoal). */
export const anonymousUserId = (userKey: string) => `mvf-${textHash(`mvf:${userKey}`)}`;

export function createDeepSeekProvider(opts: DeepSeekOptions): SupportProvider {
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    label: "Assistente com IA (DeepSeek)",
    kind: "deepseek",
    async complete(turns: ChatTurn[], { userKey, signal }): Promise<ProviderResult> {
      let res: Response;
      try {
        res = await doFetch(`${opts.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
          body: JSON.stringify({
            model: opts.model,
            messages: turns,
            max_tokens: opts.maxOutputTokens,
            temperature: 0.7,
            stream: false,
            thinking: { type: "disabled" },
            user_id: anonymousUserId(userKey),
          }),
          signal,
          cache: "no-store",
        });
      } catch (e) {
        if (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError")) return { ok: false, error: "timeout" };
        return { ok: false, error: "unavailable" };
      }
      if (!res.ok) return { ok: false, error: mapHttpError(res.status) };
      try {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string | null } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) return { ok: false, error: "invalid" };
        return { ok: true, text, usage: { input: data.usage?.prompt_tokens ?? 0, output: data.usage?.completion_tokens ?? 0 } };
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return { ok: false, error: "timeout" };
        return { ok: false, error: "invalid" };
      }
    },
  };
}
