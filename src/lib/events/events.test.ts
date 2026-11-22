import { test } from "node:test";
import assert from "node:assert/strict";
import raw from "../../content/agenda-oficial.json" with { type: "json" };
import { DEMO_EVENTS } from "../../demo/agenda.ts";
import { DEMO_MATERIALS } from "../../demo/materials.ts";
import { catalog } from "../catalog/index.ts";
import { demoReducer, initialDemoState } from "../demo/store.ts";
import { MISSIONS } from "../demo/xp.ts";
import { eventCatalog } from "./index.ts";
import { canRemind, eventDateParts, eventPhase, replayState, splitEvents, streamLink, validateEvent, type CommunityEvent } from "./schedule.ts";

const NOW = Date.parse("2026-11-22T15:00:00-03:00");
const official = (over: Partial<CommunityEvent> = {}): CommunityEvent => ({
  id: "ev-oficial",
  title: "Live oficial de teste",
  kind: "live",
  host: "Apresentadora de teste",
  description: "Descrição",
  topics: [],
  schedule: { status: "agendado", startsAt: "2026-12-04T20:00:00-03:00", timeZone: "America/Sao_Paulo", durationMin: 60 },
  streamUrl: "https://example.com/live",
  ended: false,
  replay: null,
  replayAuthorized: false,
  materialIds: [],
  lessonIds: [],
  audience: "todas",
  origin: "oficial",
  ...over,
});

test("agenda oficial ainda vazia e válida (nenhuma data inventada)", () => {
  assert.deepEqual(raw.events, []);
  assert.deepEqual(eventCatalog.official(), []);
});

test("eventos de exemplo: sem data, sem link e sem gravação — sempre “Data a confirmar”", () => {
  for (const e of DEMO_EVENTS) {
    assert.deepEqual(validateEvent(e), [], e.id);
    assert.equal(e.origin, "demonstrativo");
    assert.equal(e.schedule.status, "a_confirmar");
    assert.equal(e.streamUrl, null);
    assert.equal(e.replay, null);
    assert.equal(eventDateParts(e.schedule), null);
    assert.equal(streamLink(e, NOW), null);
  }
});

test("schema recusa data, link ou gravação em evento demonstrativo e data sem fuso no oficial", () => {
  const demo = DEMO_EVENTS[0];
  assert.ok(validateEvent({ ...demo, schedule: official().schedule }).length);
  assert.ok(validateEvent({ ...demo, streamUrl: "https://example.com" }).length);
  assert.ok(validateEvent({ ...demo, replay: { kind: "externo", provider: "youtube", ref: "abcdEFGH123" } }).length);
  assert.ok(validateEvent(official({ schedule: { status: "agendado", startsAt: "2026-12-04 20:00", timeZone: "America/Sao_Paulo", durationMin: 60 } })).length);
  assert.ok(validateEvent(official({ schedule: { status: "agendado", startsAt: "2026-12-04T20:00:00-03:00", timeZone: "Brasil/Hora", durationMin: 60 } })).length);
  assert.ok(validateEvent(official({ streamUrl: "http://inseguro.com" })).length);
  assert.deepEqual(validateEvent(official()), []);
});

test("fases: a confirmar, agendado, ao vivo e encerrado (pelo relógio informado)", () => {
  const e = official();
  assert.equal(eventPhase(e, NOW), "agendado");
  assert.equal(eventPhase(e, Date.parse("2026-12-04T20:30:00-03:00")), "ao_vivo");
  assert.equal(eventPhase(e, Date.parse("2026-12-04T21:00:00-03:00")), "encerrado");
  assert.equal(eventPhase(DEMO_EVENTS[0], NOW), "a_confirmar");
  assert.equal(eventPhase(DEMO_EVENTS.find((x) => x.ended)!, NOW), "encerrado");
});

test("data legível no fuso do evento, em pt-BR", () => {
  const d = eventDateParts(official().schedule)!;
  assert.equal(d.day, "04");
  assert.equal(d.time, "20:00");
  assert.equal(d.zone, "horário de Brasília");
  assert.match(d.month, /^dez/);
  assert.match(d.long, /4 de dezembro, às 20:00 \(horário de Brasília\)/);
});

test("próximos por data (a confirmar por último) e anteriores separados", () => {
  const early = official({ id: "ev-a", schedule: { status: "agendado", startsAt: "2026-11-30T19:00:00-03:00", timeZone: "America/Sao_Paulo", durationMin: 60 } });
  const { upcoming, past } = splitEvents([DEMO_EVENTS[0], official(), early, DEMO_EVENTS.find((x) => x.ended)!], NOW);
  assert.deepEqual(upcoming.map((e) => e.id), ["ev-a", "ev-oficial", DEMO_EVENTS[0].id]);
  assert.equal(past.length, 1);
});

test("lembrete simulado: só para eventos futuros; marca na agenda local, nada é agendado", () => {
  const past = DEMO_EVENTS.find((x) => x.ended)!;
  assert.equal(canRemind(DEMO_EVENTS[0], NOW), true);
  assert.equal(canRemind(past, NOW), false);
  const s = demoReducer(initialDemoState(), { type: "rsvp/toggle", eventId: DEMO_EVENTS[0].id });
  assert.deepEqual(s.rsvps, [DEMO_EVENTS[0].id]);
  assert.deepEqual(demoReducer(s, { type: "rsvp/toggle", eventId: DEMO_EVENTS[0].id }).rsvps, []);
  assert.ok(MISSIONS.some((m) => m.href === "/lives"), "missão de presença continua ligada às Lives");
});

test("gravação: nunca vídeo fictício; só com mídia cadastrada E autorizada", () => {
  const ended = official({ ended: true });
  assert.deepEqual(replayState(ended, NOW), { state: "sem_gravacao" });
  assert.deepEqual(replayState({ ...ended, replay: { kind: "externo", provider: "youtube", ref: "abcdEFGH123" } }, NOW), { state: "sem_gravacao" }, "sem autorização");
  const ok = replayState({ ...ended, replay: { kind: "externo", provider: "youtube", ref: "abcdEFGH123" }, replayAuthorized: true }, NOW);
  assert.equal(ok.state, "player");
  assert.equal(replayState(official(), NOW).state, "nao_aplicavel");
  for (const e of DEMO_EVENTS.filter((x) => x.ended)) assert.deepEqual(replayState(e, NOW), { state: "sem_gravacao" });
});

test("aulas e materiais ligados aos encontros existem no catálogo", () => {
  const mats = new Set(DEMO_MATERIALS.map((m) => m.id));
  for (const e of DEMO_EVENTS) {
    for (const l of e.lessonIds) assert.ok(catalog.getLesson(l), `${e.id} → ${l}`);
    for (const m of e.materialIds) assert.ok(mats.has(m), `${e.id} → ${m}`);
  }
});
