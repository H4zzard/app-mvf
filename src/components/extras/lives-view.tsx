"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BellRing, BookOpen, CalendarClock, CalendarDays, Check, ExternalLink, FileText, Lock, Radio, Video } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { LessonPlayer } from "@/components/aulas/lesson-player";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { DEMO_MATERIALS } from "@/demo/materials";
import { catalog } from "@/lib/catalog";
import { eventCatalog } from "@/lib/events";
import { KIND_LABEL, PHASE_LABEL, canRemind, eventDateParts, eventPhase, replayState, splitEvents, streamLink, type CommunityEvent } from "@/lib/events/schedule";
import { cn } from "@/lib/cn";

type Tab = "proximas" | "anteriores" | "agenda";

/** Relógio de parede, lido só no cliente (o servidor usa 0 → nada “ao vivo” no HTML inicial). */
const subscribeMinute = (cb: () => void) => {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
};
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;
const useNow = () => useSyncExternalStore(subscribeMinute, minuteNow, () => 0);

/**
 * Lives e encontros (DEMONSTRAÇÃO + agenda oficial, vazia até a equipe informar).
 * Eventos de exemplo nunca têm data, link ou gravação. O lembrete é SIMULADO:
 * nada é agendado nem enviado (não existe serviço de notificações).
 */
