"use client";

import Link from "next/link";
import { ChevronRight, Flame, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getNavItem, isItemSoon } from "@/config/navigation";
import { useSession } from "@/components/layout/session-provider";
import { SoonBadge } from "@/components/ui/badge";

const TOOLS: { navId: string; title: string; text: string; icon: LucideIcon }[] = [
  { navId: "videos-virais", title: "Vídeos Virais", text: "Referências para adaptar", icon: Flame },
  { navId: "estudio-ia", title: "Estúdio IA", text: "Prompts e roteiros", icon: Sparkles },
];

/**
 * Ferramentas para a etapa atual (Início). Vídeos Virais não ocupa um destino
 * da barra inferior, então o atalho direto fica sempre visível aqui (e no Estúdio).
 */
export function ToolShortcuts() {
  const { modulesPreview } = useSession();
  return (
    <section aria-labelledby="tools-title">
      <h2 id="tools-title" className="text-sm font-semibold text-fg">
        Ferramentas para criar
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2 sm:gap-3">
        {TOOLS.map((t) => {
          const item = getNavItem(t.navId);
          const soon = isItemSoon(item, modulesPreview);
          const Icon = t.icon;
          return (
            <li key={t.navId}>
              <Link
                href={item.href}
                data-tool={t.navId}
                className="group flex min-h-16 items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-card transition-colors hover:border-brand/30 sm:p-4"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-blush text-brand">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">{t.title}</span>
                  <span className="block text-xs text-muted">{t.text}</span>
                </span>
                {soon ? <SoonBadge /> : <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle group-hover:text-brand" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
