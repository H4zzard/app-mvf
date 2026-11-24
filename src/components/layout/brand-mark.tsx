import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/cn";

/**
 * Marca: logo oficial da NUMI (BRAND.logoSrc) + nome do app. Sem logo, cai no
 * monograma em texto. Nunca usar logo recortado de capturas.
 * Fica sempre sobre a moldura vinho (cabeçalho e lateral): texto bege.
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
          className="size-9 shrink-0 rounded-full object-cover ring-1 ring-on-wine/25"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper font-serif text-sm font-bold tracking-wide text-wine-deep"
        >
          {BRAND.shortName}
        </span>
      )}
      {!compact ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[0.95rem] font-semibold tracking-[-0.01em] text-on-wine">
            {BRAND.appName}
          </span>
          <span className="block truncate text-xs text-on-glass-muted">{BRAND.tagline}</span>
        </span>
      ) : null}
    </Link>
  );
}
