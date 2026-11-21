import { BRAND } from "@/config/brand";

/** Esqueleto exibido enquanto a sessão é verificada no servidor. */
export function AppBootSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh">
      <span className="sr-only">Verificando seu acesso…</span>
      <div className="hidden w-[272px] shrink-0 border-r border-line bg-surface lg:block">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand font-serif text-sm font-bold text-white">
            {BRAND.shortName}
          </span>
          <span className="h-4 w-24 rounded bg-blush-strong/60" />
        </div>
        <div className="space-y-3 px-5 pt-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-8 rounded-lg bg-blush/70" />
          ))}
        </div>
      </div>
      <div className="flex-1 animate-pulse space-y-6 p-6 motion-reduce:animate-none sm:p-8">
        <div className="h-9 w-64 max-w-full rounded-lg bg-blush-strong/60" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-56 rounded-2xl bg-card lg:col-span-2" />
          <div className="h-56 rounded-2xl bg-card" />
        </div>
      </div>
    </div>
  );
}
