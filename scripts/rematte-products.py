"""
Re-cut the old product cut-outs with a clean, anti-aliased edge.

The sports-medicine anchors and RingButton were shipped as 380px cut-outs whose
mask was made at low resolution and then upscaled with nearest-neighbour: every
edge is a staircase, and XtraLoc carries a grey halo from the white ground it
was keyed off. The 1440px copies in `illustration-kit/implants/` have the same
staircase, only bigger, so a bigger copy alone does not help.

What this does, per image:

1.  **Smooth the mask.** Blur the alpha, then push it back through a smoothstep
    around 0.5. The staircase averages out into the straight or curved contour
    it approximated, and the edge comes back 1-2px soft instead of hard.
    Thin shafts (~6px at 1440) survive because their blurred core stays well
    above 0.5.
2.  **Decontaminate the fringe** (`halo=True`). Pixels in the edge band take the
    colour of the nearest solid pixel, so the grey of the old ground no longer
    outlines a purple handle.
3.  **Crop and downscale.** Crop to the object plus a margin and scale so the
    long side is at most 960px, like the other product renders. Saved lossless.

Sources are never written to.

    python scripts/rematte-products.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
KIT = ROOT / "illustration-kit" / "implants"
OUT = ROOT / "public" / "products"

# output name -> (source, decontaminate fringe)
JOBS = {
    "paratak.webp": ("a05-b14-c19_paratak-titanium-anchor.webp", False),
    "loctak.webp": ("a05_loctak-titanium-anchor__1-anchor-with-driver.webp", False),
    "sutureloc.webp": ("b14_sutureloc-all-suture-anchor.webp", False),
    "xtraloc.webp": ("c20_xtraloc-peek-anchor.webp", True),
    "speedloc.webp": ("c21_speedloc-resorbable-anchor.webp", False),
    "ringbutton.webp": ("ref_ringbutton-cortical-fixation.webp", False),
}

SIGMA = 1.6  # px at source resolution; the staircase steps are ~3px
EDGE = 0.22  # half-width of the smoothstep around 0.5
MAX_SIDE = 960
MARGIN = 0.06


def smoothstep(lo: float, hi: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def rematte(src: Path, halo: bool) -> Image.Image:
    rgba = np.asarray(Image.open(src).convert("RGBA")).astype(np.float32) / 255.0
    rgb, a = rgba[..., :3], rgba[..., 3]

    alpha = smoothstep(0.5 - EDGE, 0.5 + EDGE, ndimage.gaussian_filter(a, SIGMA))

    # Colour under the new edge. Pixels that were transparent in the source
    # but are now partly covered have no colour of their own: give every
    # non-solid pixel the colour of its nearest solid one. With `halo` the
    # solid core is eroded first, so the old ground's fringe is replaced too.
    solid = a > 0.98
    if halo:
        core = ndimage.binary_erosion(solid, iterations=3)
        solid = np.where(ndimage.binary_dilation(core, iterations=6), core, solid)
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    filled = rgb[iy, ix]
    keep = solid[..., None] if halo else (a > 0.98)[..., None]
    rgb = np.where(keep, rgb, filled)

    out = np.dstack([rgb, alpha])
    im = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")

    l, t, r, b = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    m = int(MARGIN * max(r - l, b - t))
    im = im.crop((max(0, l - m), max(0, t - m), min(im.width, r + m), min(im.height, b + m)))
    scale = MAX_SIDE / max(im.size)
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    return im


def main() -> None:
    for name, (source, halo) in JOBS.items():
        im = rematte(KIT / source, halo)
        im.save(OUT / name, lossless=True, method=6)
        print(f"{name:18} {im.size[0]}x{im.size[1]}  <- {source}")


if __name__ == "__main__":
    main()
