import { BRAND } from "@/config/brand";
import { cn } from "@/lib/cn";

/** Moldura das telas públicas (login, link enviado, acesso indisponível). */
export function PublicShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-blush" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-20 size-96 rounded-full bg-blush/70" />
      <div className={cn("relative w-full max-w-md", className)}>
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-xl bg-brand font-serif text-base font-bold text-white"
          >
            {BRAND.shortName}
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg font-semibold text-fg">{BRAND.appName}</span>
            <span className="block text-xs text-muted">{BRAND.tagline}</span>
          </span>
        </div>
        <section className="rounded-3xl border border-line bg-card p-6 shadow-raised sm:p-8">{children}</section>
      </div>
    </main>
  );
}
