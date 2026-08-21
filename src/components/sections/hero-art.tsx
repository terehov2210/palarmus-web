"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

import type { HeroSlide } from "@/content/hero-slides";

const INTERVAL = 5500;
const FADE = 600;

/**
 * The hero illustration, as one element at every breakpoint.
 *
 * It replaces the two `<Image>` instances the hero used to carry. Those were a
 * measured 53KB of waste: both had `priority`, so the browser preloaded the
 * hidden one too. One element with a responsive `sizes` cannot have that
 * problem, and it is what makes a slider affordable at all — four slides
 * across two duplicated trees would have been eight fetches.
 *
 * Loading is progressive rather than upfront. Slide 0 is the LCP element on
 * desktop, so it is the only thing fetched during first paint; slide 1 mounts
 * after paint, and each advance mounts the one after it. A slider that
 * downloads all four illustrations before the reader has seen the first is not
 * a slider, it is a tax.
 *
 * Motion rules, in the order they matter:
 *  - Under `prefers-reduced-motion: reduce` it does not auto-advance at all.
 *    The controls still work, so the content is reachable, it just never moves
 *    on its own.
 *  - It pauses on hover and on focus-within, and while the tab is hidden.
 *  - Any use of the controls stops the rotation for good. Someone steering it
 *    does not want it steering back.
 *  - There is a real pause button. Auto-advancing content that runs longer than
 *    five seconds needs a way to stop it (WCAG 2.2.2), and hover is not a
 *    mechanism a keyboard reaches.
 *
 * The crossfade is a state change rather than an entrance, so it uses `ease`
 * and sits at 600ms — slower than the UI easing everywhere else on the site,
 * because this one is showing something rather than answering a click.
 */
export function HeroArt({ slides }: { slides: HeroSlide[] }) {
  const count = slides.length;
  const single = count < 2;
  /**
   * One piece of state, so the updater stays pure.
   *
   * `reach` is how many slides have been rendered: slide `i` mounts once
   * `i < reach`. It starts at 1, so first paint fetches only the LCP slide,
   * and every move bumps it far enough to keep exactly one slide warm ahead of
   * where the reader is. Splitting this into two `useState` calls forced a
   * `setState` inside an effect that watched the index, which is the pattern
   * React 19 rightly complains about.
   */
  const [{ index, reach }, setNav] = useState({ index: 0, reach: 1 });
  const [playing, setPlaying] = useState(!single);
  // Two separate holds on purpose: leaving the pointer must not clear a hold
  // that exists because the tab went to the background.
  const [hovered, setHovered] = useState(false);
  const [backgrounded, setBackgrounded] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Warm the second slide once the first has had the network to itself, so the
  // opening transition has something to fade to.
  useEffect(() => {
    if (single) return;
    const id = window.setTimeout(
      () => setNav((n) => ({ ...n, reach: Math.max(n.reach, 2) })),
      900,
    );
    return () => window.clearTimeout(id);
  }, [single]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setBackgrounded(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // The interval depends only on whether it should be running, never on the
  // current slide. Listing `index` here would tear it down and rebuild it on
  // every advance, resetting its phase so each slide got a slightly different
  // amount of time on screen. The updater form reads the latest index without
  // the effect having to know it.
  useEffect(() => {
    if (single || reduced || !playing || hovered || backgrounded) return;
    const id = window.setInterval(() => setNav((n) => step(n, n.index + 1, count)), INTERVAL);
    return () => window.clearInterval(id);
  }, [single, reduced, playing, hovered, backgrounded, count]);

  // Steering it stops it for good: someone driving does not want it driving
  // back a few seconds later.
  const take = useCallback(
    (next: number) => {
      setPlaying(false);
      setNav((n) => step(n, next, count));
    },
    [count],
  );

  return (
    <div
      className="order-2 w-full page-gutter pb-14 lg:absolute lg:inset-y-0 lg:right-0 lg:order-none lg:w-[54%] lg:p-0"
      /* The group is the wrapper, not the media box, because the controls sit
         beside the image rather than inside it. Labelling only the picture
         would leave the buttons announced as loose controls with nothing
         saying what they operate. */
      role={single ? undefined : "group"}
      aria-roledescription={single ? undefined : "карусель"}
      aria-label={single ? undefined : "Напрями постачання"}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <div
        className="relative aspect-5/4 overflow-hidden rounded-media media-outline lg:h-full lg:aspect-auto lg:rounded-none lg:outline-hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            aria-hidden={i === index ? undefined : true}
            className="absolute inset-0 transition-[opacity] ease-[ease] motion-reduce:transition-none"
            style={{
              opacity: i === index ? 1 : 0,
              transitionDuration: `${FADE}ms`,
            }}
          >
            {i < reach ? (
              <Image
                src={slide.src}
                alt={i === index ? slide.alt : ""}
                fill
                quality={82}
                priority={i === 0}
                sizes="(min-width: 1024px) 54vw, 92vw"
                className="object-cover object-right"
              />
            ) : null}
          </div>
        ))}

        {/* Desktop only: fades the art into the page so the copy column never
            sits on top of the illustration. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden lg:block bg-[linear-gradient(to_right,var(--color-base),transparent_58%)]"
        />

      </div>

      {/* Label, pause and dots as one cluster rather than a lone word floating
          mid-page: on desktop it overlays the bottom-right of the art, on
          narrow viewports it sits under the image in normal flow. Same markup
          either way, so the label is not duplicated.

          The label is a link into the direction the illustration is showing,
          which is what keeps this a control group and not decoration. It also
          means the slider adds no text to the hero's own four-element stack —
          it lives on the art, not in the copy column. */}
      {!single ? (
        <div className="mt-3 flex items-center justify-end gap-1.5 lg:absolute lg:end-8 lg:bottom-8 lg:mt-0">
          {/* The same light chip as the buttons, and for the same reason: on
              desktop this cluster sits on the deep blue illustration, where
              `fg-secondary` measured about 1.5:1. Every piece of the cluster
              carries its own ground so none of it depends on what the current
              slide happens to look like behind it. */}
          <Link
            href={`/catalog/${slides[index].category}`}
            className="hidden h-8 items-center rounded-control bg-base/80 px-2.5 text-caption text-fg backdrop-blur-sm transition-[background-color,color] duration-fast ease-out-quint hover:bg-base hover:text-fg-accent sm:inline-flex"
          >
            {slides[index].label}
          </Link>

          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={
              playing ? "Зупинити зміну слайдів" : "Відновити зміну слайдів"
            }
            className="inline-flex size-8 items-center justify-center rounded-control bg-base/80 text-fg backdrop-blur-sm transition-[background-color,scale] duration-fast ease-out-quint active:scale-[0.94] hover:bg-base"
          >
            {playing && !reduced ? (
              <Pause aria-hidden="true" size={13} strokeWidth={2} />
            ) : (
              <Play aria-hidden="true" size={13} strokeWidth={2} />
            )}
          </button>

          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => take(i)}
              aria-label={slide.label}
              aria-current={i === index ? "true" : undefined}
              className={`h-8 rounded-control bg-base/80 backdrop-blur-sm transition-[width,background-color,scale] duration-fast ease-out-quint active:scale-[0.94] hover:bg-base ${
                i === index ? "w-8" : "w-3.5"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mx-auto block size-1.5 rounded-full transition-[background-color] duration-fast ease-out-quint ${
                  i === index ? "bg-accent-solid" : "bg-fg-muted"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function step(nav: { index: number; reach: number }, to: number, count: number) {
  const index = ((to % count) + count) % count;
  return { index, reach: Math.min(count, Math.max(nav.reach, index + 2)) };
}
