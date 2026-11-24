/**
 * Prints de instrução da jornada (capturas REAIS fornecidas pela equipe).
 * Manifesto: src/content/jornada-prints.json. Arquivos: public/jornada/.
 * Nunca usar imagem genérica como se mostrasse o procedimento. Módulo PURO.
 */
import raw from "../../content/jornada-prints.json" with { type: "json" };
import type { StepPrint } from "./types.ts";

const SRC = /^\/jornada\/[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePrintsManifest(data: unknown, stepIds: Set<string>): { ok: true; prints: StepPrint[] } | { ok: false; errors: string[] } {
  if (typeof data !== "object" || data === null || (data as { version?: unknown }).version !== 1 || !Array.isArray((data as { prints?: unknown }).prints)) {
    return { ok: false, errors: ["Manifesto inválido: esperado { version: 1, prints: [] }."] };
  }
  const errors: string[] = [];
  const prints: StepPrint[] = [];
  const seen = new Set<string>();
  ((data as { prints: unknown[] }).prints).forEach((x, i) => {
    const p = x as StepPrint;
    const at = `prints[${i}]`;
    if (typeof p !== "object" || p === null) return errors.push(`${at}: objeto inválido.`);
    if (!stepIds.has(p.stepId)) errors.push(`${at}: etapa inexistente ${p.stepId}.`);
    if (!Number.isInteger(p.order) || p.order < 1) errors.push(`${at}: order inteiro ≥ 1.`);
    if (typeof p.src !== "string" || !SRC.test(p.src)) errors.push(`${at}: src deve ser /jornada/arquivo.webp|png|jpg (arquivo local, sem URL).`);
    if (typeof p.alt !== "string" || p.alt.trim().length < 10) errors.push(`${at}: alt descritivo obrigatório.`);
    if (typeof p.caption !== "string") errors.push(`${at}: caption (pode ser vazia).`);
    if (typeof p.screen !== "string" || !p.screen.trim()) errors.push(`${at}: informe o app/tela mostrada.`);
    if (typeof p.capturedAt !== "string" || !DATE.test(p.capturedAt)) errors.push(`${at}: capturedAt AAAA-MM-DD.`);
    if (p.tapHint && !(p.tapHint.x >= 0 && p.tapHint.x <= 100 && p.tapHint.y >= 0 && p.tapHint.y <= 100)) errors.push(`${at}: tapHint em % (0–100).`);
    const key = `${p.stepId}#${p.order}`;
    if (seen.has(key)) errors.push(`${at}: ordem repetida para ${p.stepId}.`);
    seen.add(key);
    prints.push(p);
  });
  return errors.length ? { ok: false, errors } : { ok: true, prints };
}

let cache: StepPrint[] | null = null;

/** Prints de uma etapa, na ordem. Manifesto inválido → erro (build/testes falham). */
export function printsFor(stepId: string, stepIds: Set<string>): StepPrint[] {
  if (!cache) {
    const r = parsePrintsManifest(raw, stepIds);
    if (!r.ok) throw new Error(`Manifesto de prints inválido (src/content/jornada-prints.json):\n- ${r.errors.join("\n- ")}`);
    cache = r.prints;
  }
  return cache.filter((p) => p.stepId === stepId).sort((a, b) => a.order - b.order);
}
