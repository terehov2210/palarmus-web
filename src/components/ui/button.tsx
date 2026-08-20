import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary";
type Size = "md" | "lg";

/**
 * Exactly one filled action per view — the fill is what encodes primary
 * emphasis, so peers stay neutral.
 *
 * Press feedback is `scale(0.96)`. Transitions name the properties they
 * animate and stay at 150ms, since buttons are a high-frequency interaction.
 */
const base = [
  "inline-flex items-center justify-center gap-2 text-center",
  "rounded-control font-semibold whitespace-nowrap",
  "transition-[background-color,border-color,color,scale] duration-fast ease-out-quint",
  "active:scale-[0.96]",
  // Colour is held through the pending state so the label keeps its ratio.
  "disabled:cursor-wait disabled:active:scale-100",
].join(" ");

const variants: Record<Variant, string> = {
  primary: "bg-accent-solid text-on-accent hover:bg-accent-solid-hover active:bg-accent-solid-active",
  secondary:
    "border border-hairline-strong text-fg hover:border-control-line hover:bg-raised",
};

/** 44px minimum on the smaller size keeps touch targets comfortable. */
const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-body-sm",
  lg: "min-h-13 px-7 text-body",
};

function classes(variant: Variant, size: Size, className?: string) {
  return [base, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={classes(variant, size, className)} {...props} />;
}

type ButtonLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

/** Navigation is a link, so Cmd/Ctrl/middle-click keep working. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
