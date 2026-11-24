"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Bell, BookOpen, ChevronRight, Gift, KeyRound, LifeBuoy, LogOut, Mail, ShieldCheck, SlidersHorizontal, Target, Trophy, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOptionalDemo } from "@/components/demo/demo-provider";
import { usePlan } from "@/components/plan/plan-provider";
import { useSession } from "@/components/layout/session-provider";
import { DemoControls } from "@/components/layout/demo-role-switch";
import { usePointsSummary } from "@/components/dashboard/points-card";
import { AnswersSummary } from "@/components/onboarding/answers-summary";
import { Badge, DemoBadge, SoonBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getNavItem, isItemSoon, isNavItemVisible } from "@/config/navigation";
import { EVOLUTION_LINKS, HELP_LINKS, type SecondaryLink } from "@/lib/navigation/destinations";
import { signOutAction } from "@/app/auth-actions";
import { greetingName } from "@/lib/greeting";
import { cn } from "@/lib/cn";

const ROLE_LABEL: Record<string, string> = {
  student: "Aluna",
  admin: "Admin",
  expert: "Expert",
  support: "Suporte",
  moderator: "Moderação",
  partner: "Parceira",
  owner: "Owner",
};

const EVOLUTION_ICONS: Record<string, LucideIcon> = { desafios: Target, ranking: Trophy, conquistas: Award, recompensas: Gift };
const HELP_ICONS: LucideIcon[] = [LifeBuoy, BookOpen, ShieldCheck, KeyRound];

/**
 * Perfil — central de conta, evolução e ajuda (substitui o antigo menu “Mais”).
 * Disponível para todas as contas; partes de demonstração só aparecem quando a
 * demo (ou a prévia autorizada no servidor) está ativa. Não inventa avatar,
 * e-mail, plano, prazo ou benefício: só mostra o que a sessão confirma.
 */
export function ProfileView() {
  const { profile } = usePlan();
  const { user, mode, modulesPreview } = useSession();
  const modules = useOptionalDemo() !== null;
  const demo = mode === "demo";
  const name = greetingName(profile);
  const display = demo ? (name === "parceira" ? "Aluna demo" : name) : user.displayName;
  const admin = getNavItem("admin");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow={demo ? <DemoBadge label="Conta de demonstração" /> : undefined} title="Perfil" />

      {/* Identificação */}
      <section aria-label="Sua conta" className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 shadow-card sm:p-5">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-blush text-lg font-semibold text-brand">
          {initials(display)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-semibold leading-snug text-fg">{display}</p>
          <p className="text-sm text-muted">
            {ROLE_LABEL[user.role] ?? "Aluna"}
            {demo ? " · dados fictícios" : ""}
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-blush"
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          <span className="max-[440px]:sr-only">Ajustar plano</span>
        </Link>
      </section>

      <AccessCard demo={demo} />

      {/* Minha evolução */}
      <Section id="perfil-evolucao" title="Minha evolução">
        <PointsRow />
        {EVOLUTION_LINKS.map((l) => (
          <LinkRow key={l.href} link={l} icon={EVOLUTION_ICONS[l.navId]} soon={isItemSoon(getNavItem(l.navId), modulesPreview)} />
        ))}
      </Section>

      {/* Ajuda e informações */}
      <Section id="perfil-ajuda" title="Ajuda e informações">
        {HELP_LINKS.map((l, i) => (
          <LinkRow key={l.href} link={l} icon={HELP_ICONS[i]} soon={isItemSoon(getNavItem(l.navId), modulesPreview)} />
        ))}
      </Section>

      {/* Conta */}
      <Section id="perfil-conta" title="Conta">
        {profile ? (
          <li>
            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
                <UserRound aria-hidden className="size-[18px] shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">Minhas respostas</span>
                  <span className="block text-xs text-muted">Usadas para montar o seu plano</span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-subtle transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4">
                <AnswersSummary answers={profile} />
              </div>
            </details>
          </li>
        ) : null}
        <LinkRow
          link={{ navId: "onboarding", label: profile ? "Ajustar meu plano" : "Montar meu plano", description: "Refaça as perguntas da personalização", href: "/onboarding" }}
          icon={SlidersHorizontal}
        />
        {modules ? <Preferences real={!demo} /> : null}
        {isNavItemVisible(admin, user.role) ? (
          <LinkRow link={{ navId: "admin", label: "Gestão da equipe", description: "Área restrita a papéis da equipe", href: admin.href }} icon={ShieldCheck} soon={isItemSoon(admin, modulesPreview)} />
        ) : null}
        {!demo ? (
          <li>
            <form action={signOutAction}>
              <button type="submit" className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-fg hover:bg-canvas/60 hover:text-brand">
                <LogOut aria-hidden className="size-[18px] shrink-0 text-muted" />
                Sair da conta
              </button>
            </form>
          </li>
        ) : null}
      </Section>

      {/* No desktop os controles da demo ficam na lateral; no celular, aqui. */}
      {demo ? (
        <div className="lg:hidden">
          <DemoControls />
        </div>
      ) : null}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "MV").slice(0, 2)).toUpperCase();
}

