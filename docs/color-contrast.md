# Colour and contrast

The palette is the brandbook's, section 3.1, and nothing else:

| Role | Hex | Brandbook |
| --- | --- | --- |
| White | `#FFFFFF` | Основний колір |
| Black | `#000000` | Основний колір |
| Venetian Red | `#C7000B` | Додатковий колір |

Every other value in `src/app/globals.css` is a tint or shade of those three.
The greys are pure achromatic so none of them reads as a fourth colour.

## Two tones

- **Light** (default): white page, black ink, red as the accent.
- **Ink** (`.tone-ink`): the brandbook's black chapter pages. Used by the hero,
  «Чому Palarmus», the mission block on `/about` and the footer. It re-points
  the same semantic roles, so components need no dark variants.

The red assurance band under the hero is `bg-accent-solid` with white text,
after the brandbook's exhibition stand.

## Measured pairs

Run `node scripts/palette.mjs`. It exits non-zero if any required pair fails.

| Pair | Ratio | Min |
| --- | --- | --- |
| fg on base (light) | 21.00 | 4.5 |
| fg-secondary on base / surface | 11.37 / 10.43 | 4.5 |
| fg-muted on base / surface / raised | 5.74 / 5.27 / 4.82 | 4.5 |
| fg-accent (red) on base / surface | 6.12 / 5.61 | 4.5 |
| white on accent-solid / hover / active | 6.12 / 7.87 / 10.08 | 4.5 |
| control-line on base / surface | 3.45 / 3.17 | 3 |
| ink · fg-secondary on base | 12.04 | 4.5 |
| ink · fg-muted on base / raised | 7.84 / 6.50 | 4.5 |
| ink · fg-accent (60% red tint) on base | 6.29 | 4.5 |
| ink · control-line on base | 4.12 | 3 |

## Rules that follow from the numbers

- **Venetian Red is never text on black.** It measures 3.43:1. On `.tone-ink`,
  `fg-accent` switches to the brandbook's 60% tint (`#E0666D`, 6.29:1). Red
  *fills* with white labels are fine on either tone.
- **Errors cannot rely on hue.** The brand colour is red, so every error state
  ships with an icon and a written message.
- **Hero glow stays behind the art.** The red radial glow in the hero is
  positioned behind the 3D model and never reaches the copy column, so all
  hero text is measured against plain black.
