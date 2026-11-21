/**
 * Limitador simples em memória (por instância do servidor), complementar aos
 * limites do próprio Supabase Auth (1 link/60 s por e-mail por padrão).
 * Em múltiplas instâncias, cada uma tem seu contador — aceitável como camada extra.
 * Módulo puro (relógio injetável).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(limit: number, windowMs: number, now: () => number = Date.now) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** Registra a tentativa e diz se está dentro do limite. */
  take(key: string): boolean {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((x) => x > t - this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.hits.clear(); // evita crescimento ilimitado
    return true;
  }
}
