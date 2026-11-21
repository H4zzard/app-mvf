"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getNavItem, isItemSoon } from "@/config/navigation";
import { useSession } from "@/components/layout/session-provider";
import { SoonBadge } from "@/components/ui/badge";

const QUICK_IDS = ["aulas", "videos-virais", "estudio-ia", "comunidade"];

/**
 * Atalhos para módulos centrais. No celular, uma fileira compacta de 4 ícones;
 * a partir de 640 px, cards com descrição. Módulos sem tela mostram “Em breve”.
 */
export function QuickAccess() {
  const { modulesPreview } = useSession();
  return (
    <section aria-labelledby="quick-access-title">
      <h2 id="quick-access-title" className="font-serif text-lg font-semibold text-fg">
        Acesso rápido
      </h2>
      <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        {QUICK_IDS.map((id) => {
          const item = getNavItem(id);
          const Icon = item.icon;
          const soon = isItemSoon(item, modulesPreview);
          return (
            <li key={id}>
              <Link
                href={item.href}
                className="group flex h-full flex-col items-center rounded-2xl border border-line bg-card p-2.5 text-center shadow-card transition-colors hover:border-brand/30 sm:items-stretch sm:p-5 sm:text-left"
              >
                <span className="flex w-full items-start justify-center gap-3 sm:justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-blush text-brand">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="hidden sm:block">
                    {soon ? <SoonBadge /> : <ArrowUpRight aria-hidden className="size-5 text-subtle group-hover:text-brand" />}
                  </span>
                </span>
                <span className="mt-2 text-xs font-semibold leading-tight text-fg sm:mt-4 sm:text-base">
                  {item.shortLabel ?? item.label}
                </span>
                {soon ? <span className="mt-0.5 text-[0.6rem] uppercase tracking-wide text-subtle sm:hidden">Em breve</span> : null}
                <span className="mt-1 hidden text-sm text-muted sm:line-clamp-2">{item.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
