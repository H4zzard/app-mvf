"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/config/navigation";
import { destinationForPath } from "@/lib/navigation/destinations";
import { cn } from "@/lib/cn";

/**
 * Barra inferior do celular/tablet (< 1024 px): os SETE destinos, lado a lado,
 * sem menu “Mais”. FLUTUANTE: retângulo com cantos levemente arredondados,
 * vidro bordô translúcido (fundo embaçado aparece por trás), afastado das bordas
 * e acima da área segura. Cada item tem ≥ 44 × 44 px mesmo em 320 px (312 / 7).
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
      className="mvf-on-wine mvf-glass fixed inset-x-1 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-40 mx-auto max-w-2xl rounded-xl min-[360px]:inset-x-3 lg:hidden"
    >
      <ul className="grid h-16 grid-cols-7 px-0.5">
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
                  active ? "text-paper" : "text-on-glass-muted hover:text-on-wine",
                )}
              >
                {/* Destino ativo: bolha de vidro (bege translúcido sobre o bordô = bordô mais claro), em relevo. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0.5 inset-y-1.5 rounded-lg backdrop-blur-sm transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
                    active
                      ? "scale-100 bg-paper/15 opacity-100 ring-1 ring-paper/30 shadow-[inset_0_1px_0_rgb(255_251_248/0.28),0_6px_16px_-8px_rgb(164_5_45/0.9)]"
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
