/**
 * Comparação (antes × depois) e serialização CSV para o painel. Módulo PURO.
 */

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

const show = (v: unknown): string => {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
};

/** Campos de primeiro nível que mudaram (objetos/listas comparados por JSON). */
export function diffFields(before: object | null, after: object, labels: Record<string, string> = {}): FieldChange[] {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return keys
    .filter((k) => JSON.stringify(b[k] ?? null) !== JSON.stringify(a[k] ?? null))
    .map((k) => ({ field: labels[k] ?? k, before: before ? show(b[k]) : "(novo)", after: show(a[k]) }));
}

/** Uma célula CSV (RFC 4180): aspas quando há vírgula, aspas ou quebra de linha. */
export function csvCell(v: string): string {
  // Evita fórmula ao abrir no Sheets/Excel (=, +, @ no início).
  const safe = /^[=+@]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv<C extends string>(columns: C[], rows: Record<C, string>[]): string {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c] ?? "")).join(","))].join("\n") + "\n";
}
