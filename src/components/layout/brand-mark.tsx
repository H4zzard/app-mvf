import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/cn";

/**
 * Marca: logo oficial da NUMI (BRAND.logoSrc) + nome do app. Sem logo, cai no
 * monograma em texto. Nunca usar logo recortado de capturas.
 */
export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/inicio"
      className={cn("flex min-w-0 items-center gap-2.5 rounded-lg", className)}
      aria-label={`${BRAND.appName} — ir para o Início`}
    >
      {BRAND.logoSrc ? (
        <Image
          src={BRAND.logoSrc}
          alt=""
          width={72}
          height={72}
          priority
          className="size-9 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-brand/10"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand font-serif text-sm font-bold tracking-wide text-white"
        >
          {BRAND.shortName}
        </span>
      )}
      {!compact ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-serif text-base font-semibold text-fg">
            {BRAND.appName}
          </span>
          <span className="block truncate text-xs text-muted">{BRAND.tagline}</span>
        </span>
      ) : null}
    </Link>
  );
}
