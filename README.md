# Palarmus Implants — new site

Next.js 16 (App Router) rebuild of [palarmus.com.ua](https://palarmus.com.ua).
This iteration covers the **homepage**, the **catalogue** (`/catalog`, six
category pages, 23 product pages) and the **training section** (`/education`)
end to end; the remaining routes land on a "розділ у розробці" stub so nothing
they link to dead-ends.

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
node scripts/palette.mjs   # regenerate + verify the colour system
python3 scripts/art.py     # rebuild public/ art from art-src/ (needs Pillow)
```

## ⚠️ Placeholder content — read before publishing

`src/content/trust.ts` carries the three blocks the redesign added, and none of
their data is verified:

| Block | State |
| --- | --- |
| `certificates` | Structure only. The live site claims "міжнародні сертифікати якості" but names no standard, issuer, or document. Replace each entry with a document Palarmus actually holds. |
| `stats` | Invented figures. No numbers are published anywhere on the current site. |
| `testimonials` | Invented quotes, authors rendered as the literal slot `Ім’я лікаря`. Collect real quotes with written consent before this section goes live. |

`advantages`, `partners`, all category and product names, and every contact
detail **are** taken verbatim from the live site.

Certificate cards render a `Переглянути` link only when `documentUrl` is set;
otherwise they say "Скан документа надаємо за запитом", so the page never
offers a file that does not exist.

## Hero slider

The hero rotates through one illustration per catalogue direction. The copy
beside it never changes: the value proposition is one message, and a headline
that rewrites itself under the reader is worse than no slider. What rotates is
the evidence of range.

Four slides, one per direction: травматологія, заміна суглобів, спінальна
хірургія, спортивна медицина. `src/content/hero-slides.ts` lists them;
`hero.tsx` drops any whose file is missing from `public/` and `HeroArt` falls
back to a plain static image when fewer than two remain, so the hero never
shows a placeholder and adding a fifth direction needs no code. Spec and
sources: [illustration-kit/hero-slider/](illustration-kit/hero-slider/README.md).

Cost, measured with cache disabled: first paint still fetches **one** image
(13 KB), because slide 0 is the LCP element and nothing else is mounted yet.
A reader who stays long enough to see all four pulls 140 KB total — still well
under the 202 KB the homepage cost before any of this work.

How it behaves, and why:

- **One `<Image>` element, not two.** This replaced the duplicated desktop and
  mobile trees, which is what made a slider affordable: four slides across two
  trees would have been eight fetches. It also closes the 53 KB duplicate-hero
  waste that was previously documented as a known residual.
- **Progressive loading.** Slide 0 is the measured LCP element, so it is the
  only image fetched during first paint. Slide 1 warms 900ms later, and each
  advance keeps exactly one slide warm ahead. Verified: 1 image mounted at
  first paint, 4 after two advances.
- **It stops when it should.** No auto-advance at all under
  `prefers-reduced-motion: reduce`; pauses on hover, on focus-within, and while
  the tab is hidden; and any use of the controls stops it permanently. There is
  a real pause button, because auto-advancing content that runs past five
  seconds needs a mechanism to stop it (WCAG 2.2.2) and hover is not one a
  keyboard reaches.
- **The controls carry their own ground.** Label, pause and dots are light chips
  over the art. The label started as plain `fg-secondary` text and measured
  about 1.5:1 on the deep blue slide; on its own chip it measures 12.7:1, and
  the dots clear the 3:1 non-text threshold against the darkest art in the set.
- **The group wraps the controls, not just the picture.** `role="group"` and the
  carousel role description sit on the element that holds the image *and* the
  buttons. They were on the media box while the controls sat beside it, which
  left the buttons announced as loose controls with nothing saying what they
  operate.
- **The label is a link** into the direction on screen, which keeps the cluster
  a control group rather than decoration — and keeps the slider from adding a
  fifth text element to the hero's stack, since it lives on the art rather than
  the copy column.
- Crossfade is 600ms on `ease`: a state change rather than an entrance, and
  slower than the site's UI easing because it is showing something rather than
  answering a click.

## Catalogue (`/catalog`)

Three levels, all prerendered: the index, `/catalog/{category}` for the six
directions, and `/catalog/{category}/{product}` for 23 products. Slugs are the
ones the previous build already linked to, so no URL moved.

Content is in `src/content/catalog.ts` (categories) and
`src/content/products.ts` (products). Both are scraped from the live shop, and
each product keeps a `source` URL so any claim can be traced back:

- **Size tables are the real ones.** 20 of 23 products carry the shop's own
  `Код продукту` / `Розмір` table, up to 27 rows. They are rendered in full
  rather than summarised, because the SKU list is the reason a buyer opens the
  page. (This is the opposite call from `/education`, which carries no numeric
  parameters at all — a catalogue states what a device *is*, a training page
  must not imply clinical guidance.)
- **`summary` comes from body copy, not the meta description.** The shop's meta
  text is SEO copy that opens with "Замовте"/"Придбайте" and truncates
  mid-sentence. The first descriptive sentence of the body reads as a product
  summary; leading rhetorical questions ("Шукаєте надійний…?") are dropped.
- **Спінальна хірургія is empty**, because it is empty on the live shop. That
  category page says so and offers a request form instead of rendering an empty
  grid.
- **15 of 23 products have no photograph.** See
  [docs/product-media.md](docs/product-media.md) — the shop's renders are lit on
  black and cannot be keyed onto a light page without damaging the product.

## Training section (`/education`)

Orientation material for trainees: fixation principles, six construction
types, materials, an anatomy-to-catalogue map and a glossary. Copy lives in
`src/content/education.ts`.

Two rules it is built to keep, both load-bearing for a medical audience:

- **No numeric parameters.** No screw diameters, reaming depths, torque
  figures or indication thresholds anywhere in the copy. Those are
  device-specific and the page points to the manufacturer's technique guide
  instead. Adding one invented figure here would be the worst possible bug in
  this section, so the closing block states the limit explicitly.
- **No stand-in imagery.** All seven illustrations have landed, but the slots
  stay honest either way: `src/components/ui/art-slot.tsx` checks `public/` at
  build time and falls back to a labelled placeholder carrying the render spec,
  so a missing file reads as missing rather than as a broken image. The spec,
  the style reference and the 29 product renders they were drawn from are in
  [illustration-kit/](illustration-kit/README.md).

## Consultation form

`src/lib/leads.ts` is the integration point. Set `LEAD_WEBHOOK_URL` to the CRM
or mail endpoint that should receive leads:

```bash
LEAD_WEBHOOK_URL="https://…"
```

Until it is set, `sendLead` throws and the form shows "Форма ще не підключена
до системи заявок. Зателефонуйте нам: …" — an honest failure with a working
recovery path, rather than a success that never happened.

Validation runs on submit, marks failing fields `aria-invalid`, points
`aria-describedby` at the inline message, and focuses the first failure.

## Design system

`src/app/globals.css` holds the whole system in two tiers.

**Primitives** (`--accent-500`, `--neutral-950`, …) are named by hue and never
referenced from a component. **Semantic tokens** (`--color-fg-secondary`,
`--color-accent-solid`, …) are named by role and are the only tier components
touch. Tailwind's default palette is switched off (`--color-*: initial`), so a
raw colour cannot slip into a class name.

Ramps are generated in OKLCH by `scripts/palette.mjs`: constant hue, even
steps in perceived lightness, chroma peaking mid-ramp, sRGB-gamut clamped.
Only the steps a role consumes are declared in CSS — run the script to print
the full ramps when a new role needs one.

- **Accent** h=257.7, a clean azure taken from `#0a6fe8`. The hue is held
  there on purpose: clear of the cyan end, where it would read as the teal the
  nearest competitor already owns, and clear of the violet end, where a
  medical blue starts looking like a generic gradient. One token serves both
  the filled button and accent text, so it sits at L 50.5% rather than the
  brand value — `#0a6fe8` is fine as a fill (4.72:1 under a white label) but
  as text it fails on two of the three surfaces.
- **Neutral** shares the accent hue at a trace chroma, so every grey on the
  page belongs to the same family of blue instead of reading as a separate
  warm or cool grey.
- **Error** h=25 and **success** h=152, deliberately 127° and 106° off the
  accent so a failed field never reads as a brand highlight. Colour is never
  the only cue — every error and success message ships an icon.
- No warning ramp: nothing renders one.

Every pair the page actually renders is measured in
[docs/color-contrast.md](docs/color-contrast.md). `node scripts/palette.mjs`
exits non-zero if any pair drops below its threshold.

One committed light appearance, no theme toggle. The page ground is a
near-white carrying a trace of the accent hue, and the ink is a cool
near-black. Because a hairline alone cannot separate a near-white card from a
near-white page, cards also carry `--shadow-card`, whose stops are the ink at
low alpha rather than black so the shade stays in the page's own hue.

### Art

Every image slot now holds a commissioned illustration: photoreal 3D anatomy
with the device in situ, ivory bone, brushed titanium and a translucent
soft-tissue envelope. The two hero slots sit on a deep blue ground, everything
inside a card on a near-white one. Sources, the style reference and the product
renders they were drawn from are in
[illustration-kit/](illustration-kit/README.md).

`scripts/art.py` has two live jobs and one dormant one:

- `--measure` prints the two pixels of the category art that the colour system
  depends on: the darkest pixel anywhere, which the caption scrim carries ink
  over, and the darkest pixel under the `01`..`06` index label, which is the
  only text on a card with **no** scrim behind it. Both are asserted by
  `palette.mjs`. This is what caught the label falling to 3.63:1 when the
  illustrations replaced the old near-white duotone.
- A default run recolours the wordmark. It ships white-on-transparent, so it is
  invisible on a light page; the alpha channel is a clean mask, which makes the
  recolour exact rather than a re-trace.
- Its `ANATOMY` list is **empty on purpose**. The site originally shipped
  white-and-red x-ray stock on pure black, which the script inverted into a
  light blue duotone. The illustrations have replaced all of it. The code stays
  because `art-src/` still holds those originals, but anything listed there is
  overwritten, so a slot holding a real illustration must stay out of the list.

### Image delivery

Measured with the network panel over a real page load, cache disabled, scrolled
to the bottom so lazy images actually fetch:

| Page | Before | After |
| --- | --- | --- |
| Homepage, 1440x900 | 202 KB / 18 requests | **106 KB / 17** |
| `/education`, 1440x900 | 152 KB / 8 | **103 KB / 8** |

Two changes, in order of what they were worth:

- **The hero was downloaded twice.** The desktop and mobile `<Image>` both
  carried `priority`, so the browser preloaded both regardless of which one the
  breakpoint showed. On a 1440px viewport the hidden mobile block pulled a
  1920px variant: 53 KB of the homepage's 202 KB, for an element at
  `display: none`. Dropping `priority` there makes it lazy, and a lazy image
  under a hidden ancestor is never fetched. Its `sizes` was also `100vw` while
  the block sits inside `container-page`, which made the browser pick one step
  too large.
- **AVIF was configured off.** Next's default `images.formats` is
  `["image/webp"]`, so browsers advertising AVIF were still handed WebP.
  Enabling it saves 33-45% per asset on this kind of art — smooth 3D renders,
  large gradient areas, fine texture on top.

On quality: AVIF and WebP do not mean the same thing by `q=75`. Measured
against the source renders, AVIF q75 sits 0.6-2.0 dB PSNR below WebP q75, so
illustrations pass `quality={82}` instead, where the smooth hero is at parity
(0.02 dB) and the most texture-dense illustration is 1.4 dB behind while still
36% smaller. Verified by eye at 1:1 as well: no banding across the blue
grounds, trabecular texture and screw threads intact.

One known residual: the desktop hero keeps `priority` and is therefore still
fetched (~9 KB) on mobile, where it is hidden. It stays because the hero image
is the **measured LCP element** on desktop (140ms), and removing the preload to
save 9 KB on one breakpoint would trade a real metric for a small one. Merging
the two instances into a single element would fix both, but it means
restructuring a hero that is currently fitted to the fold to the pixel.

### Type

Manrope 400–800 variable, self-hosted as `.woff2` with `unicode-range` per
subset, so only Latin + Cyrillic load (two requests, ~39 KB). One family;
weight and size carry the hierarchy. Sizes are named by role
(`text-display`, `text-lede`, `text-body-sm`, `text-label`) with line-height
and tracking bound to each step.

### Motion

Every transition names the properties it animates — there is no
`transition: all` on the site — and every one of them is `transform`-family or
`opacity`/colour, so nothing animates layout.

| Role | Value | Why |
| --- | --- | --- |
| Press feedback | 150ms | Inside the 100-160ms window where a control still feels like it answered the finger. |
| Enter (dialog, banners) | 240ms | |
| Exit | 150ms | Faster than the entrance: the exit is the system responding to a decision already made. |
| Scroll reveal | 400ms + 60ms stagger | Was 520ms + 90ms, which stacked to ~800ms for the last card in a row. |
| Easing | `cubic-bezier(0.2, 0, 0, 1)` | One strong ease-out. No `ease-in` anywhere — it delays the first frame, which is the frame the user is watching. |
| Image zoom on hover | 200ms | Hover fires tens of times a day, so it is the one place to cut rather than
indulge. Was 300ms. |
| Spinner | 0.7s | Tailwind's 1s default made an identical wait feel longer. |

Details that are load-bearing:

- **Everything pressable has an `:active` scale**, not just buttons: cards take
  `0.99` (a large surface needs less), pills and small controls `0.97`, buttons
  `0.96`. Tailwind v4 gates `hover:` behind `@media (hover: hover)`, so without
  this a card tap on a phone had **no feedback at all** until navigation.
- **The mobile menu animates.** `showModal()` on its own snaps a full-screen
  surface into place. `dialog-sheet` in `globals.css` fades and slides it with
  `transition-behavior: allow-discrete`, which is what keeps `display` and the
  top layer alive long enough for the exit to play.
- **Form result banners use `@starting-style`** rather than mounting abruptly.
- **One hover rule needed manual gating.** Tailwind v4 gates plain `hover:`
  automatically, but the compound `hover:after:` on the desktop nav underline
  escaped it, so a tap on a touch laptop left the underline stuck on. It now
  carries `[@media(hover:hover)]:` explicitly. Compiled output has zero ungated
  `:hover` rules.
- **Scroll entrances are CSS keyframes, not JS.** CSS animations run off the
  main thread, so they stay smooth while the page is still loading — which is
  exactly when these fire.
- Motion is opt-in: under `prefers-reduced-motion: reduce` a global rule drops
  every `scale` and `translate` and narrows `transition-property` to colour and
  opacity. Verified: the dialog still opens and closes correctly, it just does
  not slide.

`@media print` force-shows every reveal, because print never scrolls.

### Accessibility notes

- Skip link is the first focusable element.
- One `<h1>`, section `<h2>`, card `<h3>`; every section is a labelled region.
- Focus ring is the ink at 2px with a 2px offset — one value that clears 3:1 on
  every surface *including* the accent fill, plus `Highlight` under
  `forced-colors`.
- The mobile menu is a native `<dialog>` opened with `showModal()`, so focus
  trapping, background `inert`, Escape and focus restoration come from the
  platform.
- Verified with no horizontal overflow at 320 px, 375 px and at 200 % zoom.

## Structure

```
src/
  app/
    layout.tsx          header + footer shell, metadata, font preloads
    page.tsx            homepage section order
    catalog/            index, [category], [category]/[product]
    education/          training section
    actions.ts          consultation server action
    [...slug]/          "розділ у розробці" stub for unbuilt routes
    globals.css         the design system
  components/
    sections/           one file per homepage section
    catalog/            product card, breadcrumbs
    ui/                 button, section scaffolding, art slot, brand glyphs
    site-header.tsx, site-footer.tsx, mobile-nav.tsx, reveal.tsx
  content/              all copy and data, no strings in components
  lib/                  validation + lead delivery
```

Copy lives in `src/content/`, not in components, so it can be handed to
whoever owns the words without touching layout.

## Known follow-ups

- **Product photography for 15 of 23 products** — the largest open item. See
  [docs/product-media.md](docs/product-media.md).
- Catalog search and filters: intentionally omitted rather than shipped as dead
  controls. Both need a backend.
- `src/app/[...slug]/page.tsx` still swallows real 404s for the routes that are
  not built yet (`/about`, `/for-buyers`, `/blog`, `/contacts`, `/account`).
  Inside `/catalog` a wrong slug now 404s properly. Delete the stub as the rest
  of the routes land.
- Спінальна хірургія has no products, matching the live shop. If that is wrong,
  the source is the shop, not this build.
- Payment methods are listed as text; no card-brand marks are bundled.
