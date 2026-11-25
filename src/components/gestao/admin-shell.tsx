"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  ClipboardList,
  FlaskConical,
  Gamepad2,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MessagesSquare,
  Package,
  Radio,
  Settings,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { ADMIN_PROFILES, profileInfo, type AdminProfile } from "@/lib/admin/roles";
import { cn } from "@/lib/cn";
import { useAdmin } from "./admin-provider";

const NAV = [
  { href: "/gestao", label: "Visão geral", icon: LayoutDashboard },
  { href: "/gestao/cursos", label: "Cursos e aulas", icon: BookOpenCheck },
  { href: "/gestao/produtos", label: "Produtos NUMI", icon: Package },
  { href: "/gestao/roteiros", label: "Roteiros e presets", icon: Sparkles },
  { href: "/gestao/alteracoes", label: "Revisar e exportar", icon: ClipboardList, pending: true },
] as const;

/** Módulos da etapa 13B: aparecem, mas sem link nem ação (não implementados). */
const FUTURE = [
  { label: "Lives", icon: Radio },
  { label: "Comunidade", icon: MessagesSquare },
  { label: "Suporte", icon: LifeBuoy },
  { label: "Gamificação", icon: Gamepad2 },
  { label: "Configurações", icon: Settings },
];

const isActive = (path: string, href: string) => (href === "/gestao" ? path === href : path === href || path.startsWith(`${href}/`));

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { pending } = useAdmin();
  return (
    <nav aria-label="Painel de gestão" className="space-y-6">
      <ul className="space-y-1">
        {NAV.map((item) => {
          const active = isActive(path, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  active ? "bg-brand text-paper" : "text-fg hover:bg-blush",
                )}
              >
                <item.icon aria-hidden className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {"pending" in item && pending ? (
                  <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.7rem] font-semibold", active ? "bg-paper/25 text-paper" : "bg-brand text-paper")}>
                    {pending}
                    <span className="sr-only"> alterações pendentes</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div>
        <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-subtle">Etapa futura</p>
        <ul className="mt-1 space-y-1" aria-label="Módulos ainda não implementados">
          {FUTURE.map((f) => (
            <li key={f.label} className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-subtle">
              <f.icon aria-hidden className="size-4 shrink-0" />
              <span className="flex-1">{f.label}</span>
              <Badge tone="soon" className="whitespace-nowrap px-2 text-[0.65rem]">
                Não implementado
              </Badge>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/inicio" onClick={onNavigate} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted hover:bg-blush hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" />
        Voltar ao app das alunas
      </Link>
    </nav>
  );
}

function ProfileSelect({ id }: { id: string }) {
  const { state, dispatch } = useAdmin();
  const info = profileInfo(state.profile);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[0.7rem] font-semibold uppercase tracking-wider text-subtle">
        Perfil simulado
      </label>
      <select
        id={id}
        value={state.profile}
        onChange={(e) => dispatch({ type: "profile/set", profile: e.target.value as AdminProfile })}
        className="mt-1 min-h-10 w-full rounded-xl border border-line bg-card px-3 text-sm text-fg"
      >
        {ADMIN_PROFILES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.role ? "" : " (papel futuro)"}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted">{info.description}</p>
    </div>
  );
}

/**
 * Shell PRÓPRIO do painel (sem a barra inferior das alunas): barra lateral no
 * desktop; no celular, cabeçalho compacto com menu em painel.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  useLayoutEffect(() => () => setMenu(false), []);
  return (
    <div className="min-h-dvh bg-canvas">
      <div role="note" className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-xs text-paper/90">
        <FlaskConical aria-hidden className="size-3.5 shrink-0" />
        <span>
          <strong className="font-semibold text-paper">Painel demonstrativo local.</strong> Nada é salvo no banco ou nos arquivos; recarregar descarta as edições.
        </span>
      </div>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" className="grid size-11 place-items-center rounded-full border border-line bg-card text-fg" aria-label="Abrir menu do painel">
          <Menu aria-hidden className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg font-semibold leading-tight text-fg">Gestão MVF</p>
          <p className="truncate text-xs text-muted">Demonstração local</p>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-surface p-5 lg:flex">
          <div>
            <p className="font-serif text-xl font-semibold text-fg">Gestão MVF</p>
            <p className="text-xs text-muted">Painel demonstrativo · local</p>
          </div>
          <ProfileSelect id="perfil-desktop" />
          <NavList />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>

      {menu ? (
        <Sheet title="Gestão MVF" eyebrow="Painel demonstrativo" onClose={() => setMenu(false)}>
          <div className="space-y-6">
            <ProfileSelect id="perfil-mobile" />
            <NavList onNavigate={() => setMenu(false)} />
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
