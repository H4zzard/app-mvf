import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-sm hover:bg-brand-hover disabled:hover:bg-brand",
  secondary:
    "border border-line-strong bg-card text-fg hover:border-brand/40 hover:bg-blush disabled:hover:bg-card",
  ghost: "text-brand hover:bg-blush",
  inverse: "bg-white text-ink hover:bg-blush",
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
