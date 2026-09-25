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
        "py-20 lg:py-36",
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

/** Small pill label led by a Venetian Red dot. The dot is decorative and
    hidden from assistive tech. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex w-fit items-center gap-2 rounded-pill bg-fg/[0.05] py-1.5 ps-2.5 pe-3.5 text-label uppercase text-fg-secondary ring-1 ring-inset ring-hairline">
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-accent-solid shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent-solid)_20%,transparent)]"
      />
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
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
      <Reveal className="flex flex-col gap-5">
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
