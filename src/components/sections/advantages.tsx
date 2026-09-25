import { GraduationCap, Layers, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import { advantages, published, stats, type Advantage } from "@/content/trust";

const icons: Record<Advantage["icon"], LucideIcon> = {
  truck: Truck,
  graduation: GraduationCap,
  layers: Layers,
  shield: ShieldCheck,
};

export function Advantages() {
  return (
    <Section
      id="why-us"
      labelledBy="advantages-title"
      className="relative isolate overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 end-[-10%] -z-10 h-[36rem] w-[48rem] rounded-full bg-[radial-gradient(closest-side,rgb(199_0_11/0.14),transparent)] blur-2xl"
      />
      <SectionHeader
        eyebrow="Чому Palarmus"
        titleId="advantages-title"
        title="Постачальник, який доїжджає до операційної"
        description="Palarmus Implants — молода компанія, що виводить на український ринок сучасні рішення у травматології та ортопедії разом із виробниками, а не замість них."
      />

      {/* Held back until every figure is verified — see `published`. */}
      {published.stats ? (
        <Reveal
          as="dl"
          delay={80}
          className="mt-14 grid gap-x-8 gap-y-10 border-t border-hairline pt-10 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-2">
              <dt className="order-2 text-body-sm text-fg-muted">
                {stat.label}
              </dt>
              <dd className="order-1 text-stat text-fg">{stat.value}</dd>
            </div>
          ))}
        </Reveal>
      ) : null}

      <ul
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${
          published.stats ? "mt-20" : "mt-16"
        }`}
      >
        {advantages.map((advantage, i) => {
          const Icon = icons[advantage.icon];
          return (
            <Reveal
              as="li"
              key={advantage.title}
              delay={(i % 4) * 60}
              className="flex flex-col gap-4 rounded-card bg-surface p-7 ring-1 ring-inset ring-hairline transition-[box-shadow] duration-medium ease-out-quint hover:shadow-card-hover hover:ring-hairline-strong"
            >
              <span className="mb-4 grid size-12 place-items-center rounded-inner bg-accent-tint text-fg-accent">
                <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
              </span>
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