export function LivesView() {
  const { state, dispatch } = useDemo();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("proximas");
  const [openId, setOpenId] = useState<string | null>(null);
  useLayoutEffect(() => () => setOpenId(null), []);

  const { upcoming, past } = splitEvents(eventCatalog.all(), now);
  const mine = upcoming.filter((e) => state.rsvps.includes(e.id));
  const open = openId ? eventCatalog.get(openId) : undefined;
  const next = upcoming.find((e) => e.audience === "todas");
  const list = tab === "proximas" ? upcoming.filter((e) => e !== next) : tab === "anteriores" ? past : mine;
  const toggle = (id: string) => dispatch({ type: "rsvp/toggle", eventId: id });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Agenda de exemplo" />}
        title="Lives e encontros"
        description="Encontros ao vivo com a equipe para tirar dúvidas, praticar e rever o que passou."
      />

      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          <strong className="font-semibold text-fg">Nenhuma data oficial foi divulgada ainda.</strong> Os encontros abaixo são exemplos e aparecem como “Data a
          confirmar”. O lembrete é só uma simulação: nada é agendado ou enviado.
        </span>
      </p>

      <Segmented
        label="Seções da agenda"
        value={tab}
        onChange={setTab}
        options={[
          { value: "proximas", label: "Próximas", count: upcoming.length },
          { value: "anteriores", label: "Anteriores", short: "Antes", count: past.length },
          { value: "agenda", label: "Minha agenda", short: "Agenda", count: mine.length },
        ]}
      />

      {tab === "proximas" && next ? (
        <FeaturedEvent ev={next} now={now} going={state.rsvps.includes(next.id)} onToggle={() => toggle(next.id)} onOpen={() => setOpenId(next.id)} />
      ) : null}

      {list.length === 0 ? (
        tab === "proximas" && next ? null : (
          <EmptyState
            icon={tab === "anteriores" ? Video : CalendarDays}
            title={tab === "anteriores" ? "Nenhum encontro anterior" : tab === "agenda" ? "Sua agenda está vazia" : "Nenhum encontro previsto"}
            description={
              tab === "agenda"
                ? "Toque em “Quero ser lembrada” em um encontro para guardá-lo aqui (simulação)."
                : tab === "anteriores"
                  ? "Os encontros que já aconteceram aparecem aqui, com a gravação quando houver."
                  : "Os próximos encontros aparecem aqui quando a equipe divulgar."
            }
            action={
              tab === "agenda" ? (
                <Button variant="secondary" onClick={() => setTab("proximas")}>
                  Ver próximos encontros
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label={tab === "anteriores" ? "Encontros anteriores" : "Encontros"}>
          {list.map((ev) => (
            <li key={ev.id} className="min-w-0">
              <EventCard ev={ev} now={now} going={state.rsvps.includes(ev.id)} onToggle={() => toggle(ev.id)} onOpen={() => setOpenId(ev.id)} />
            </li>
          ))}
        </ul>
      )}

      {open ? <EventSheet ev={open} now={now} going={state.rsvps.includes(open.id)} onToggle={() => toggle(open.id)} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

/** Bloco de data: dia/mês legíveis, ou “a confirmar” com ícone. */
function DateBlock({ ev, now, large }: { ev: CommunityEvent; now: number; large?: boolean }) {
  const d = eventDateParts(ev.schedule);
  const phase = eventPhase(ev, now);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl text-center",
        large ? "size-20" : "size-16",
        phase === "ao_vivo" ? "bg-brand text-white" : phase === "encerrado" ? "bg-canvas text-muted" : "bg-blush text-brand",
      )}
      aria-hidden
    >
      {d ? (
        <span className="leading-none">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-wide">{d.month}</span>
          <span className={cn("block font-serif font-semibold", large ? "text-3xl" : "text-2xl")}>{d.day}</span>
          <span className="block text-[0.65rem]">{d.time}</span>
        </span>
      ) : (
        <span className="px-1 leading-tight">
          <CalendarClock className="mx-auto size-5" />
          <span className="mt-1 block text-[0.6rem] font-semibold uppercase tracking-wide">{phase === "encerrado" ? "Sem data" : "A confirmar"}</span>
        </span>
      )}
    </span>
  );
}

function whenText(ev: CommunityEvent, now: number) {
  const d = eventDateParts(ev.schedule);
  if (d) return d.long;
  return eventPhase(ev, now) === "encerrado" ? "Data não informada" : "Data a confirmar";
}

function ReminderButton({ ev, now, going, onToggle, full }: { ev: CommunityEvent; now: number; going: boolean; onToggle: () => void; full?: boolean }) {
  if (!canRemind(ev, now)) return null;
  return (
    <Button variant={going ? "secondary" : "primary"} size="sm" className={cn(full && "w-full sm:w-auto")} aria-pressed={going} onClick={onToggle}>
      {going ? <Check aria-hidden className="size-4 text-success" /> : <BellRing aria-hidden className="size-4" />}
      {going ? "Na minha agenda (simulação)" : "Quero ser lembrada"}
    </Button>
  );
}

function AudienceBadge({ ev }: { ev: CommunityEvent }) {
  if (ev.audience === "todas") return null;
  return (
    <Badge tone="neutral">
      <Lock aria-hidden className="size-3" />
      Exclusivo {ev.audience}
    </Badge>
  );
}

function FeaturedEvent({ ev, now, going, onToggle, onOpen }: { ev: CommunityEvent; now: number; going: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80">Próximo encontro</div>
      <div className="flex gap-4 p-4 sm:p-5">
        <DateBlock ev={ev} now={now} large />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">{KIND_LABEL[ev.kind]}</Badge>
            {ev.origin === "demonstrativo" ? <DemoBadge label="Exemplo" /> : null}
          </div>
          <h2 className="mt-1.5 font-serif text-xl font-semibold leading-tight text-fg">{ev.title}</h2>
          <p className="mt-1 text-sm text-muted">{ev.description}</p>
          <p className="mt-2 text-xs text-muted">
            {whenText(ev, now)} · {ev.host}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3 sm:px-5">
        <ReminderButton ev={ev} now={now} going={going} onToggle={onToggle} />
        <Button variant="ghost" size="sm" onClick={onOpen} aria-haspopup="dialog">
          Ver detalhes
        </Button>
      </div>
    </Card>
  );
}

function EventCard({ ev, now, going, onToggle, onOpen }: { ev: CommunityEvent; now: number; going: boolean; onToggle: () => void; onOpen: () => void }) {
  const phase = eventPhase(ev, now);
  const replay = replayState(ev, now);
  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex gap-3">
        <DateBlock ev={ev} now={now} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={phase === "ao_vivo" ? "brand" : "neutral"}>{phase === "ao_vivo" ? PHASE_LABEL.ao_vivo : KIND_LABEL[ev.kind]}</Badge>
            {ev.origin === "demonstrativo" ? <DemoBadge label="Exemplo" /> : null}
            <AudienceBadge ev={ev} />
          </div>
          <h3 className="mt-1.5 font-semibold leading-snug text-fg">{ev.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {whenText(ev, now)} · {ev.host}
          </p>
        </div>
      </div>
      {ev.topics.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Temas">
          {ev.topics.map((t) => (
            <li key={t}>
              <Badge tone="neutral">{t}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {phase === "encerrado" ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Video aria-hidden className="size-3.5" />
          {replay.state === "player" ? "Gravação disponível" : "Gravação ainda não disponível"}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-3">
        <ReminderButton ev={ev} now={now} going={going} onToggle={onToggle} />
        <Button variant={phase === "encerrado" ? "secondary" : "ghost"} size="sm" onClick={onOpen} aria-haspopup="dialog" aria-label={`Ver detalhes: ${ev.title}`}>
          {phase === "encerrado" ? "Ver encontro" : "Ver detalhes"}
        </Button>
      </div>
    </Card>
  );
}

function EventSheet({ ev, now, going, onToggle, onClose }: { ev: CommunityEvent; now: number; going: boolean; onToggle: () => void; onClose: () => void }) {
  const phase = eventPhase(ev, now);
  const replay = replayState(ev, now);
  const stream = streamLink(ev, now);
  const materials = DEMO_MATERIALS.filter((m) => ev.materialIds.includes(m.id));
  const lessons = ev.lessonIds.map((id) => catalog.getLesson(id)).filter((l) => l !== undefined);
  return (
    <Sheet title={ev.title} eyebrow={`${KIND_LABEL[ev.kind]} · ${PHASE_LABEL[phase]}`} onClose={onClose} footer={canRemind(ev, now) ? <ReminderButton ev={ev} now={now} going={going} onToggle={onToggle} full /> : undefined}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {ev.origin === "demonstrativo" ? <DemoBadge label="Encontro de exemplo" /> : null}
          <AudienceBadge ev={ev} />
        </div>
        <dl className="grid grid-cols-1 gap-2 text-sm min-[400px]:grid-cols-2">
          <div className="rounded-xl border border-line p-3">
            <dt className="text-xs text-muted">Quando</dt>
            <dd className="mt-0.5 font-medium text-fg">{whenText(ev, now)}</dd>
          </div>
          <div className="rounded-xl border border-line p-3">
            <dt className="text-xs text-muted">Com</dt>
            <dd className="mt-0.5 font-medium text-fg">{ev.host}</dd>
          </div>
        </dl>
        <p className="text-sm text-fg">{ev.description}</p>

        {ev.topics.length ? (
          <section>
            <h3 className="text-sm font-semibold text-fg">Temas</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {ev.topics.map((t) => (
                <li key={t}>
                  <Badge tone="brand">{t}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {phase !== "encerrado" ? (
          <section>
            <h3 className="text-sm font-semibold text-fg">Transmissão</h3>
            {stream ? (
              <a
                href={stream}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                <Radio aria-hidden className="size-4" />
                {phase === "ao_vivo" ? "Entrar na live" : "Link da transmissão"}
                <ExternalLink aria-hidden className="size-4" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted">O link será divulgado pela equipe junto com a data.</p>
            )}
          </section>
        ) : (
          <section>
            <h3 className="text-sm font-semibold text-fg">Gravação</h3>
            {replay.state === "player" ? (
              <div className="mt-2">
                <LessonPlayer media={ev.replay ?? { kind: "none" }} availability="disponivel" cover="/area-membros/aulas-ao-vivo.png" title={ev.title} />
              </div>
            ) : (
              <div className="mt-2 flex items-start gap-3 rounded-xl bg-canvas p-3 text-sm text-muted">
                <Video aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                A gravação deste encontro ainda não foi cadastrada. Ela aparece aqui quando a equipe publicar e autorizar.
              </div>
            )}
          </section>
        )}

        {lessons.length ? (
          <section>
            <h3 className="text-sm font-semibold text-fg">Aulas relacionadas</h3>
            <ul className="mt-1">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/aulas/${l.id}`} className="flex min-h-10 items-center gap-2 text-sm font-medium text-fg hover:text-brand">
                    <BookOpen aria-hidden className="size-4 shrink-0 text-brand" />
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {materials.length ? (
          <section>
            <h3 className="text-sm font-semibold text-fg">Materiais</h3>
            <ul className="mt-2 space-y-1.5">
              {materials.map((m) => (
                <li key={m.id} className="flex items-start gap-2 text-sm">
                  <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>
                    <span className="font-medium text-fg">{m.title}</span>
                    <span className="block text-xs text-muted">{m.file ? "Disponível na Central de Materiais" : "Arquivo ainda não disponível"}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/materiais" className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">
              Abrir a Central de Materiais
            </Link>
          </section>
        ) : null}

        {going ? <p className="rounded-xl bg-canvas p-3 text-xs text-muted">Está na sua agenda desta demonstração. Nenhum lembrete foi agendado ou enviado.</p> : null}
      </div>
    </Sheet>
  );
}
