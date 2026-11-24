import Link from "next/link";
import { BookOpen, LifeBuoy, ShieldCheck } from "lucide-react";
import { HELP_LINKS } from "@/lib/navigation/destinations";
import { cn } from "@/lib/cn";

const ICONS = [LifeBuoy, BookOpen, ShieldCheck] as const;

/**
 * Rodapé compacto de ajuda (Início e Aulas): Central de ajuda, FAQ e Regras.
 * Só leva às páginas existentes; nada é enviado daqui.
 */
export function HelpFooter({ title = "Precisa de ajuda?", className }: { title?: string; className?: string }) {
  const links = HELP_LINKS.slice(0, 3);
  return (
    <section aria-labelledby="help-footer-title" className={cn("border-t border-line pt-5", className)}>
      <h2 id="help-footer-title" className="text-sm font-semibold text-fg">
        {title}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((l, i) => {
          const Icon = ICONS[i];
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium text-fg transition-colors hover:border-brand/30 hover:text-brand"
              >
                <Icon aria-hidden className="size-4 text-muted" />
                {i === 1 ? "FAQ" : l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
