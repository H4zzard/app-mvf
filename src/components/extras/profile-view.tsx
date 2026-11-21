"use client";

import { useState } from "react";
import { Award, Bell, Mail, SlidersHorizontal, UserRound } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { usePlan } from "@/components/plan/plan-provider";
import { useSession } from "@/components/layout/session-provider";
import { AnswersSummary } from "@/components/onboarding/answers-summary";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { greetingName } from "@/lib/greeting";
import { computeProgress } from "@/lib/plan";
import { cn } from "@/lib/cn";

/**
 * Perfil (DEMONSTRAÇÃO): dados da aluna demo, resumo das respostas e
 * preferências que NÃO são salvas. Não edita dados de conta real.
 */
export function ProfileView() {
  const { profile, plan, statusMap } = usePlan();
  const { xp } = useDemo();
  const { mode } = useSession();
  const real = mode === "member";
  const name = greetingName(profile);
  const display = name === "parceira" ? (real ? "Aluna" : "Aluna demo") : name;
  const progress = plan ? computeProgress(plan, statusMap) : null;
  const [prefs, setPrefs] = useState({ lives: true, weekly: false });

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={<DemoBadge label={real ? "Prévia · preferências ainda não são salvas" : "Conta de demonstração"} />} title="Perfil" />

      <Card className="flex items-center gap-4 p-5">
        <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-brand font-serif text-xl font-semibold text-white">
          {display.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-serif text-xl font-semibold text-fg">{display}</p>
          <p className="text-sm text-muted">{real ? "Aluna" : "Aluna · dados fictícios"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="brand">
              <Award aria-hidden className="size-3" />
              Nível {xp.level.number} · {xp.level.name}{real ? " (prévia)" : ""}
            </Badge>
            {progress ? <Badge tone="neutral">Plano {progress.percent}%</Badge> : null}
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6" aria-labelledby="answers-title">
        <CardHeader
          titleId="answers-title"
          title="Minhas respostas"
          description={profile ? "Usadas para montar o seu plano." : "Você ainda não personalizou o plano."}
          action={<UserRound aria-hidden className="size-5 text-brand" />}
        />
        {profile ? (
          <div className="mt-4">
            <AnswersSummary answers={profile} />
          </div>
        ) : null}
        <ButtonLink href="/onboarding" variant="secondary" size="sm" className="mt-4">
          <SlidersHorizontal aria-hidden className="size-4" />
          {profile ? "Ajustar meu plano" : "Montar meu plano"}
        </ButtonLink>
      </Card>

      <Card className="p-5 sm:p-6" aria-labelledby="prefs-title">
        <CardHeader titleId="prefs-title" title="Preferências" description="Simulação: as escolhas não são salvas." />
        <ul className="mt-3 divide-y divide-line">
          <Toggle icon={Bell} label="Lembretes de lives" checked={prefs.lives} onChange={(v) => setPrefs((p) => ({ ...p, lives: v }))} />
          <Toggle icon={Mail} label="Resumo semanal por e-mail" checked={prefs.weekly} onChange={(v) => setPrefs((p) => ({ ...p, weekly: v }))} />
        </ul>
      </Card>
    </div>
  );
}

function Toggle({ icon: Icon, label, checked, onChange }: { icon: typeof Bell; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <li className="flex min-h-14 items-center gap-3 py-2">
      <Icon aria-hidden className="size-4 shrink-0 text-muted" />
      <span className="flex-1 text-sm text-fg">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="grid min-h-11 min-w-14 place-items-center"
      >
        <span className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-brand" : "bg-line-strong")}>
          <span className={cn("absolute left-0 top-1 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
        </span>
      </button>
    </li>
  );
}
