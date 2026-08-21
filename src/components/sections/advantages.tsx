import { GraduationCap, Layers, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import { advantages, stats, type Advantage } from "@/content/trust";

const icons: Record<Advantage["icon"], LucideIcon> = {
  truck: Truck,
  graduation: GraduationCap,
  layers: Layers,
  shield: ShieldCheck,
};

export function Advantages() {
  return (
    <Section id="why-us" tone="surface" labelledBy="advantages-title">
      <SectionHeader
        eyebrow="Чому Palarmus"
        titleId="advantages-title"
        title="Постачальник, який доїжджає до операційної"
        description="Palarmus Implants — молода компанія, що виводить на український ринок сучасні рішення у травматології та ортопедії разом із виробниками, а не замість них."
      />

      <Reveal
        as="dl"
        delay={80}
        className="mt-14 grid gap-x-8 gap-y-10 border-t border-hairline pt-10 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-2">
            <dt className="order-2 text-body-sm text-fg-muted">{stat.label}</dt>
            <dd className="order-1 text-stat text-fg">{stat.value}</dd>
          </div>
        ))}
      </Reveal>

      <ul className="mt-20 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {advantages.map((advantage, i) => {
          const Icon = icons[advantage.icon];
          return (
            <Reveal
              as="li"
              key={advantage.title}
              delay={(i % 4) * 60}
              className="flex flex-col gap-4 border-t border-hairline pt-6"
            >
              <Icon
                aria-hidden="true"
                size={24}
                strokeWidth={1.5}
                className="text-fg-accent"
              />
              <h3 className="text-h3 text-fg">{advantage.title}</h3>
              <p className="text-body-sm text-pretty text-fg-secondary">
                {advantage.body}
              </p>
            </Reveal>
          );
        })}
      </ul>
    </Section>
  );
}
