"use client";

import { useState } from "react";
import { ChevronUp, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav, MoreSheet } from "@/components/layout/bottom-nav";
import { DemoControls } from "@/components/layout/demo-role-switch";
import { cn } from "@/lib/cn";

/**
 * Shell compartilhado:
 * - ≥ 1024 px: sidebar recolhível;
 * - < 1024 px: barra inferior fixa (4 destinos + “Mais”), sem sidebar nem
 *   drawer competindo pela tela. O conteúdo reserva espaço para a barra e
 *   para a área segura do aparelho.
 */
export function AppShell({ children, demo = false }: { children: React.ReactNode; demo?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Pular para o conteúdo
      </a>
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-[272px]",
        )}
      >
        <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-5")}>
          <BrandMark compact={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className="space-y-3 border-t border-line p-3">
          {!collapsed && demo ? (
            <details className="group rounded-xl">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-sm font-medium text-muted hover:bg-blush hover:text-fg [&::-webkit-details-marker]:hidden">
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
              "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-blush hover:text-fg",
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
          className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)} moreOpen={moreOpen} />
      {moreOpen ? <MoreSheet onClose={() => setMoreOpen(false)} /> : null}
    </div>
  );
}
