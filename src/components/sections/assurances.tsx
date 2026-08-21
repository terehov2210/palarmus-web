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
    <section aria-label="Що ми гарантуємо" className="border-b border-hairline bg-surface">
      <Reveal
        as="ul"
        className="container-page grid gap-x-8 gap-y-4 py-6 sm:grid-cols-3 lg:py-7"
      >
        {assurances.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 text-body-sm text-fg-secondary"
          >
            <Icon
              aria-hidden="true"
              size={18}
              strokeWidth={1.5}
              className="shrink-0 text-fg-accent"
            />
            {label}
          </li>
        ))}
      </Reveal>
    </section>
  );
}
