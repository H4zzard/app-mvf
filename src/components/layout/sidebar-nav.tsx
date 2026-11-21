"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS, NAV_ITEMS, isActivePath, isItemSoon, isNavItemVisible } from "@/config/navigation";
import { useSession } from "@/components/layout/session-provider";
import type { NavGroupId } from "@/types";
import { cn } from "@/lib/cn";

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  /** Modo trilho: apenas ícones (desktop recolhido). */
  collapsed?: boolean;
  /** Chamado ao clicar em um link (ex.: fechar o drawer mobile). */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user, modulesPreview } = useSession();
  const [closedGroups, setClosedGroups] = useState<Partial<Record<NavGroupId, boolean>>>({});

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: NAV_ITEMS.filter((i) => i.group === group.id && isNavItemVisible(i, user.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {groups.map((group, index) => {
        const isClosed = !collapsed && closedGroups[group.id];
        const listId = `nav-group-${group.id}`;
        return (
          <div key={group.id} className={cn(index > 0 && "mt-3")}>
            {collapsed ? (
              index > 0 ? <div aria-hidden className="mx-3 mb-3 h-px bg-line" /> : null
            ) : (
              <button
                type="button"
                aria-expanded={!isClosed}
                aria-controls={listId}
                onClick={() => setClosedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                className="flex min-h-8 w-full items-center justify-between rounded-md px-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-subtle hover:text-muted"
              >
                {group.label}
                <ChevronDown
                  aria-hidden
                  className={cn("size-3.5 transition-transform", isClosed && "-rotate-90")}
                />
              </button>
            )}
            <ul id={listId} hidden={isClosed || undefined} className="mt-1 flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const soon = isItemSoon(item, modulesPreview);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? `${item.label}${soon ? " (em breve)" : ""}` : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-blush font-semibold text-brand"
                          : "text-fg/80 hover:bg-blush/60 hover:text-fg",
                      )}
                    >
                      {/* Indicador vertical vermelho do item ativo */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand transition-opacity",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <Icon
                        aria-hidden
                        className={cn("size-[18px] shrink-0", active ? "text-brand" : "text-muted group-hover:text-fg")}
                      />
                      {collapsed ? (
                        <span className="sr-only">
                          {item.label}
                          {soon ? " (em breve)" : ""}
                        </span>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {soon ? (
                            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-subtle">
                              Em breve
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
