import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "inverse" | "onWine";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-[-0.005em] whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-paper shadow-sm hover:bg-brand-hover disabled:hover:bg-brand",
  secondary:
    "border border-brand/70 bg-card text-brand hover:border-brand hover:bg-blush disabled:hover:bg-card",
  ghost: "text-brand hover:bg-blush/70",
  /** Botão claro sobre fundo vinho/foto (CTA principal em blocos escuros). */
  inverse: "bg-paper text-wine-deep shadow-sm hover:bg-blush",
  /** Secundário sobre fundo vinho. */
  onWine: "border border-on-wine/35 text-on-wine hover:border-on-wine/60 hover:bg-wine-soft",
};

// Alturas mínimas de 40–48 px para alvos de toque confortáveis.
const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
