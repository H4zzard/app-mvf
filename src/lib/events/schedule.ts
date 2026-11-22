/**
 * Agenda de lives e encontros. Módulo PURO: o “agora” entra como parâmetro
 * (a tela passa o relógio; os testes passam uma data fixa).
 *
 * Regra de honestidade: evento DEMONSTRATIVO nunca tem data, horário, link de
 * transmissão ou gravação — sempre “Data a confirmar”. Só a agenda oficial
 * (src/content/agenda-oficial.json, preenchida pela equipe) pode ter datas.
 */
import type { ContentAvailability, MediaRef } from "@/types/catalog";
import { playbackState, type PlaybackState } from "../catalog/media.ts";

export type EventKind = "live" | "plantao" | "encontro";
export type EventAudience = "todas" | "Elite+" | "Icon";

export type EventSchedule =
  | { status: "a_confirmar" }
  | {
      status: "agendado";
      /** ISO 8601 com fuso (ex.: 2026-12-04T20:00:00-03:00). */
      startsAt: string;
      /** IANA (ex.: America/Sao_Paulo). */
      timeZone: string;
      durationMin: number;
    };

export interface CommunityEvent {
  id: string;
  title: string;
  kind: EventKind;
  /** Apresentadora (ou “Equipe MVF”). */
  host: string;
  description: string;
  topics: string[];
  schedule: EventSchedule;
  /** Link da transmissão (https), divulgado pela equipe. */
  streamUrl: string | null;
  /** Encerrado (para encontros passados sem data cadastrada). */
  ended: boolean;
  /** Gravação: só aparece se `replayAuthorized`. */
  replay: MediaRef | null;
  replayAuthorized: boolean;
  materialIds: string[];
  lessonIds: string[];
  audience: EventAudience;
  origin: "oficial" | "demonstrativo";
}

export const KIND_LABEL: Record<EventKind, string> = { live: "Live", plantao: "Plantão de dúvidas", encontro: "Encontro" };

export type EventPhase = "a_confirmar" | "agendado" | "ao_vivo" | "encerrado";

export const PHASE_LABEL: Record<EventPhase, string> = {
  a_confirmar: "Data a confirmar",
  agendado: "Agendado",
  ao_vivo: "Ao vivo agora",
  encerrado: "Encerrado",
};

export function eventPhase(ev: CommunityEvent, nowMs: number): EventPhase {
  if (ev.ended) return "encerrado";
  if (ev.schedule.status === "a_confirmar") return "a_confirmar";
  const start = Date.parse(ev.schedule.startsAt);
  const end = start + ev.schedule.durationMin * 60_000;
  if (nowMs >= end) return "encerrado";
  if (nowMs >= start) return "ao_vivo";
  return "agendado";
}

const TZ_LABEL: Record<string, string> = { "America/Sao_Paulo": "horário de Brasília" };

export interface EventDateParts {
  weekday: string;
  day: string;
  month: string;
  time: string;
  /** Ex.: “horário de Brasília”. */
  zone: string;
  /** Frase completa para leitores de tela e detalhes. */
  long: string;
}

