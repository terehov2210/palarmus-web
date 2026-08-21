/**
 * Hero slides.
 *
 * One illustration per catalogue direction that reads well at hero scale. The
 * copy beside them never changes: the value proposition is one message, and a
 * headline that rewrites itself under the reader is worse than no slider at
 * all. What rotates is the evidence of range.
 *
 * Order matters. The first slide is the LCP element on desktop, so it is the
 * one that already exists and is the one that gets `priority`.
 *
 * `category` points each slide at the direction it shows, which is what the
 * control for that slide is labelled with. Anything without a file in
 * `public/` is dropped from the rotation rather than shown as a placeholder —
 * see `illustration-kit/hero-slider/README.md` for what is outstanding.
 */

export type HeroSlide = {
  src: string;
  /** Catalogue slug the illustration belongs to. */
  category: string;
  /** Names the direction; used as the control label and the image alt. */
  label: string;
  alt: string;
};

export const heroSlides: HeroSlide[] = [
  {
    src: "/brand/hero.webp",
    category: "traumatology",
    label: "Травматологія",
    alt: "Стегнова кістка в розрізі з інтрамедулярним стержнем і блокувальними гвинтами",
  },
  {
    src: "/brand/hero-joints.webp",
    category: "joints",
    label: "Заміна суглобів",
    alt: "Ендопротез кульшового суглоба: ніжка в каналі стегна, головка, вкладиш і чашка в ацетабулі",
  },
  {
    src: "/brand/hero-spinal.webp",
    category: "spinal",
    label: "Спінальна хірургія",
    alt: "Поперековий відділ хребта з транспедикулярними гвинтами, стержнем і міжтіловим кейджем",
  },
  {
    src: "/brand/hero-sports.webp",
    category: "sports-medicine",
    label: "Спортивна медицина",
    alt: "Плечовий суглоб із шовними якорями в гленоїді та ниткою, що фіксує губу",
  },
];
