import { HeroArt } from "@/components/sections/hero-art";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { heroSlides } from "@/content/hero-slides";
import { site } from "@/content/site";
import { hasPublicAsset } from "@/lib/assets";

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
 * repeat the "Чому Palarmus" block further down the page. The slider's own
 * label lives on the art rather than in this column for the same reason.
 *
 * Slides with no file in `public/` are filtered out here rather than shown as
 * placeholders, and with fewer than two left `HeroArt` renders a plain static
 * image with no controls. So the hero looks finished now and the slider starts
 * working by itself as the remaining illustrations land.
 */
export function Hero() {
  const slides = heroSlides.filter((slide) => hasPublicAsset(slide.src));

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex flex-col overflow-hidden border-b border-hairline lg:min-h-[calc(100dvh-4.5rem-1px)] lg:flex-row lg:items-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 blueprint-grid opacity-40 [mask-image:radial-gradient(120%_90%_at_0%_0%,black,transparent_70%)]"
      />

      <div className="container-page relative order-1 w-full py-14 lg:py-16">
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
      </div>

      <HeroArt slides={slides} />
    </section>
  );
}