/** Data legível no fuso DO EVENTO (pt-BR). null quando a data ainda não foi confirmada. */
export function eventDateParts(s: EventSchedule): EventDateParts | null {
  if (s.status !== "agendado") return null;
  const d = new Date(s.startsAt);
  const part = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: s.timeZone, ...opts }).format(d).replace(".", "");
  const weekday = part({ weekday: "short" });
  const day = part({ day: "2-digit" });
  const month = part({ month: "short" });
  const time = part({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const zone = TZ_LABEL[s.timeZone] ?? s.timeZone;
  const longDate = new Intl.DateTimeFormat("pt-BR", { timeZone: s.timeZone, weekday: "long", day: "numeric", month: "long" }).format(d);
  return { weekday, day, month, time, zone, long: `${longDate}, às ${time} (${zone})` };
}

/** Próximos (por data; “a confirmar” por último) e anteriores (mais recentes primeiro). */
export function splitEvents(events: CommunityEvent[], nowMs: number): { upcoming: CommunityEvent[]; past: CommunityEvent[] } {
  const start = (e: CommunityEvent) => (e.schedule.status === "agendado" ? Date.parse(e.schedule.startsAt) : Number.POSITIVE_INFINITY);
  const upcoming = events.filter((e) => eventPhase(e, nowMs) !== "encerrado").sort((a, b) => start(a) - start(b));
  const past = events
    .filter((e) => eventPhase(e, nowMs) === "encerrado")
    .sort((a, b) => (Number.isFinite(start(b)) ? start(b) : 0) - (Number.isFinite(start(a)) ? start(a) : 0));
  return { upcoming, past };
}

/** O lembrete (SIMULADO na demo) só faz sentido para eventos que ainda vão acontecer. */
export const canRemind = (ev: CommunityEvent, nowMs: number) => {
  const p = eventPhase(ev, nowMs);
  return p === "a_confirmar" || p === "agendado";
};

/** O link de transmissão só aparece com evento agendado/ao vivo e link cadastrado. */
export function streamLink(ev: CommunityEvent, nowMs: number): string | null {
  const p = eventPhase(ev, nowMs);
  return (p === "agendado" || p === "ao_vivo") && ev.streamUrl ? ev.streamUrl : null;
}

export type ReplayState = { state: "nao_aplicavel" } | { state: "sem_gravacao" } | { state: "player"; playback: PlaybackState };

/** Gravação: só com encontro encerrado, mídia cadastrada E autorização. Nunca vídeo fictício. */
export function replayState(ev: CommunityEvent, nowMs: number): ReplayState {
  if (eventPhase(ev, nowMs) !== "encerrado") return { state: "nao_aplicavel" };
  if (!ev.replay || ev.replay.kind === "none" || !ev.replayAuthorized) return { state: "sem_gravacao" };
  const availability: ContentAvailability = "disponivel";
  return { state: "player", playback: playbackState(ev.replay, availability) };
}

/* --------------------------------- Validação --------------------------------- */

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const isHttps = (v: unknown) => {
  if (typeof v !== "string") return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
};
const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** Valida um evento (agenda oficial ou fixture). Demonstrativo nunca tem data, link ou gravação. */
export function validateEvent(ev: CommunityEvent): string[] {
  const e: string[] = [];
  const at = `evento(${ev.id})`;
  if (!ID.test(ev.id)) e.push(`${at}: id inválido.`);
  if (!ev.title.trim() || ev.title.length > 100) e.push(`${at}: título obrigatório (até 100).`);
  if (!ev.host.trim()) e.push(`${at}: informe quem apresenta.`);
  if (ev.schedule.status === "agendado") {
    const s = ev.schedule;
    if (!ISO_WITH_ZONE.test(s.startsAt) || Number.isNaN(Date.parse(s.startsAt))) e.push(`${at}: startsAt precisa de data, hora e fuso (ex.: 2026-12-04T20:00:00-03:00).`);
    if (!validZone(s.timeZone)) e.push(`${at}: timeZone inválido (use IANA, ex.: America/Sao_Paulo).`);
    if (!Number.isInteger(s.durationMin) || s.durationMin < 10 || s.durationMin > 480) e.push(`${at}: duração entre 10 e 480 minutos.`);
  }
  if (ev.streamUrl !== null && !isHttps(ev.streamUrl)) e.push(`${at}: link de transmissão precisa ser https.`);
  if (ev.origin === "demonstrativo") {
    if (ev.schedule.status !== "a_confirmar") e.push(`${at}: evento demonstrativo não pode ter data (use “a confirmar”).`);
    if (ev.streamUrl) e.push(`${at}: evento demonstrativo não pode ter link de transmissão.`);
    if (ev.replay && ev.replay.kind !== "none") e.push(`${at}: evento demonstrativo não pode ter gravação.`);
  }
  return e;
}
