# Palarmus Implants — new site

Next.js 16 (App Router) rebuild of [palarmus.com.ua](https://palarmus.com.ua).
It covers the **homepage**, the **catalogue** (`/catalog`, six category pages,
23 product pages), the **training section** (`/education`), **`/about`** and
**`/contacts`**. Everything else is a real 404. The visual identity follows the
Palarmus brandbook (see [Brand](#brand)).

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
node scripts/palette.mjs   # verify every colour pair against WCAG
python scripts/neutralise-art.py <files>   # strip blue grounds from new renders
python3 scripts/art.py     # rebuild public/ art from art-src/ (needs Pillow)
```

## Launch checklist

1. **`LEAD_WEBHOOK_URL`** — set it in the hosting environment (see
   `.env.example`). Without it the consultation form tells visitors to phone
   instead of pretending the request went through.
2. **Gilroy licence** — the brand's primary face is commercial. The subset
   files in `public/fonts/gilroy-*.woff2` must be covered by Palarmus' web
   licence before the site is public.
3. **Placeholder blocks** — off by default, see below. Turn each on only with
   real data.
4. **Office map link** — `site.address.href` in `src/content/site.ts` is still
   `null`.

## ⚠️ Placeholder content — gated off

Every block below is switched off in `published` (`src/content/trust.ts`), so
none of it renders, and no link points at it, until someone turns it on in the
same commit that replaces its data.

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

## Hero — the 3D model

The hero art is `public/models/implant.glb`: a pelvis, sacrum and both femurs
with a total hip replacement on the right hip, the right femur cut away so the
stem is visible inside the canal. It turns by itself, slowly, and carries six
labelled points — three implant components, three bones — each of which opens a
panel with a few sentences on what that part does.

It replaced the four-slide illustration carousel. The same screen real estate
now answers "what exactly am I buying" instead of listing directions the
catalogue lists anyway. The joints illustration stayed on as the no-WebGL
fallback; the other three slides are still in `public/brand/` and currently
unused, and the spec they were drawn to is kept in
[illustration-kit/hero-slider/](illustration-kit/hero-slider/README.md).

There is one canvas on the homepage, not two: the section that used to sit below
the product grid with the same model was removed when the hero took it over,
because two WebGL contexts is twice the frame cost for one asset.

### Cost, and who pays it

Nothing above the fold waits on WebGL. The hero's own markup — headline, lede,
CTAs — is server-rendered and paints on its own; the 3D bundle and the 1.5 MB
GLB are requested from a client effect and arrive whenever they arrive. Until
then the frame holds the page's blue wash and, once the chunk is in, a progress
line. Scrolled past, the frame loop stops (`frameloop="never"`, off an
IntersectionObserver).

**There is no poster.** There used to be: the joints illustration painted
immediately and crossfaded out when the model arrived. It went because the
handover was the most visible thing about the hero — a drawing appearing and
being replaced a second later reads as a page changing its mind, and no easing
curve fixes that. The illustration now renders *only* when the WebGL probe comes
back negative, which also means 87KB that was fetched with `priority` on every
single visit is no longer fetched at all. Verified: no request for
`hero-joints.webp` on a normal load.

The trade is deliberate and worth naming: the frame is empty for as long as the
3D chunk and the GLB take. It is tinted rather than white, and outlined below
`lg`, so it reads as a frame waiting rather than as a hole — but on a slow
connection it *is* a wait, where the poster used to fill it. If that ever reads
as broken, the fix is a lighter first-frame state, not bringing the poster back.

The asset is EXT_meshopt_compression, and `useGLTF` is called with Draco
explicitly off, because drei's default points DRACOLoader at gstatic.com.
MeshoptDecoder ships inside the bundle, so nothing is fetched from a third party
— including the environment map, which is generated locally from Lightformers
rather than downloaded as an HDRI.

### Lighting

The asset ships **one** material, with a metallicRoughness map and both factors
left at the glTF default of 1. So the cup and the stem are true metal — direct
lights give them almost no diffuse and nearly everything they show is a
reflection — while the bone is dielectric and wants ordinary directional
shading. One material, two jobs, one `envMapIntensity` between them.

The split is made by the **shape** of the sources, not their number. A narrow
bright card mirrors as a hard streak down the stem while adding almost nothing
to the overall irradiance; a big soft one floods the scene and flattens the bone
to a pale beige, which is exactly what a first pass at "brighter" produced. So
the rig is four narrow strips plus one small hot circle for the glint on the
ceramic head, over a deep blue ground — the value every unlit facet of the metal
settles to.

The bone is then lit the ordinary way: a warm key well above a very low ambient,
against a cool fill. Warm key against cool fill is what makes the render look
richer; turning everything up only ever made it look washed.

### Background

The hero sits in `hero-wash`, three gradient layers off the single
`accent-wash` stop: a deep pool where the model is, a shallower one opposite so
the band reads tinted rather than cornered, and a whole-section lift so no part
of it is page-white. The model's canvas is transparent, so the wash is what the
render composites onto — warm bone on a cool ground, which is most of why the
model reads as vivid.

There are two variants, switched at `lg`, because the deep pool has to follow
the art: off the right edge in two columns, down at the bottom when the hero
stacks. One geometry for both left the phone almost white.

### Interaction, and what each rule protects

- **No OrbitControls.** Rotation is a horizontal drag with inertia, under
  `touch-action: pan-y`, so the browser keeps vertical scrolling for itself. A
  hero that eats the first swipe, or the first turn of the wheel, is a hero
  nobody gets past. There is no zoom for the same reason.
- **It stops the moment the pointer is inside**, so nothing has to be chased to
  be clicked, and it never moves on its own under
  `prefers-reduced-motion: reduce`.
- **It sweeps an arc, it does not revolve.** A full revolution was the obvious
  thing and the wrong one: the construction is on one hip and faces
  anterolaterally, so a complete turn spends **41% of its time with no implant
  component visible at all** — the hero showing the back of a pelvis — and leaves
  each landmark reachable only 42–46% of the time. Swept between −25° and +60°
  instead, easing at both ends over about 40 seconds there and back, every
  implant component is visible throughout and each landmark is reachable 91–100%
  of the time. Measured live: never fewer than five of the six dots active.
  The band is asymmetric because the construction is, and it contains every
  landmark's own presenting azimuth, so opening one cannot throw the model
  outside its own sweep. Drag still goes anywhere, including the whole way
  round; the sweep eases it back in afterwards rather than fighting it.
- **Opening a landmark turns the model** until that part faces the reader, and
  holds it there while the panel is open — the same turn whether it was opened
  by its dot or by name. Under a reduce preference that turn is an instant cut
  rather than an animation: the model still has to end up showing the part being
  named. Dragging closes the panel rather than towing it around.
- **A dot fades out when its part turns away.** Visibility is
  `dot(facing, toCamera)` against an authored `facing` vector rather than a
  per-frame raycast: six raycasts against 200k triangles every frame is not a
  budget a hero has. Hit-testing is tied to exactly that visibility, over
  exactly the same range. It used to have a higher bar than the fade, which left
  a 12° band per dot where a half-lit plus looked clickable and was not — and
  because a dead dot could not be hovered either, it could not light itself up
  to escape that band.
- **Fading them out at all is what keeps the frame legible.** Two hotspots can
  sit on the same line of sight: the ceramic head and the greater trochanter,
  seen edge-on at 91°, project 3px apart on desktop and under a pixel on a
  phone, and the far one of the pair is genuinely behind the near one. A dot
  being hovered or open stays at full strength regardless, so nothing dims out
  from under the cursor mid-click.
- **The legend is the interface; the dots are the spatial affordance.** The
  bounded sweep keeps nearly every dot live nearly all the time, but "nearly" is
  not a thing to build the only route to the content on — a dot still moves
  while you reach for it, and the trochanter is genuinely behind the femur for
  part of the arc. So the six landmarks are also a row of named chips in the
  panel's slot: always complete, always in the same place, and marking the open
  one. The dots are `aria-hidden` and out of the tab order, because a moving
  target that can be occluded is not a control to hand a keyboard user.
- **Every route out of a panel is the same route.** A legend chip, a dot, the
  panel's own button and Escape all go through one handler in `HeroArt`, which is
  what stops Escape from closing the panel and leaving the focus on `<body>`.
  Focus returns to the legend chip for the landmark that was open — never to its
  dot, which by then may have turned away.
- **Nothing full-width may sit over the frame without `pointer-events-none`.**
  The copy column is `w-full`, so at `lg` its *box* spans the art as well, and
  because it carries `order-1` against the art's `lg:order-none` the flex
  container paints it over the canvas — in a flex container `order` reorders
  painting, not just layout. That swallowed every click aimed at a dot, and the
  only ones that appeared to work were the two that swing past the box's right
  edge, since `container-page` caps it at 82.5rem. The column is now
  `pointer-events-none` with `auto` on the copy block itself.
  Verify with hit-testing, not with `element.click()`: a scripted click bypasses
  the hit test entirely and will happily "pass" on a dot no cursor can reach.
  `document.elementFromPoint` at each dot's centre is the real check.
- **The stem's anchor is in the proximal third of the stem, not mid-shaft.**
  Mid-shaft put it at 52% of the frame height, exactly where the panel's top
  edge lands, so that one marker was unclickable whenever any panel was open.
  Higher up is also the part the copy is about.
- **The panel sits in a fixed slot, not on the dot.** The model fills the middle
  of the frame, so a popover opening outward covered the construction it was
  describing, and opening inward ran off the edge of the art. Two columns: it
  takes the frame's bottom corner. One column: the frame is barely taller than
  the panel, so it goes underneath, where it hides nothing.
- **The femoral shafts run out of the bottom of the frame** and the canvas is
  masked there, so they dissolve into the page instead of ending in a hard crop.
  The mask is on the canvas only; the dots and the legend over it stay at full
  strength.

### The labelled points

Coordinates live in `src/content/implant-hotspots.ts`. The GLB is one merged
mesh with a single baked material — there are no named nodes to hang a label on
— so every anchor was measured by raycasting the loaded geometry and reading
back the hit point, then checked against a rendered close-up. Re-measure if the
asset is ever re-exported.

`facing` is authored rather than taken from the surface normal, because it
answers a different question: not which way the triangle points, but which way
the feature reads from. It doubles as the target azimuth for the
turn-to-present.

| Point | Kind |
| --- | --- |
| Ацетабулярна чашка | implant |
| Керамічна головка | implant |
| Ніжка ендопротеза | implant |
| Великий вертлюг | bone |
| Кульшова западина | bone |
| Клубова кістка | bone |

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

Built on Base UI `Form` + `Field`. Each field validates in the browser with
the same rule the server action runs (`src/lib/consultation.ts`), on submit and
then on every change; the server validates again and returns its own errors
through Form's `errors` prop into the same `Field.Error` slot. Base UI wires
`aria-invalid`, `aria-describedby` and the label, and focuses the first
failing field. Without JavaScript it is still a plain `<form>` posting to the
server action.

The form is keyed on the values the server echoes back, so a failed submit
remounts it with those values as fresh defaults — Base UI does not allow an
uncontrolled field's `defaultValue` to change once mounted.

## UI primitives — Base UI

Interactive parts are built on [Base UI](https://base-ui.com) (`@base-ui/react`),
which ships behaviour and accessibility and no styles. All styling is still
Tailwind on our own tokens, keyed off Base UI's state attributes
(`data-pressed`, `data-invalid`, `data-disabled`, `data-starting-style`,
`data-ending-style`).

| Where | Base UI part |
| --- | --- |
| `ui/button.tsx` `Button` | `Button` (`focusableWhenDisabled` on pending submit) |
| Mobile menu | `Dialog` — portal, backdrop, focus trap, scroll lock, Escape |
| Consultation form | `Form`, `Field` (`Label`, `Control`, `Description`, `Error`) |
| Hero model switch | `ToggleGroup` + `Toggle` |
| Hero landmark chips, card close | `Button` |
| Hero model loading | `Progress` |

`ButtonLink` stays a styled Next `Link` on purpose: Base UI's Button enforces
button semantics, and its docs say a link that looks like a button should be
styled as a link.

Portals need two things from the root layout, both in place: page content in
an `isolate` wrapper (so popups always paint above it) and `relative` on
`<body>` (backdrop positioning on iOS Safari 26+).

## Brand

The identity is the Palarmus brandbook («Brand Guidlines», v1.0). What the site
takes from it:

- **Colour** — White `#FFFFFF`, Black `#000000`, Venetian Red `#C7000B`, plus
  the brandbook's own tints. Nothing else. See
  [docs/color-contrast.md](docs/color-contrast.md) for every measured pair.
- **Type** — Gilroy for headings and figures (Light 300 for display, Medium 500
  for section heads, SemiBold 600 for card titles, ExtraBold 800 for emphasis),
  Montserrat for running text. Display and h2 are set in capitals, as every
  heading in the brandbook is. Wrap a word in `<strong>` inside a display
  heading to get the two-weight line from the exhibition stand.
- **The red square** — the marker under every brandbook heading. It is the
  `brand-mark` utility (size it with `size-*`) and leads every `Eyebrow`.
- **Square corners, flat surfaces** — cards and media are square, controls
  keep 2px; separation comes from 1px lines, and the only shadow is on hover.
- **Black chapter pages** — `.tone-ink` re-points the semantic tokens at black.
  The hero, «Чому Palarmus», the mission block and the footer use it. The hero
  is modelled on the brandbook's exhibition stand: black ground, the anatomy
  lit, a low red glow behind it, and a red band (the assurances strip) below.
- **Logo** — `src/components/ui/logo.tsx`, traced from the brandbook's vector
  master, coloured by `currentColor` (black on white, white on black, white on
  red — the three approved combinations). `lockup` includes the *implants*
  script; `wordmark` is for small sizes. Raw SVGs are in `public/brand/`.
- **Icon** — `src/app/icon.svg`: the logo's «P» with the red square, on black.
- **Slogan** — «Інновації, які лікують» (brandbook 1.3), used as the hero
  eyebrow and in the footer. `/about` quotes «Про бренд» and «Місія» verbatim.

The illustrations were commissioned against the earlier azure palette.
`scripts/neutralise-art.py` desaturates only the blue band of hues (grounds,
soft tissue) and leaves bone, titanium and ceramic as rendered; it has been
run over `public/categories`, `public/education` and the hero fallback. Run it
on any new render before it goes in. After replacing an image, clear
`.next/cache/images` (and `.next/dev/cache/images` in dev) or the optimiser
keeps serving the old one.

Security headers (`next.config.ts`): HSTS, `X-Frame-Options: DENY` +
`frame-ancestors 'none'`, `nosniff`, a strict referrer policy and a
permissions policy. No script CSP: Next inlines its bootstrap, so a real one
needs per-request nonces from a proxy.

### Accessibility notes

- Skip link is the first focusable element.
- One `<h1>`, section `<h2>`, card `<h3>`; every section is a labelled region.
- Focus ring is the ink at 2px with a 2px offset — one value that clears 3:1 on
  every surface *including* the accent fill, plus `Highlight` under
  `forced-colors`.
- The mobile menu is a Base UI `Dialog`, so focus
  trapping, scroll lock, Escape and focus restoration come from the library.
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
    about/, contacts/   company and contact pages
    not-found.tsx       the 404; error.tsx the runtime error boundary
    globals.css         the design system
  components/
    sections/           one file per homepage section
    catalog/            product card, breadcrumbs
    ui/                 button, section scaffolding, art slot, brand glyphs
    hero-model.tsx      the hero canvas, its dots and the landmark legend
    site-header.tsx, site-footer.tsx, mobile-nav.tsx, reveal.tsx
  content/              all copy and data, no strings in components
  lib/                  validation + lead delivery
public/
  models/implant.glb    the hero model, meshopt-compressed
```

Copy lives in `src/content/`, not in components, so it can be handed to
whoever owns the words without touching layout.

## Known follow-ups

- **Product photography for 15 of 23 products** — the largest open item. See
  [docs/product-media.md](docs/product-media.md).
- Catalog search and filters: intentionally omitted rather than shipped as dead
  controls. Both need a backend.
- «Покупцям», «Блог» and the account area are on the live site's menu but have
  no content yet, so they are out of the navigation rather than linking to a
  stub. Add them to `primaryNav` / `footerNav` as their pages land.
- The hero's 3D model is the hip specimen; it will be replaced by the
  interactive skeleton map (a Palarmus-capped skeleton, joints linking to the
  catalogue) once that model is delivered.
- Спінальна хірургія has no products, matching the live shop. If that is wrong,
  the source is the shop, not this build.
- Payment methods are listed as text; no card-brand marks are bundled.
- `public/brand/hero.webp`, `hero-spinal.webp` and `hero-sports.webp` are
  commissioned art with nothing rendering them since the hero became the 3D
  model. The obvious home is one illustration per card in the Напрями section.
