import Image from "next/image";
import { GraduationCap, ShieldCheck, Truck } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { site } from "@/content/site";

/** Claims taken verbatim from the live site's own advantages block. */
const assurances = [
  { icon: Truck, label: "Представники у кожному місті України" },
  { icon: GraduationCap, label: "Навчання лікарів в Україні та за кордоном" },
  { icon: ShieldCheck, label: "Міжнародні сертифікати якості" },
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden border-b border-hairline"
    >
      {/* Decorative art bleeds to the viewport edge; the copy column stays
          inside the layout margins on solid ground, so no text ever renders
          over the photograph. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] lg:block"
      >
        <Image
          src="/brand/hero.webp"
          alt=""
          fill
          priority
          sizes="54vw"
          className="object-cover object-right"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-base),transparent_58%)]" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 blueprint-grid opacity-40 [mask-image:radial-gradient(120%_90%_at_0%_0%,black,transparent_70%)]"
      />

      <div className="container-page relative py-16 lg:py-28">
        <div className="flex max-w-[36rem] flex-col gap-7">
          <Reveal className="flex flex-col gap-5">
            <Eyebrow>Дистрибуція імплантів в Україні</Eyebrow>
            <h1 id="hero-title" className="text-display text-balance text-fg">
              Нове покоління імплантів для травматології та ортопедії
            </h1>
            <p className="max-w-[52ch] text-lede text-pretty text-fg-secondary">
              {site.description}
            </p>
          </Reveal>

          {/* Full width until there is room for two, so the pair never wraps
              into ragged lines of different lengths. */}
          <Reveal
            delay={100}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <ButtonLink href="/catalog" size="lg" className="w-full sm:w-auto">
              Переглянути каталог
            </ButtonLink>
            <ButtonLink
              href="#consultation"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Отримати консультацію
            </ButtonLink>
          </Reveal>

          <Reveal delay={200} as="ul" className="flex flex-col gap-3 pt-4">
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
        </div>

        {/* Below the copy on narrow viewports rather than behind it. */}
        <div className="relative mt-12 aspect-5/4 overflow-hidden rounded-media media-outline lg:hidden">
          <Image
            src="/brand/hero.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
        </div>
      </div>
    </section>
  );
}
