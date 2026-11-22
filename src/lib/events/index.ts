/**
 * Agenda usada pelo app: arquivo OFICIAL (vazio até a equipe informar datas)
 * + eventos DEMONSTRATIVOS (sem data). Arquivo inválido → build e testes falham.
 */
import raw from "../../content/agenda-oficial.json" with { type: "json" };
import { DEMO_EVENTS } from "../../demo/agenda.ts";
import { validateEvent, type CommunityEvent } from "./schedule.ts";

function parseOfficial(data: unknown): CommunityEvent[] {
  if (typeof data !== "object" || data === null || (data as { version?: unknown }).version !== 1 || !Array.isArray((data as { events?: unknown }).events)) {
    throw new Error("Agenda oficial inválida (src/content/agenda-oficial.json): esperado { version: 1, events: [] }.");
  }
  const events = (data as { events: CommunityEvent[] }).events;
  const errors = events.flatMap((e) => (e.origin === "oficial" ? validateEvent(e) : [`evento(${e.id}): a agenda oficial só aceita origin "oficial".`]));
  if (errors.length) throw new Error(`Agenda oficial inválida:\n- ${errors.join("\n- ")}`);
  return events;
}

const official = parseOfficial(raw);
for (const e of DEMO_EVENTS) {
  const errs = validateEvent(e);
  if (errs.length || e.origin !== "demonstrativo") throw new Error(`Evento demonstrativo inválido:\n- ${errs.join("\n- ")}`);
}

/** Enquanto não houver agenda oficial, os exemplos mostram como a central funciona. */
export const INCLUDE_DEMO_EVENTS = true;

export function createEventCatalog(officialEvents: CommunityEvent[], demo: CommunityEvent[] | null) {
  const ids = new Set(officialEvents.map((e) => e.id));
  const all = [...officialEvents, ...(demo ?? []).filter((e) => !ids.has(e.id))];
  return { all: () => all, get: (id: string) => all.find((e) => e.id === id), official: () => officialEvents };
}

export const eventCatalog = createEventCatalog(official, INCLUDE_DEMO_EVENTS ? DEMO_EVENTS : null);
