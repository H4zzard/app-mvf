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
      className="mvf-on-wine mvf-glass fixed inset-x-0 bottom-0 z-40 rounded-t-[1.25rem] pb-[env(safe-area-inset-bottom)] lg:hidden"
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
                  active ? "text-white" : "text-on-glass-muted hover:text-on-wine",
                )}
              >
                {/* Destino ativo: cápsula clara em relevo (“decalque”), um pouco maior. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0.5 inset-y-1.5 rounded-xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
                    active
                      ? "scale-100 bg-white/16 opacity-100 ring-1 ring-white/25 shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_6px_14px_-8px_rgb(20_4_10/0.7)]"
                      : "scale-90 opacity-0",
                  )}
                />
                <Icon
                  aria-hidden
                  className={cn("relative size-[21px] shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none", active && "-translate-y-px scale-110")}
                  strokeWidth={active ? 2.2 : 1.6}
                />
                <span aria-hidden className={cn("relative whitespace-nowrap", item.compactLabel && "max-[359px]:hidden", active && "font-semibold")}>
                  {item.label}
                </span>
                {item.compactLabel ? (
                  <span aria-hidden className={cn("relative whitespace-nowrap min-[360px]:hidden", active && "font-semibold")}>
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
