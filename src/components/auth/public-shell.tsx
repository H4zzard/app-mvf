import { BRAND } from "@/config/brand";
import { cn } from "@/lib/cn";

/** Moldura das telas públicas (login, link enviado, acesso indisponível). */
export function PublicShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    // Identidade 2.0: fundo vinho, cartão off-white. Sem ornamentos.
    <main className="mvf-on-wine relative flex min-h-dvh items-center justify-center overflow-hidden bg-wine-deep px-4 py-10">
      <div className={cn("relative w-full max-w-md", className)}>
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-lg bg-paper font-serif text-base font-bold text-wine-deep"
          >
            {BRAND.shortName}
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg font-semibold text-on-wine">{BRAND.appName}</span>
            <span className="block text-xs text-on-wine-muted">{BRAND.tagline}</span>
          </span>
        </div>
        <section className="mvf-light rounded-2xl bg-card p-6 text-fg shadow-raised sm:p-8">{children}</section>
      </div>
    </main>
  );
}
