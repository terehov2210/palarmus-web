import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/ui/section";

type Crumb = { label: string; href?: string };

/**
 * The opening of every inner page: where you are, what this is, one line on
 * why. It sits on the page ground like the home hero, with the same drafting
 * grid fading out from the top-left corner, and no rule under it — the next
 * section's own spacing is the break.
 *
 * `aside` takes the trailing column on wide screens (an illustration, a
 * contact card); without one the heading runs the full measure.
 */
export function PageHeader({
  id,
  trail,
  eyebrow,
  title,
  lede,
  aside,
  children,
}: {
  id: string;
  trail: Crumb[];
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
  /** Anything under the lede: actions, a row of cards. */
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 blueprint-grid opacity-50 [mask-image:radial-gradient(90%_80%_at_0%_0%,black,transparent_60%)]"
      />
      <div className="container-page flex flex-col gap-8 pt-10 pb-14 lg:pt-14 lg:pb-20">
        <Breadcrumbs trail={trail} />
        <div className={aside ? "grid items-center gap-10 lg:grid-cols-[1fr_0.95fr] lg:gap-16" : ""}>
          <Reveal className="flex flex-col gap-6">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h1 id={id} className="max-w-[20ch] text-display text-balance text-fg">
              {title}
            </h1>
            {lede ? <div className="max-w-[60ch] text-lede text-pretty text-fg-secondary">{lede}</div> : null}
          </Reveal>
          {aside ? <Reveal delay={100}>{aside}</Reveal> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
