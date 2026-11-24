"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DemoControls } from "@/components/layout/demo-role-switch";
import { usePlan } from "@/components/plan/plan-provider";
import { isAppNavHidden } from "@/lib/navigation/destinations";
import { cn } from "@/lib/cn";

/**
 * Shell compartilhado:
 * - ≥ 1024 px: lateral recolhível com os MESMOS sete destinos;
 * - < 1024 px: barra inferior fixa com os sete destinos (sem “Mais”). O
 *   conteúdo reserva espaço para a barra e para a área segura do aparelho.
 * - Modo foco (onboarding ainda não concluído e rotas de `FOCUS_ROUTE_PREFIXES`):
 *   sem barra e sem lateral, para o primeiro acesso ser um caminho único.
 */
export function AppShell({ children, demo = false }: { children: React.ReactNode; demo?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { profile } = usePlan();
  const focus = isAppNavHidden(pathname, { hasProfile: profile !== null });

  return (
    <div className="flex min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-paper px-4 py-2 text-sm font-semibold text-wine-deep focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Pular para o conteúdo
      </a>
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "mvf-on-wine sticky top-0 hidden h-dvh shrink-0 flex-col bg-wine-deep text-on-wine transition-[width] duration-200",
          !focus && "lg:flex",
          collapsed ? "w-[76px]" : "w-[272px]",
        )}
      >
        <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-5")}>
          <BrandMark compact={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className="space-y-3 border-t border-white/10 p-3">
          {!collapsed && demo ? (
            <details className="group rounded-xl">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-sm font-medium text-on-wine-muted hover:bg-wine-soft hover:text-on-wine [&::-webkit-details-marker]:hidden">
                Controles da demo
                <ChevronUp aria-hidden className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 max-h-[60dvh] overflow-y-auto">
                <DemoControls />
              </div>
            </details>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            className={cn(
              "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-on-wine-muted transition-colors hover:bg-wine-soft hover:text-on-wine",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="size-[18px]" />
            ) : (
              <>
                <PanelLeftClose aria-hidden className="size-[18px]" />
                Recolher menu
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          id="conteudo"
          data-focus={focus || undefined}
          className={cn(
            "mx-auto w-full max-w-[1320px] flex-1 px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10",
            focus ? "pb-[calc(2.5rem+env(safe-area-inset-bottom))]" : "pb-[calc(6rem+env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </main>
      </div>

      {focus ? null : <BottomNav />}
    </div>
  );
}
