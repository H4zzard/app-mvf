"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/config/navigation";
import { destinationForPath } from "@/lib/navigation/destinations";
import { cn } from "@/lib/cn";

/**
 * Lateral do desktop (≥ 1024 px): os MESMOS sete destinos da barra inferior,
 * com os nomes completos. Páginas secundárias (Virais, Ranking, Suporte…) são
 * acessadas dentro do destino dono, que fica ativo nas subpáginas.
 */
export function SidebarNav({ collapsed = false }: { /** Modo trilho: apenas ícones. */ collapsed?: boolean }) {
  const pathname = usePathname();
  const activeId = destinationForPath(pathname)?.id;

  return (
    <nav aria-label="Navegação principal">
      <ul className="flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => {
          const active = item.id === activeId;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-label={item.a11yLabel}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.a11yLabel : undefined}
                data-nav={item.id}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active ? "bg-blush font-semibold text-brand" : "text-fg/80 hover:bg-blush/60 hover:text-fg",
                )}
              >
                <span
                  aria-hidden
                  className={cn("absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-brand", active ? "opacity-100" : "opacity-0")}
                />
                <Icon aria-hidden className={cn("size-[18px] shrink-0", active ? "text-brand" : "text-muted group-hover:text-fg")} />
                {collapsed ? null : (
                  <span aria-hidden className="min-w-0 flex-1 truncate">
                    {item.fullLabel}
                    {item.id === "tribo" ? <span className="font-normal text-muted"> · Comunidade</span> : null}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
