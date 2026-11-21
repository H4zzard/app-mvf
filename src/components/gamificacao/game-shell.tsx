"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Coins, Gift, Target, Trophy } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/conquistas", label: "Conquistas", icon: Award },
  { href: "/desafios", label: "Desafios", icon: Target },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/recompensas", label: "Recompensas", icon: Gift },
] as const;

/** Abas que ligam as quatro telas de gamificação (mesmo estado da demo). */
export function GameTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Gamificação">
      <ul className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-card p-1 shadow-card sm:inline-grid sm:rounded-full">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.7rem] font-medium transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3.5 sm:text-sm",
                  active ? "bg-brand text-white" : "text-muted hover:bg-blush hover:text-fg",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Faixa escura com nível, XP e saldo — os mesmos números em todas as telas. */
export function PointsStrip({ className }: { className?: string }) {
  const { xp, balance } = useDemo();
  return (
    <section aria-label="Seu progresso de pontos" className={cn("relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-raised sm:p-6", className)}>
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand/25" />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/60">Nível {xp.level.number}</p>
          <p className="font-serif text-2xl font-semibold leading-tight">{xp.level.name}</p>
          <p className="mt-1 text-sm text-white/75">
            <strong className="font-semibold text-white">{xp.xp} XP</strong>
            {xp.nextLevel ? ` · ${xp.xpToNext} para ${xp.nextLevel.name}` : " · nível máximo da demo"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 px-3.5 py-2.5 text-right ring-1 ring-white/15">
          <p className="flex items-center justify-end gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/65">
            <Coins aria-hidden className="size-3.5" /> Saldo
          </p>
          <p className="font-serif text-2xl font-semibold leading-none">{balance}</p>
          <p className="text-[0.65rem] text-white/60">pontos</p>
        </div>
      </div>
      <ProgressBar value={xp.levelPercent} label="Progresso até o próximo nível" tone="inverse" size="sm" className="relative mt-4" />
      <p className="relative mt-2 text-[0.7rem] text-white/55">Pontos de demonstração · não são dinheiro nem resultado de vendas.</p>
    </section>
  );
}
