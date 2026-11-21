import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MEMBER_ASSETS, MEMBER_MODULES } from "@/demo/member-area";

/**
 * Faixa compacta da área de membros no Início (somente modo demo). Usa o
 * banner oficial, mas fica abaixo do próximo passo: a jornada continua sendo
 * o protagonista da tela.
 */
export function MemberAreaBanner() {
  return (
    <Link
      href="/aulas"
      aria-label="Abrir a área de membros: Formação MVF"
      className="group relative block overflow-hidden rounded-3xl bg-ink text-white shadow-raised outline-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:col-span-3"
    >
      <span className="relative block h-36 sm:h-44">
        <Image
          src={MEMBER_ASSETS.banner}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1100px"
          className="object-cover object-[80%_30%] transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgb(23_15_25/0.94)_15%,rgb(70_12_30/0.6)_55%,transparent_85%)]" />
        <span className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center gap-1.5 p-5 sm:p-7">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/75">Área de membros</span>
          <span className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">Formação MVF</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85">
            {MEMBER_MODULES.length} módulos
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </span>
    </Link>
  );
}
