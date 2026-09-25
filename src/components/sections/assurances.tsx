import { GraduationCap, ShieldCheck, Truck } from "lucide-react";

import { Reveal } from "@/components/reveal";

/**
 * The three claims that used to sit inside the hero, under the CTAs.
 *
 * They moved for two reasons: they were the largest single block of the
 * hero's overflow past the first screen, and a trust strip inside a hero
 * competes with the value proposition it is supposed to support. As their own
 * band they read as a deliberate step between the hero and the catalogue.
 *
 * Claims are still taken verbatim from the live site's advantages block.
 */
const assurances = [
  { icon: Truck, label: "Представники у кожному місті України" },
  { icon: GraduationCap, label: "Навчання лікарів в Україні та за кордоном" },
  { icon: ShieldCheck, label: "Міжнародні сертифікати якості" },
];

export function Assurances() {
  return (
    // Continues the hero on the same ground rather than cutting it with a
    // solid band: three quiet tiles, the red kept to the icon badge.
    <section aria-label="Що ми гарантуємо">
      <Reveal
        as="ul"
        className="container-page grid gap-3 py-6 sm:grid-cols-3 lg:py-8"
      >
        {assurances.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-4 rounded-card bg-surface p-3 pe-5 text-body-sm font-medium text-fg ring-1 ring-inset ring-hairline"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-tint text-fg-accent">
              <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
            </span>
            {label}
          </li>
        ))}
      </Reveal>
    </section>
  );
}
