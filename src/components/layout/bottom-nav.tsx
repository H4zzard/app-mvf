"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LayoutGrid, LogOut, X } from "lucide-react";
import {
  MOBILE_PRIMARY_IDS,
  NAV_GROUPS,
  NAV_ITEMS,
  getNavItem,
  isActivePath,
  isItemSoon,
  isNavItemVisible,
} from "@/config/navigation";
import { useSession } from "@/components/layout/session-provider";
import { DemoControls } from "@/components/layout/demo-role-switch";
import { signOutAction } from "@/app/auth-actions";
import { cn } from "@/lib/cn";

/**
 * Barra inferior do celular/tablet (< 1024 px): 4 destinos fixos + “Mais”.
 * Respeita a área segura (env(safe-area-inset-bottom)).
 */
export function BottomNav({ onOpenMore, moreOpen }: { onOpenMore: () => void; moreOpen: boolean }) {
  const pathname = usePathname();
  const primary = MOBILE_PRIMARY_IDS.map((id) => getNavItem(id));
  const inPrimary = primary.some((i) => isActivePath(pathname, i.href));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {primary.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors",
                  active ? "text-brand" : "text-muted hover:text-fg",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 h-[3px] w-8 rounded-b-full bg-brand transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {item.shortLabel ?? item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMore}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              "relative flex h-full w-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors",
              !inPrimary || moreOpen ? "text-brand" : "text-muted hover:text-fg",
            )}
          >
            <span
              aria-hidden
              className={cn("absolute top-0 h-[3px] w-8 rounded-b-full bg-brand transition-opacity", !inPrimary ? "opacity-100" : "opacity-0")}
            />
            <LayoutGrid aria-hidden className="size-[22px]" strokeWidth={!inPrimary ? 2.2 : 1.8} />
            Mais
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Folha “Mais”: demais módulos agrupados, controles da demo e sair. */
export function MoreSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const { user, mode } = useSession();
  const demo = mode === "demo";

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const close = () => ref.current?.close();
  const primary = new Set<string>(MOBILE_PRIMARY_IDS);
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: NAV_ITEMS.filter((i) => i.group === g.id && !primary.has(i.id) && isNavItemVisible(i, user.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <dialog
      ref={ref}
      aria-labelledby="more-title"
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="mvf-sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-surface p-0 text-fg shadow-raised lg:hidden"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" />
        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <h2 id="more-title" className="font-serif text-xl font-semibold">
            Mais
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar menu"
            className="-mr-2 grid size-11 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`more-${g.id}`}>
              <h3 id={`more-${g.id}`} className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                {g.label}
              </h3>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  const soon = isItemSoon(item, demo);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-full min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-3 text-center text-xs font-medium transition-colors",
                          active ? "border-brand/40 bg-blush text-brand" : "border-line bg-card text-fg hover:border-brand/30",
                        )}
                      >
                        <Icon aria-hidden className={cn("size-5", active ? "text-brand" : "text-brand/80")} />
                        <span className="leading-tight">{item.label}</span>
                        {soon ? <span className="text-[0.6rem] uppercase tracking-wide text-subtle">Em breve</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {demo ? (
            <DemoControls onAction={close} />
          ) : (
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-card text-sm font-semibold text-muted hover:text-brand"
              >
                <LogOut aria-hidden className="size-4" />
                Sair da conta
              </button>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
}
