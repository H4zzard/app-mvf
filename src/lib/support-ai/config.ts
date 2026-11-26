/**
 * Configuração do Assistente MVF (somente servidor — recebe `env`, módulo puro e testável).
 *
 * Segurança: a chave da DeepSeek NUNCA usa prefixo NEXT_PUBLIC_ e nunca sai do servidor.
 * Padrões conservadores: tudo desligado até a ativação autorizada.
 */
type Env = Record<string, string | undefined>;

export type SupportStoreKind = "memory" | "supabase";

export interface SupportConfig {
  /** Liga o chat para contas reais (com banco). No modo demo o chat existe com o adaptador em memória. */
  enabled: boolean;
  /** Onde ficam as conversas. "supabase" só depois da migration aplicada e autorizada. */
  store: SupportStoreKind;
  deepseek: { apiKey: string; model: string; baseUrl: string } | null;
  /** Mensagens da aluna por atendimento. */
  maxMessagesPerConversation: number;
  /** Mensagens da aluna em 24 h (proteção de custo/abuso). */
  dailyMessagesPerUser: number;
  /** Tokens máximos de saída por resposta. */
  maxOutputTokens: number;
  timeoutMs: number;
  /** Caracteres por mensagem da aluna. */
  maxMessageChars: number;
  /** Quantas mensagens recentes vão inteiras ao modelo (o resto vira resumo). */
  recentWindow: number;
  /** Encerramento por inatividade (min). null = desligado. Requer job de servidor (ver docs/SUPORTE_IA.md). */
  inactivityCloseMinutes: number | null;
  /** Retenção das conversas em dias. null = política ainda não aprovada (não apaga nada). */
  retentionDays: number | null;
}

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

function int(v: string | undefined, def: number, min: number, max: number): number {
  const n = Number.parseInt(clean(v) ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

function optionalInt(v: string | undefined, min: number, max: number): number | null {
  const n = Number.parseInt(clean(v) ?? "", 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export const DEEPSEEK_DEFAULT_MODEL = "deepseek-flash";
export const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com";

export function readSupportConfig(env: Env = process.env): SupportConfig {
  const apiKey = clean(env.DEEPSEEK_API_KEY);
  const baseUrl = (clean(env.DEEPSEEK_BASE_URL) ?? DEEPSEEK_DEFAULT_BASE_URL).replace(/\/$/, "");
  return {
    enabled: env.MVF_SUPPORT_AI_ENABLED === "true",
    store: env.MVF_SUPPORT_STORE === "supabase" ? "supabase" : "memory",
    // Só aceita HTTPS (evita mandar a chave em texto claro por engano).
    deepseek: apiKey && baseUrl.startsWith("https://") ? { apiKey, model: clean(env.DEEPSEEK_MODEL) ?? DEEPSEEK_DEFAULT_MODEL, baseUrl } : null,
    maxMessagesPerConversation: int(env.MVF_SUPPORT_MAX_MESSAGES, 30, 1, 200),
    dailyMessagesPerUser: int(env.MVF_SUPPORT_DAILY_LIMIT, 60, 1, 1000),
    maxOutputTokens: int(env.MVF_SUPPORT_MAX_TOKENS, 600, 64, 4000),
    timeoutMs: int(env.MVF_SUPPORT_TIMEOUT_MS, 25_000, 2_000, 120_000),
    maxMessageChars: 1000,
    recentWindow: 12,
    inactivityCloseMinutes: optionalInt(env.MVF_SUPPORT_INACTIVITY_MINUTES, 5, 24 * 60),
    retentionDays: optionalInt(env.MVF_SUPPORT_RETENTION_DAYS, 1, 3650),
  };
}

/**
 * O chat pode atender esta sessão?
 * - demo local: sim (adaptador em memória; DeepSeek só se o operador configurar a chave E ligar a flag);
 * - conta real: só com a flag ligada E o banco do suporte (store "supabase"). Senão, “Em breve”.
 */
export function chatAvailability(config: SupportConfig, viewerKind: "demo" | "member"): { available: boolean; reason?: "disabled" | "no_store" } {
  if (viewerKind === "demo") return { available: true };
  if (!config.enabled) return { available: false, reason: "disabled" };
  if (config.store !== "supabase") return { available: false, reason: "no_store" };
  return { available: true };
}

/** Usar a DeepSeek? Só com chave + flag ligada. Sem isso, o modelo local (rotulado) responde na demo. */
export function remoteModelEnabled(config: SupportConfig): boolean {
  return config.enabled && config.deepseek !== null;
}