/**
 * Acesso e planos. Mostra só o que é confirmado: a conta real passou pela
 * checagem de acesso no servidor. Categoria, preços, ofertas e benefícios NÃO
 * são exibidos até a equipe confirmar — sem checkout nesta etapa.
 */
function AccessCard({ demo }: { demo: boolean }) {
  return (
    <section aria-labelledby="perfil-acesso" className="rounded-xl border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="perfil-acesso" className="text-sm font-semibold text-fg">
          Seu acesso
        </h2>
        {demo ? <Badge tone="neutral">Demonstração local</Badge> : <Badge tone="success">Acesso ativo</Badge>}
      </div>
      <p className="mt-2 text-sm text-muted">
        {demo
          ? "Nesta demonstração não há assinatura nem categoria de plano."
          : "Sua categoria de plano aparecerá aqui quando for confirmada pela equipe."}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm text-fg">
        Conhecer outros planos
        <SoonBadge />
      </p>
    </section>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
        {title}
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card shadow-card">{children}</ul>
    </section>
  );
}

function LinkRow({ link, icon: Icon, soon = false }: { link: SecondaryLink; icon: LucideIcon; soon?: boolean }) {
  return (
    <li>
      <Link href={link.href} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-canvas/60">
        <Icon aria-hidden className="size-[18px] shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-fg">{link.label}</span>
          <span className="block text-xs text-muted">{link.description}</span>
        </span>
        {soon ? <SoonBadge /> : null}
        <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
      </Link>
    </li>
  );
}

/** XP e nível: a MESMA fonte do card de pontos (computeXp na demo; prévia nas contas reais). */
function PointsRow() {
  const p = usePointsSummary();
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-blush text-brand">
          <Award className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">
            Nível {p.levelNumber} · {p.levelName}
          </p>
          <p className="text-xs text-muted">
            {p.points} {p.unit} · {p.demo ? "simulação desta sessão" : "prévia pelo seu progresso"}
          </p>
        </div>
      </div>
      <ProgressBar value={p.percent} label="Progresso até o próximo nível" size="sm" className="mt-2.5" />
      <p className="mt-1.5 text-xs text-subtle">
        {p.toNextPts > 0 ? `${p.toNextPts} ${p.unit} para o próximo nível` : "Nível máximo desta prévia"} · regras de pontos em definição
      </p>
    </li>
  );
}

/** Preferências: SIMULAÇÃO (não são salvas). Só com a demo ou a prévia ativa. */
function Preferences({ real }: { real: boolean }) {
  const [prefs, setPrefs] = useState({ lives: true, weekly: false });
  return (
    <li className="px-4 py-2">
      <p className="pt-1 text-sm font-medium text-fg">Preferências</p>
      <p className="text-xs text-muted">{real ? "Prévia: as escolhas ainda não são salvas." : "Simulação: as escolhas não são salvas."}</p>
      <ul>
        <Toggle icon={Bell} label="Lembretes de lives" checked={prefs.lives} onChange={(v) => setPrefs((p) => ({ ...p, lives: v }))} />
        <Toggle icon={Mail} label="Resumo semanal por e-mail" checked={prefs.weekly} onChange={(v) => setPrefs((p) => ({ ...p, weekly: v }))} />
      </ul>
    </li>
  );
}

function Toggle({ icon: Icon, label, checked, onChange }: { icon: LucideIcon; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <li className="flex min-h-12 items-center gap-3">
      <Icon aria-hidden className="size-4 shrink-0 text-muted" />
      <span className="flex-1 text-sm text-fg">{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="grid min-h-11 min-w-14 place-items-center">
        <span className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-brand" : "bg-line-strong")}>
          <span className={cn("absolute left-0 top-1 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
        </span>
      </button>
    </li>
  );
}
