"use client";

import { BellRing, CalendarClock, Check, Radio, Video } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DEMO_EVENTS } from "@/demo/agenda";

/** Lives (DEMONSTRAÇÃO): agenda de exemplo, sem datas nem links reais; lista de lembrete simulada. */
export function LivesView() {
  const { state, dispatch } = useDemo();
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Agenda de exemplo" />}
        title="Lives"
        description="Encontros ao vivo com a equipe para tirar dúvidas e praticar."
      />
      <p className="text-xs text-muted">
        Datas, horários e links serão divulgados pela equipe. Os eventos abaixo são exemplos para a demonstração.
      </p>
      <ul className="space-y-3">
        {DEMO_EVENTS.map((ev) => {
          const going = state.rsvps.includes(ev.id);
          return (
            <li key={ev.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blush text-brand">
                    <Radio aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{ev.format}</Badge>
                      <DemoBadge label="Exemplo" />
                    </div>
                    <h2 className="mt-1.5 font-semibold text-fg">{ev.title}</h2>
                    <p className="text-sm text-muted">{ev.description}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarClock aria-hidden className="size-3.5" />
                      Data a confirmar · {ev.host}
                    </p>
                  </div>
                </div>
                <Button
                  variant={going ? "secondary" : "primary"}
                  size="sm"
                  className="mt-3 w-full sm:w-auto"
                  aria-pressed={going}
                  onClick={() => dispatch({ type: "rsvp/toggle", eventId: ev.id })}
                >
                  {going ? <Check aria-hidden className="size-4 text-success" /> : <BellRing aria-hidden className="size-4" />}
                  {going ? "Na lista de lembrete (simulação)" : "Quero ser lembrada"}
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>
      <EmptyState icon={Video} title="Gravações" description="As gravações das lives aparecem aqui depois que acontecerem." />
    </div>
  );
}
