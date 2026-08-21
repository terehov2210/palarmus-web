#!/usr/bin/env python3
"""Brand art maintenance.

    python3 scripts/art.py            # rebuild what ANATOMY lists, plus the wordmark
    python3 scripts/art.py --measure  # print the two values palette.mjs needs

Requires Pillow. Sources live in `art-src/` and are never written to, so this
is re-runnable and the originals stay recoverable.

Three jobs, one of them now dormant:

1.  **Measure the installed illustrations** (`--measure`). The category cards
    put text over the artwork, so two pixels in `public/categories/` are part
    of the colour system and are asserted by `scripts/palette.mjs`:

      * the darkest pixel anywhere, which the caption scrim has to carry ink
        text over;
      * the darkest pixel under the `01`..`06` index label in the top-left
        corner, which is the only text on the card with **no** scrim behind it
        and is therefore measured against the art itself.

    Re-run this after any change to the category art and copy both values into
    `palette.mjs`.

2.  **Recolour the wordmark.** It ships white-on-transparent, so it is
    invisible on a light page. The alpha channel is a clean mask, so
    recolouring the RGB and keeping the mask is exact rather than a re-trace.

3.  **Duotone the old x-ray stock** (dormant: `ANATOMY` is empty).
    The site originally shipped white-and-red x-ray glows on pure black. Both
    halves of that fought the light appearance, and inverting fixed the ground
    and the hue in one step. Commissioned illustrations have now replaced every
    one of those slots, so nothing is listed any more. The code stays because
    `art-src/` still holds the originals: put a filename back in `ANATOMY` to
    rebuild one. Anything listed here is **overwritten**, so a slot that now
    holds a real illustration must stay out of the list.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src"
OUT = ROOT / "public"

# Endpoints of the duotone ramp, kept with the dormant job below.
GROUND = "#fcfdfe"
MID = "#8aaee2"
DEEP = "#0b3f8f"
GAMMA = 2.0

# --neutral-ink. The wordmark is the same ink as the headings it sits beside.
INK = (16, 20, 26)

# Empty on purpose: every slot now holds a commissioned illustration. See the
# module docstring before adding anything back.
ANATOMY: list[tuple[str, str]] = []

# Where the index label sits on a category card, as fractions of the image.
# `absolute start-6 top-6` on a 640x280 card, with room for the glyphs.
LABEL_BOX = (0.02, 0.06, 0.12, 0.20)


def duotone(path: Path) -> Image.Image:
    """Invert to a light ground, then re-ramp luminance through the accent."""
    im = Image.open(path).convert("RGB")
    lum = ImageOps.invert(im).convert("L")
    curve = [round(255 * (v / 255) ** GAMMA) for v in range(256)]
    return ImageOps.colorize(lum.point(curve), black=DEEP, white=GROUND, mid=MID)


def recolour_wordmark(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    alpha = im.getchannel("A")
    out = Image.new("RGB", im.size, INK).convert("RGBA")
    out.putalpha(alpha)
    return out


def darkest(im: Image.Image, box: tuple[float, float, float, float] | None = None):
    """Darkest pixel by luminance, optionally within a fractional box."""
    rgb = im.convert("RGB")
    if box:
        w, h = rgb.size
        rgb = rgb.crop(
            (int(w * box[0]), int(h * box[1]), int(w * box[2]), int(h * box[3]))
        )
    lum = list(rgb.convert("L").tobytes())
    i = min(range(len(lum)), key=lum.__getitem__)
    px = rgb.tobytes()
    return (px[i * 3], px[i * 3 + 1], px[i * 3 + 2])


def hexs(c) -> str:
    return f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"


def measure() -> int:
    cats = sorted((OUT / "categories").glob("*.webp"))
    if not cats:
        print("no category art in public/categories")
        return 1

    worst_all, worst_all_l = None, 999.0
    worst_label, worst_label_l = None, 999.0
    lum = lambda c: 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

    for p in cats:
        im = Image.open(p)
        d_all = darkest(im)
        d_lab = darkest(im, LABEL_BOX)
        if lum(d_all) < worst_all_l:
            worst_all_l, worst_all = lum(d_all), d_all
        if lum(d_lab) < worst_label_l:
            worst_label_l, worst_label = lum(d_lab), d_lab
        print(f"  {p.name:24} darkest {hexs(d_all)}   under label {hexs(d_lab)}")

    print(f"\nfor scripts/palette.mjs:")
    print(f"  const ART_DARKEST  = \"{hexs(worst_all)}\";")
    print(f"  const ART_LABEL_BG = \"{hexs(worst_label)}\";")
    return 0


def main() -> int:
    if "--measure" in sys.argv:
        return measure()

    if not SRC.is_dir():
        print(f"missing {SRC}. The originals live there; nothing to rebuild.")
        return 1

    for rel_in, rel_out in ANATOMY:
        src = SRC / rel_in
        if not src.is_file():
            print(f"  SKIP {rel_in} (not in art-src)")
            continue
        dst = OUT / rel_out
        dst.parent.mkdir(parents=True, exist_ok=True)
        duotone(src).save(dst, lossless=False, quality=90, method=6)
        print(f"  wrote {rel_out}")

    if not ANATOMY:
        print("  ANATOMY is empty: every slot holds a commissioned illustration.")

    logo_src = SRC / "brand/logo.png"
    if logo_src.is_file():
        recolour_wordmark(logo_src).save(OUT / "brand/logo.png")
        print(f"  wrote brand/logo.png  ink {hexs(INK)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
