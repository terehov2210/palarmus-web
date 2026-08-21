import type { ReactNode } from "react";
import { Reveal } from "@/components/reveal";

type SectionProps = {
  id?: string;
  /** `surface` lifts a band off the page ground without a separator line. */
  tone?: "base" | "surface";
  className?: string;
  children: ReactNode;
  /** Section heading id, wired to aria-labelledby. */
  labelledBy?: string;
};

export function Section({
  id,
  tone = "base",
  className,
  children,
  labelledBy,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={[
        "py-20 lg:py-32",
        tone === "surface" ? "bg-surface" : "bg-base",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

/** Small tracked label with a short accent rule. Decorative rule is hidden. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-label uppercase text-fg-muted">
      <span aria-hidden="true" className="h-px w-8 shrink-0 bg-accent-line" />
      {children}
    </p>
  );
}

type SectionHeaderProps = {
  /** Optional on purpose: an eyebrow above every heading reads as a template.
      The training page runs at most one per three sections. */
  eyebrow?: string;
  title: string;
  titleId: string;
  description?: string;
  /** Trailing action, e.g. a link into the full catalog. */
  action?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  titleId,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <Reveal className="flex flex-col gap-4">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2
          id={titleId}
          className="max-w-[22ch] text-h2 text-balance text-fg"
        >
          {title}
        </h2>
        {description ? (
          <p className="max-w-[58ch] text-lede text-pretty text-fg-secondary">
            {description}
          </p>
        ) : null}
      </Reveal>
      {action ? (
        <Reveal delay={120} className="shrink-0">
          {action}
        </Reveal>
      ) : null}
    </div>
  );
}
