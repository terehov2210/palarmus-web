# Measured contrast

Every pair the homepage actually renders, computed from the token values in
`src/app/globals.css` (WCAG 2.x relative-luminance ratio, sRGB). Regenerate
after any token change — never estimate these.

One committed **light** appearance. Surfaces: `base` `#fcfdfe` ·
`surface` `#f2f5f9` · `raised` `#e7ebf0`. On light, "up" the stack is a deeper
tint rather than a lighter one: the page already sits at the top of the ramp,
so a band or a hover has nowhere to go but down.

## Text

| Foreground | Value | on base | on surface | on raised | Needs |
| --- | --- | --- | --- | --- | --- |
| `fg` | `#10141a` | 18.14 | 16.89 | 15.43 | 4.5 |
| `fg-secondary` | `#4e535a` | 7.61 | 7.09 | 6.47 | 4.5 |
| `fg-muted` | `#646970` | 5.43 | 5.06 | 4.62 | 4.5 |
| `fg-accent` | `#065fc9` | 5.91 | 5.51 | 5.03 | 4.5 |

Unlike the previous dark build, `fg-accent` clears 4.5:1 on all three
surfaces, so there is no surface accent **text** has to stay off.

## Accent fill

| Pair | Value | Ratio | Needs |
| --- | --- | --- | --- |
| `on-accent` label on `accent-solid` | `#ffffff` on `#065fc9` | 6.02 | 4.5 |
| `on-accent` label on `accent-solid-hover` | `#ffffff` on `#0452af` | 7.42 | 4.5 |
| `on-accent` label on `accent-solid-active` | `#ffffff` on `#034698` | 9.00 | 4.5 |
| `accent-solid` fill vs `base` | `#065fc9` on `#fcfdfe` | 5.91 | 3.0 |
| `accent-solid` fill vs `surface` | `#065fc9` on `#f2f5f9` | 5.51 | 3.0 |
| `accent-line` rule vs `base` | `#127afa` on `#fcfdfe` | 3.97 | 3.0 |
| `accent-line` rule vs `surface` | `#127afa` on `#f2f5f9` | 3.70 | 3.0 |
| `fg` on `accent-tint` | `#10141a` on `#e7f1ff` | 16.20 | 4.5 |
| `fg-accent` icon on `accent-tint` | `#065fc9` on `#e7f1ff` | 5.28 | 3.0 |

The rest → hover → active ladder **darkens** in both directions on a light
appearance, so every step gains contrast against the label rather than
trading it away.

`accent-solid` sits at L 50.5% rather than at the brand's own `#0a6fe8`
(L 57.8%) because one token fills both roles: it is the button fill *and*
`fg-accent`. As a fill the brand value is fine (4.72:1 under a white label),
but as **text** it measures 4.63:1 on `base`, 4.31:1 on `surface` and 3.94:1
on `raised` — two failures. Darkening to L 50.5% is what buys accent text a
pass on all three surfaces.

## Status

Error hue is held at h=25, **127° off** the accent's h=257.7, and success at
h=152, **106° off**, so a failed field never reads as a brand highlight.
Colour is never the only cue: every error and success message ships an icon
too.

| Pair | Value | Ratio | Needs |
| --- | --- | --- | --- |
| `error` text on `base` | `#be222a` on `#fcfdfe` | 5.97 | 4.5 |
| `error` text on `surface` | `#be222a` on `#f2f5f9` | 5.56 | 4.5 |
| `fg` on `error-tint` | `#10141a` on `#f4edec` | 15.98 | 4.5 |
| `error` icon on `error-tint` | `#be222a` on `#f4edec` | 5.26 | 3.0 |
| `error-line` control border on `base` | `#e1363a` on `#fcfdfe` | 4.30 | 3.0 |
| `error-line` control border on `surface` | `#e1363a` on `#f2f5f9` | 4.01 | 3.0 |
| `success` text on `base` | `#226e3e` on `#fcfdfe` | 6.12 | 4.5 |
| `success` text on `surface` | `#226e3e` on `#f2f5f9` | 5.70 | 4.5 |
| `fg` on `success-tint` | `#10141a` on `#e4f4e7` | 16.18 | 4.5 |
| `success` icon on `success-tint` | `#226e3e` on `#e4f4e7` | 5.46 | 3.0 |

## Controls and lines

| Pair | Value | Ratio | Needs |
| --- | --- | --- | --- |
| `control-line` on `base` | `#82868c` on `#fcfdfe` | 3.59 | 3.0 |
| `control-line` on `surface` | `#82868c` on `#f2f5f9` | 3.35 | 3.0 |
| `focus-ring` on `base` | `#10141a` on `#fcfdfe` | 18.14 | 3.0 |
| `focus-ring` on `surface` | `#10141a` on `#f2f5f9` | 16.89 | 3.0 |
| `focus-ring` on `accent-solid` | `#10141a` on `#065fc9` | 3.07 | 3.0 |

The ring is the ink rather than the accent precisely so one value works on
every surface **including** the accent fill, where the accent itself would
measure 1.00:1. `outline-offset: 2px` puts the ring outside the element, so in
practice it lands on the page ground at 18.14:1; the 3:1 measurement against
the fill is the belt-and-braces case where the two visually abut. The ink sits
at L 19% rather than L 22.5% for exactly this pair — the lighter value fell to
2.84:1.

`hairline` and `hairline-strong` are decorative structure, not control
perimeters or state, so no ratio applies to them.

## Text over the illustrations

Two pixels in `public/categories/` are part of the colour system, because the
category cards put text directly on the artwork. Both are printed by
`python3 scripts/art.py --measure` and asserted by `scripts/palette.mjs`.

**Captions** sit on the `scrim-bottom` gradient, which is >=88% opaque `base`
through the whole text band. On light the scrim lifts toward the page ground,
so the pixel that matters is the **darkest** in the art. Since the
illustrations landed that is `#000002`, the drill body in `equipment.webp`,
rather than the `#0b3f8f` of the old duotone:

| Scrim opacity | Flattened background | `fg` text |
| --- | --- | --- |
| 80% | `#cacacc` | 11.29 |
| 88% | `#dedfe0` | 13.84 |

**The `01`..`06` index label** is the one piece of text on the card with **no**
scrim behind it, so it is measured against the raw artwork:

| Pair | Value | Ratio | Needs |
| --- | --- | --- | --- |
| `fg-secondary` label on art | `#4e535a` on `#c4d3e3` | 5.08 | 4.5 |

That label used `fg-muted` while the art was a near-white duotone, where it
passed. The illustrations put a soft blue vignette in the top-left corner, and
`fg-muted` fell to **3.63:1** on `hyaluronic.webp` — a real AA failure the
artwork introduced, not the tokens. One step darker to `fg-secondary` clears it
on all six banners with the label still reading as secondary.

## How to regenerate

The ramps and every ratio above come from `scripts/palette.mjs`
(`node scripts/palette.mjs`). It converts sRGB ↔ OKLab with no dependencies,
gamut-clamps chroma per step, and asserts each pair against its threshold,
exiting non-zero on any failure.

The two art constants come from `python3 scripts/art.py --measure`, which reads
the installed illustrations in `public/categories/`. Re-run it after any change
to that art and copy both values into `palette.mjs`.
