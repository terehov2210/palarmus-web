"""NAVY A/R intramedullary femoral nail (osteosynthesis #42), 11 x 360 mm.

Sizes: `Прайс-лист Palarmus (остеосинтез) (2026).pdf` p. 12 (NAVY-C, 10/11/12 mm x 300-400 mm).
Shape: render `42 Нави стегновий стрижень.jpeg` and the post-op X-rays in `3Д скелет/Травматологія`:
straight-ish nail with an anterior bow, three colour-coded locking screws at one end, two
deployable curved wings (anchor-like) at the other.

Millimetres. Nail axis Z (wing end at z = 0, screw end at z = NAIL_L), bow towards +Y,
locking screws along X (heads at +X).
"""
import math
import numpy as np

NAIL_L, NAIL_R = 360.0, 5.5
BOW_R = 1500.0
SCREW_Z = [NAIL_L - 18.0, NAIL_L - 31.0, NAIL_L - 44.0]
SCREW_MAT = ["ti_anodized_gold", "ti_anodized_blue", "ti_anodized_blue"]
SCREW_L, SCREW_MAJOR, SCREW_ROOT, SCREW_PITCH = 46.0, 2.5, 1.85, 1.75
SCREW_HEAD = (4.0, 3.0, "round")
SCREW_HEX = 3.5
WING_Z = 30.0


def axis_y(z):
    """Anterior bow: y offset of the nail axis at height z (0 at both ends)."""
    return (NAIL_L / 2) ** 2 / (2 * BOW_R) - (z - NAIL_L / 2) ** 2 / (2 * BOW_R)


def nail_path(step):
    z = np.arange(0.0, NAIL_L + 1e-6, step)
    z = np.unique(np.concatenate([z, np.linspace(0, 8, 9), np.linspace(NAIL_L - 3, NAIL_L, 4)]))
    return np.stack([np.zeros_like(z), axis_y(z), z], 1)


def nail_scale(path):
    """Bullet taper over the last 10 mm of the leading (wing) end."""
    z = path[:, 2]
    t = np.clip(z / 10.0, 0, 1)
    return 0.62 + 0.38 * (t * t * (3 - 2 * t))


def wing_path(side, n=40):
    """An anchor-like wing: leaves the nail sideways and curls back towards the screw end."""
    y = axis_y(WING_Z)
    ctrl = np.array([(side * 0.5, y, WING_Z + 2.0), (side * 4.0, y, WING_Z - 1.5), (side * 8.5, y, WING_Z - 2.5),
                     (side * 12.0, y, WING_Z + 0.5), (side * 13.2, y, WING_Z + 6.0), (side * 12.6, y, WING_Z + 11.0)])
    t = np.linspace(0, 1, n)
    # simple Catmull-Rom through the controls
    c = np.vstack([2 * ctrl[0] - ctrl[1], ctrl, 2 * ctrl[-1] - ctrl[-2]])
    out = []
    segs = len(c) - 3
    for i in range(segs):
        p0, p1, p2, p3 = c[i:i + 4]
        for u in np.linspace(0, 1, max(2, n // segs), endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    out.append(c[-2])
    return np.array(out)
