import Link from "next/link";
import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary";
type Size = "md" | "lg";

/**
 * Exactly one filled action per view — the fill is what encodes primary
 * emphasis, so peers stay neutral.
 *
 * Press feedback is `scale(0.96)`. Transitions name the properties they
 * animate and stay at 150ms, since buttons are a high-frequency interaction.
 *
 * Disabled is styled off Base UI's `data-disabled`, which is also present
 * when the button stays focusable while disabled (the pending submit).
 */
const base = [
  "inline-flex items-center justify-center gap-2 text-center",
  "rounded-pill font-semibold whitespace-nowrap select-none",
  "transition-[background-color,border-color,color,box-shadow,scale] duration-fast ease-out-quint",
  "active:scale-[0.96]",
  // Colour is held through the pending state so the label keeps its ratio.
  "data-disabled:cursor-wait data-disabled:active:scale-100",
].join(" ");

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-solid text-on-accent shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_8px_20px_-8px_rgb(199_0_11/0.55)] hover:bg-accent-solid-hover hover:shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_12px_28px_-10px_rgb(199_0_11/0.65)] active:bg-accent-solid-active",
  // A tonal fill rather than a 1px frame: the ring is inset so it never
  // changes the button's size, and it only tightens on hover.
  secondary:
    "bg-fg/[0.05] text-fg ring-1 ring-inset ring-hairline hover:bg-fg/[0.09] hover:ring-hairline-strong",
};

/** 44px minimum on the smaller size keeps touch targets comfortable. */
const sizes: Record<Size, string> = {
  md: "min-h-11 px-5.5 text-body-sm",
  lg: "min-h-14 px-8 text-body",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return [base, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = Omit<
  ComponentPropsWithoutRef<typeof BaseButton>,
  "className"
> & {
  variant?: Variant;
  size?: Size;
  className?: string;
};

/**
 * A Base UI Button: native `<button>` semantics, plus `focusableWhenDisabled`
 * for a pending submit that keeps focus where the reader left it.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <BaseButton className={buttonClasses(variant, size, className)} {...props} />
  );
}

type ButtonLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

/**
 * Navigation is a link, so Cmd/Ctrl/middle-click keep working. Deliberately
 * not a Base UI Button: that component enforces button semantics, and Base UI
 * itself says a link that looks like a button should be styled as a link.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
