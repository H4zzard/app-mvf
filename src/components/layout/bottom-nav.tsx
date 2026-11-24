"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/config/navigation";
import { destinationForPath } from "@/lib/navigation/destinations";
import { cn } from "@/lib/cn";

/**
 * Barra inferior do celular/tablet (< 1024 px): os SETE destinos, lado a lado,
 * sem menu “Mais”. Cada item tem ≥ 44 × 44 px mesmo em 320 px (7 × 45,7 px).
 * Abaixo de 360 px, “Estúdio” e “Produtos” viram “IA” e “Loja” (mesmo corpo de
 * fonte); o nome acessível completo é sempre o mesmo.
 * O destino continua ativo nas subpáginas (ex.: /ranking → Perfil).
 */
export function BottomNav() {
  const pathname = usePathname();
  const activeId = destinationForPath(pathname)?.id;

  return (
    <nav
      aria-label="Navegação principal"
      className="mvf-on-wine fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-wine-deep pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgb(36_8_18/0.6)] lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-2xl grid-cols-7">
        {PRIMARY_NAV.map((item) => {
          const active = item.id === activeId;
          const Icon = item.icon;
          return (
            <li key={item.id} className="min-w-0">
              <Link
                href={item.href}
                aria-label={item.a11yLabel}
                aria-current={active ? "page" : undefined}
                data-nav={item.id}
                className={cn(
                  "relative flex h-full min-w-11 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium leading-none tracking-tight transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent",
                  active ? "bg-wine-soft/55 text-on-wine" : "text-on-wine-muted hover:text-on-wine",
                )}
              >
                {/* Indicador discreto do destino ativo */}
                <span
                  aria-hidden
                  className={cn("absolute top-0 h-[2px] w-8 rounded-b-sm bg-accent", active ? "opacity-100" : "opacity-0")}
                />
                <Icon aria-hidden className={cn("size-[21px] shrink-0", active && "text-accent")} strokeWidth={active ? 2.1 : 1.6} />
                <span aria-hidden className={cn("whitespace-nowrap", item.compactLabel && "max-[359px]:hidden", active && "font-semibold")}>
                  {item.label}
                </span>
                {item.compactLabel ? (
                  <span aria-hidden className={cn("whitespace-nowrap min-[360px]:hidden", active && "font-semibold")}>
                    {item.compactLabel}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
