"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { findNavItemByPath } from "@/config/navigation";
import { destinationForPath } from "@/lib/navigation/destinations";
import { useSession } from "@/components/layout/session-provider";
import { NotificationsButton } from "@/components/layout/notifications-button";
import { BrandMark } from "@/components/layout/brand-mark";
import { DemoBadge } from "@/components/ui/badge";
import { SyncStatus } from "@/components/layout/sync-status";
import { signOutAction } from "@/app/auth-actions";
import { LogOut } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  student: "Aluna",
  admin: "Admin",
  expert: "Expert",
  support: "Suporte",
  moderator: "Moderação",
  partner: "Parceira",
  owner: "Owner",
};

export function AppHeader() {
  const pathname = usePathname();
  const { user, mode } = useSession();
  const demo = mode === "demo";
  const item = findNavItemByPath(pathname);
  // Trilha: destino dono › página (ex.: Perfil › Ranking). Na página principal do destino, só o nome.
  const dest = destinationForPath(pathname);
  const parent = dest && item && item.href !== dest.href ? dest.fullLabel : undefined;

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4 pt-[env(safe-area-inset-top)] box-content sm:h-16 sm:px-6 lg:px-8">
        <BrandMark compact className="hidden sm:flex lg:hidden" />
        <BrandMark className="sm:hidden" />

        {/* Localização atual */}
        <nav aria-label="Localização" className="hidden min-w-0 sm:block">
          <ol className="flex items-center gap-1.5 text-sm">
            {parent ? (
              <>
                <li className="text-muted">{parent}</li>
                <li aria-hidden>
                  <ChevronRight className="size-3.5 text-subtle" />
                </li>
              </>
            ) : null}
            <li aria-current="page" className="truncate font-semibold text-fg">
              {item?.label ?? "Página"}
            </li>
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {demo ? (
            <>
              <span className="hidden md:inline-flex">
                <DemoBadge label="Modo demo local · nada é salvo" />
              </span>
              <span className="md:hidden">
                <DemoBadge label="Demo" />
              </span>
            </>
          ) : (
            <SyncStatus />
          )}
          <NotificationsButton />
          <div className="hidden items-center gap-2.5 rounded-full border border-line bg-card py-1 pl-1 pr-1 min-[400px]:flex sm:pr-3">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-full bg-blush font-semibold text-brand text-sm"
            >
              {user.initials}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold text-fg">{user.displayName}</span>
              <span className="block text-xs text-muted">
                {ROLE_LABEL[user.role] ?? "Aluna"}
                {demo ? " · demo" : ""}
              </span>
            </span>
            <span className="sr-only sm:hidden">
              {user.displayName}
              {demo ? " (demonstração)" : ""}
            </span>
          </div>
          {!demo ? (
            <form action={signOutAction} className="hidden lg:block">
              <button
                type="submit"
                aria-label="Sair da conta"
                title="Sair"
                className="grid size-11 place-items-center rounded-full border border-line bg-card text-muted transition-colors hover:text-brand"
              >
                <LogOut aria-hidden className="size-[18px]" />
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
