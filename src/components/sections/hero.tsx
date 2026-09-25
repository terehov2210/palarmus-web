import { preload } from "react-dom";

import { HeroArt } from "@/components/sections/hero-art";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { skeletonModelUrl } from "@/content/skeleton-zones";
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
 * off it. That is also why the section is a column below `lg` and lets the art
 * bleed absolutely above it.
 *
 * Four text elements, no more: eyebrow, headline, lede, actions. The three
 * assurance claims that used to sit under the CTAs now have their own band
 * directly below this section — they were ~116px of the overflow, and they
 * repeat the "Чому Palarmus" block further down the page.
 *
 * The art is the Palarmus skeleton — the brand mascot in its red cap — shown
 * from the cap to mid-thigh, with a button per catalogue direction. Opening
 * one turns the figure to it, goes x-ray and shows the implant in place, so the
 * same screen answers "what do you supply, and where does it go".
 */
export function Hero() {
  /**
   * The GLB, requested from the server-rendered markup rather than discovered
   * by the code that needs it.
   *
   * The model loads from a client effect inside a lazily imported chunk, so
   * without this the browser cannot even learn the file exists until three,
   * R3F and drei — 280KB gzipped — have been fetched, parsed and hydrated.
   * Measured on a throttled 4G profile that was 1.2s of an idle network before
   * the request started, and the two downloads then ran back to back instead
   * of together.
   *
   * `as="fetch"` with `crossOrigin` is what matches the request three's
   * FileLoader actually makes; get either wrong and the browser downloads the
   * file twice rather than once.
   */
  preload(skeletonModelUrl, { as: "fetch", crossOrigin: "anonymous" });

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex flex-col overflow-hidden lg:min-h-[calc(100dvh-4.5rem-1px)] lg:flex-row lg:items-center"
    >
      {/* Under everything, including the model: the canvas is transparent, so
          this is the ground the figure stands on. */}
      <div aria-hidden="true" className="hero-backdrop pointer-events-none absolute inset-0" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 blueprint-grid opacity-50 [mask-image:radial-gradient(120%_90%_at_0%_0%,black,transparent_65%)]"
      />

      {/* `pointer-events-none` here, `auto` on the copy block itself.
          This box is `w-full`, so at `lg` it spans the whole section — the art
          included — and `order-1` against the art's `lg:order-none` makes the
          flex container paint it *over* the canvas (in a flex container `order`
          reorders painting, not just layout). Without this it swallowed every
          click and hover aimed at the model's markers, and the only ones that
          ever worked were the two that swing past this box's right edge, since
          `container-page` caps it at 82.5rem. */}
      <div className="container-page pointer-events-none relative order-1 w-full py-14 lg:py-16">
        <div className="pointer-events-auto flex max-w-[40rem] flex-col gap-9">
          <Reveal className="flex flex-col gap-7">
            <Eyebrow>{site.slogan}</Eyebrow>
            {/* Two weights, as on the brandbook's exhibition stand: the
                category in Light, the subject in ExtraBold. */}
            <h1 id="hero-title" className="text-display text-balance text-fg">
              Нове покоління <strong>імплантів</strong> для травматології та
              ортопедії
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
      </div>

      <HeroArt />
    </section>
  );
}
