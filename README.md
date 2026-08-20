# Palarmus Implants — new site

Next.js 16 (App Router) rebuild of [palarmus.com.ua](https://palarmus.com.ua).
This iteration covers the **homepage** end to end; every other route currently
lands on a "розділ у розробці" stub so nothing the homepage links to
dead-ends.

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
node scripts/palette.mjs   # regenerate + verify the colour system
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

- **Accent** h=32.1, taken from the current site's `#ff2f00`. The filled
  button sits at L 54% rather than the brand value, because `#ff2f00` only
  reaches 3.71:1 against a white label.
- **Neutral** h=264, a cool graphite. Keeps the vermilion from muddying.
- **Error** h=0, deliberately 32° off the accent so a failed field never reads
  as a brand highlight. Colour is never the only cue — every error and success
  message ships an icon.
- No warning ramp: nothing renders one.

Every pair the page actually renders is measured in
[docs/color-contrast.md](docs/color-contrast.md). `node scripts/palette.mjs`
exits non-zero if any pair drops below its threshold.

One committed dark appearance, no theme toggle: the wordmark is white-only and
all product photography is lit on black.

### Type

Manrope 400–800 variable, self-hosted as `.woff2` with `unicode-range` per
subset, so only Latin + Cyrillic load (two requests, ~39 KB). One family;
weight and size carry the hierarchy. Sizes are named by role
(`text-display`, `text-lede`, `text-body-sm`, `text-label`) with line-height
and tracking bound to each step.

### Motion

Motion is opt-in. Hover and press feedback is ≤150 ms on named properties
only. Scroll entrances stagger at ~90 ms per card and are driven by
`src/components/reveal.tsx`, which:

- renders content **visible** and only ever hides elements below the fold, so
  a failed script cannot blank a section;
- skips the entrance for anything already on screen at mount;
- degrades to an opacity crossfade under `prefers-reduced-motion: reduce`,
  where a global rule also drops every `scale` and `translate` while keeping
  colour feedback and the pending-request spinner.

`@media print` force-shows every reveal, because print never scrolls.

### Accessibility notes

- Skip link is the first focusable element.
- One `<h1>`, section `<h2>`, card `<h3>`; every section is a labelled region.
- Focus ring is white at 2px with a 2px offset — one value that clears 3:1 on
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
    actions.ts          consultation server action
    [...slug]/          "розділ у розробці" stub for unbuilt routes
    globals.css         the design system
  components/
    sections/           one file per homepage section
    ui/                 button, section scaffolding, brand glyphs
    site-header.tsx, site-footer.tsx, mobile-nav.tsx, reveal.tsx
  content/              all copy and data, no strings in components
  lib/                  validation + lead delivery
```

Copy lives in `src/content/`, not in components, so it can be handed to
whoever owns the words without touching layout.

## Known follow-ups

- Catalog search: intentionally omitted rather than shipped as a dead
  control. It needs a backend.
- `src/app/[...slug]/page.tsx` currently swallows real 404s. Delete it as the
  actual routes land.
- Payment methods are listed as text; no card-brand marks are bundled.
