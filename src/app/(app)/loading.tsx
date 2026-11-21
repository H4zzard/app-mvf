/** Estado de carregamento das telas internas (esqueleto leve). */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-6 motion-reduce:animate-none">
      <span className="sr-only">Carregando…</span>
      <div className="h-9 w-64 max-w-full rounded-lg bg-blush-strong/70" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-56 rounded-2xl bg-card lg:col-span-2" />
        <div className="h-56 rounded-2xl bg-card" />
      </div>
      <div className="h-40 rounded-2xl bg-card" />
    </div>
  );
}
