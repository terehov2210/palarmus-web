"""
Take the blue out of the illustration grounds, keep the bone and metal.

The renders were commissioned against the earlier azure palette: soft blue
grounds, blue translucent soft tissue. The brandbook is black / white /
Venetian Red, so a blue wash behind every illustration fights the identity.

Only blue-ish pixels are touched (hue ~170-280deg). Their saturation is scaled
down with a smooth falloff at the edges of that band, so warm bone, grey
titanium and white ceramic are left exactly as rendered.

    python scripts/neutralise-art.py public/categories/*.webp public/education/*.webp

Idempotent: already-neutral pixels have nothing left to remove.
"""
import sys

import numpy as np
from PIL import Image

LO, HI, FEATHER = 170.0, 285.0, 20.0
KEEP = 0.06  # fraction of the original saturation left in the blue band


def neutralise(path: str) -> None:
    im = Image.open(path)
    has_alpha = im.mode in ("RGBA", "LA")
    rgba = im.convert("RGBA")
    hsv = np.asarray(rgba.convert("RGB").convert("HSV")).astype(np.float32)
    h = hsv[..., 0] * 360.0 / 255.0
    w = np.clip(np.minimum(h - LO, HI - h) / FEATHER, 0.0, 1.0)
    hsv[..., 1] *= 1.0 - w * (1.0 - KEEP)
    out = Image.fromarray(hsv.astype(np.uint8), "HSV").convert("RGB")
    if has_alpha:
        out.putalpha(rgba.getchannel("A"))
    kwargs = {"quality": 90, "method": 6} if path.endswith(".webp") else {}
    out.save(path, **kwargs)
    print("neutralised", path)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        neutralise(p)
