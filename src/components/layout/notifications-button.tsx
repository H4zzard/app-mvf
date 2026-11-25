"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Painel de notificações — somente UI. Ainda não existe backend de
 * notificações, então o painel mostra um estado vazio honesto.
 */
export function NotificationsButton() {
  const pathname = usePathname();
  // Guardar a rota em que foi aberto fecha o painel automaticamente ao navegar.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenOn(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOn(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Notificações"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={cn(
          "grid size-11 place-items-center rounded-xl border border-line bg-card text-brand shadow-card transition-colors hover:border-line-strong hover:bg-blush",
          open && "border-brand/40 bg-blush",
        )}
      >
        <Bell aria-hidden className="size-[18px]" />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Notificações"
          className="absolute right-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-card p-4 text-fg shadow-raised"
        >
          <p className="font-serif text-base font-semibold text-fg">Notificações</p>
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-canvas p-3">
            <BellOff aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
            <p className="text-sm text-muted">
              Nenhuma notificação. Avisos de lives, respostas na comunidade e novidades do seu plano
              aparecerão aqui quando o recurso for lançado.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
