import Image from "next/image";

import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { site } from "@/content/site";

/**
 * One screen, vertically centred.
 *
 * `min-h` is the viewport minus everything above it, so the section ends
 * exactly at the fold instead of overflowing it. That subtrahend is the
 * header's `h-18` (4.5rem) **plus its bottom hairline** — miss the 1px and the
 * hero lands one pixel past the fold at every single viewport size, which is
 * enough to arm the scrollbar.
 *
 * `dvh` rather than `vh`: on iOS Safari the address bar makes `vh` taller than
 * what is actually visible, which is the bug this was fixed to avoid.
 *
 * The height floor is desktop-only. On narrow viewports the art sits below the
 * copy as its own block, so forcing a full screen there would push the CTAs
 * off it.
 *
 * Four text elements, no more: eyebrow, headline, lede, actions. The three
 * assurance claims that used to sit under the CTAs now have their own band
 * directly below this section — they were ~116px of the overflow, and they
 * repeat the "Чому Palarmus" block further down the page.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex items-center overflow-hidden border-b border-hairline lg:min-h-[calc(100dvh-4.5rem-1px)]"
    >
      {/* Decorative art bleeds to the viewport edge; the copy column stays
          inside the layout margins on solid ground, so no text ever renders
          over the illustration. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] lg:block"
      >
        <Image
          src="/brand/hero.webp"
          alt=""
          fill
          quality={82}
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

      <div className="container-page relative w-full py-14 lg:py-16">
        <div className="flex max-w-[36rem] flex-col gap-7">
          <Reveal className="flex flex-col gap-5">
            <Eyebrow>Дистрибуція імплантів в Україні</Eyebrow>
            <h1 id="hero-title" className="text-display text-balance text-fg">
              Нове покоління імплантів для травматології та ортопедії
            </h1>
            <p className="max-w-[46ch] text-lede text-pretty text-fg-secondary">
              {site.heroLede}
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
        </div>

        {/* Below the copy on narrow viewports rather than behind it.

            No `priority` here, and that is the point. Both instances used to
            carry it, so the browser preloaded both regardless of which one the
            breakpoint actually shows: on a 1440px viewport this hidden block
            pulled a 1920px variant, 53KB of the homepage's 202KB, for an
            element at `display: none`. Without `priority` it is lazy, and a
            lazy image under a hidden ancestor is never fetched.

            `sizes` is 92vw rather than 100vw because this block sits inside
            `container-page`, so it is the viewport minus the gutters. The old
            100vw made the browser pick one step too large and also tripped
            Next's own "image is not rendered at full viewport width" warning. */}
        <div className="relative mt-12 aspect-5/4 overflow-hidden rounded-media media-outline lg:hidden">
          <Image
            src="/brand/hero.webp"
            alt=""
            fill
            quality={82}
            sizes="92vw"
            className="object-cover object-right"
          />
        </div>
      </div>
    </section>
  );
}
