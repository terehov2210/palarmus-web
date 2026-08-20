# Measured contrast

Every pair the homepage actually renders, computed from the token values in
`src/app/globals.css` (WCAG 2.x relative-luminance ratio, sRGB). Regenerate
after any token change — never estimate these.

Surfaces: `base` `#0e0f11` · `surface` `#161719` · `raised` `#282a2d`

## Text

| Foreground | Value | on base | on surface | on raised | Needs |
| --- | --- | --- | --- | --- | --- |
| `fg` | `#f9fafb` | 18.35 | 17.16 | 13.77 | 4.5 |
| `fg-secondary` | `#d2d4d7` | 12.91 | 12.08 | 9.69 | 4.5 |
| `fg-muted` | `#b6b8bd` | 9.66 | 9.04 | 7.25 | 4.5 |
| `fg-accent` | `#f25035` | 5.46 | 5.10 | **4.09** | 4.5 |

`fg-accent` is the one token with a surface it cannot sit on. Accent **text**
stays off `bg-raised`; accent icons there are fine at the 3:1 non-text
threshold (4.09 ≥ 3).

## Accent fill

| Pair | Value | Ratio | Needs |
| --- | --- | --- | --- |
| `on-accent` label on `accent-solid` | `#f9fafb` on `#c82707` | 5.36 | 4.5 |
| `on-accent` label on `accent-solid-hover` | `#f9fafb` on `#dc2c08` | 4.56 | 4.5 |
| `on-accent` label on `accent-solid-active` | `#f9fafb` on `#b52205` | 6.29 | 4.5 |
| `accent-solid` fill vs `base` | `#c82707` on `#0e0f11` | 3.42 | 3.0 |
| `accent-solid` fill vs `surface` | `#c82707` on `#161719` | 3.20 | 3.0 |
| `fg` on `accent-tint` | `#f9fafb` on `#39221d` | 14.15 | 4.5 |
| `fg-accent` icon on `accent-tint` | `#f25035` on `#39221d` | 4.21 | 3.0 |

The rest → hover → active ladder brightens on hover and darkens on press, and
all three clear 4.5:1 against the label. This is why `accent-solid` sits at
L 54% rather than at the brand's own `#ff2f00` (L 64.4%), which only reaches
3.71:1 against white.

## Status

Error hue is held at h=0, **32° off** the accent's h=32.1, so a failed field
never reads as a brand highlight. Colour is never the only cue: every error
and success message ships an icon too.

| Pair | Value | Ratio | Needs |
| --- | --- | --- | --- |
| `error` text on `surface` | `#e6528b` on `#161719` | 5.08 | 4.5 |
| `fg` on `error-tint` | `#f9fafb` on `#552636` | 11.71 | 4.5 |
| `error` icon on `error-tint` | `#e6528b` on `#552636` | 3.46 | 3.0 |
| `error-line` control border on `surface` | `#dd93aa` on `#161719` | 7.54 | 3.0 |
| `success` text on `surface` | `#72c188` on `#161719` | 8.28 | 4.5 |
| `fg` on `success-tint` | `#f9fafb` on `#233f2b` | 11.06 | 4.5 |
| `success` icon on `success-tint` | `#72c188` on `#233f2b` | 5.34 | 3.0 |

## Controls and lines

| Pair | Value | Ratio | Needs |
| --- | --- | --- | --- |
| `control-line` on `surface` | `#6f7276` on `#161719` | 3.71 | 3.0 |
| `control-line` on `base` | `#6f7276` on `#0e0f11` | 3.97 | 3.0 |
| `focus-ring` on `base` | `#f9fafb` on `#0e0f11` | 18.35 | 3.0 |
| `focus-ring` on `surface` | `#f9fafb` on `#161719` | 17.16 | 3.0 |
| `focus-ring` on `accent-solid` | `#f9fafb` on `#c82707` | 5.36 | 3.0 |

The ring is white rather than accent-tinted precisely so one value works on
every surface **including** the accent fill — accent-400 would measure 2.00:1
there.

`hairline` and `hairline-strong` are decorative structure, not control
perimeters or state, so no ratio applies to them.

## Text over photography

Category captions sit on the `scrim-bottom` gradient, which is ≥88% opaque
`base` through the whole text band. Measured against the brightest pixel in
the category art (`#ff4d2b`, the glow core):

| Scrim opacity | Flattened background | `fg` text |
| --- | --- | --- |
| 75% | `#4a1e18` | 13.49 |
| 85% | `#321815` | 15.73 |

## How to regenerate

The ramps and every ratio above come from `scripts/palette.mjs`
(`node scripts/palette.mjs`). It converts sRGB ↔ OKLab with no dependencies,
gamut-clamps chroma per step, and asserts each pair against its threshold.
