"""C-WingButton 2 (S1): knotless syndesmosis fixation, deployed. iKey Medical.

Sizes: `Титанова пластина для відновлення дистального … синдесмозу.pdf` p. 2 and the sports
catalogue: WingButton (adjustable) 12 x 3.5 x 1.5 mm, CloverButton 11 x 8 x 1.5 mm (small).
Layout from the PDF illustration: round CloverButton on the fibula with the knot on top,
WingButton on the far (tibial) cortex, two loops (four strands) across ~40 mm of bone.

Millimetres. Strands run along +X: CloverButton at x = 0, WingButton at x = SPAN.
Buttons lie in the YZ plane (thickness along X); the WingButton's long axis is Z.
"""
import math
import numpy as np

SPAN = 40.0
BTN_T = 1.5
WING_L, WING_W = 12.0, 3.5
WING_HOLE_Z, WING_HOLE = 2.7, (1.3, 0.9)      # hole centres +-Z, oval half-axes (z, y)
CLOVER_A, CLOVER_B = 5.5, 4.0                  # half-axes (z, y): 11 x 8
CLOVER_HOLE = (1.6, 1.1)
STRAND_R = 0.42
LOOP_Y = 0.42                                  # the two loops sit side by side in Y


def catmull_rom(ctrl, n, closed=False):
    c = np.asarray(ctrl, dtype=float)
    c = np.vstack([c[-1:], c, c[:2]]) if closed else np.vstack([2 * c[0] - c[1], c, 2 * c[-1] - c[-2]])
    segs = len(c) - 3
    out = []
    for i in range(segs):
        p0, p1, p2, p3 = c[i:i + 4]
        for t in np.linspace(0, 1, max(2, n // segs), endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    if not closed:
        out.append(c[-2])
    return np.array(out)


def loop_path(side, n=260):
    """One loop: out of the CloverButton, across the bone, in through one WingButton hole,
    over its outer face to the other hole, back across and through the CloverButton again."""
    y = side * LOOP_Y
    h = BTN_T / 2
    w = SPAN
    zc = 0.35
    ctrl = [(-h - 0.9, y * 0.6, zc + 0.4), (-h - 0.3, y * 0.8, zc), (h + 0.3, y, zc), (6.0, y, 0.9),
            (w - 6.0, y, WING_HOLE_Z - 0.5), (w - h - 0.3, y, WING_HOLE_Z), (w + h + 0.25, y, WING_HOLE_Z),
            (w + h + 0.55, y, WING_HOLE_Z * 0.5), (w + h + 0.6, y, 0.0), (w + h + 0.55, y, -WING_HOLE_Z * 0.5),
            (w + h + 0.25, y, -WING_HOLE_Z), (w - h - 0.3, y, -WING_HOLE_Z), (w - 6.0, y, -WING_HOLE_Z + 0.5),
            (6.0, y, -0.9), (h + 0.3, y, -zc), (-h - 0.3, y * 0.8, -zc), (-h - 0.9, y * 0.6, -zc - 0.4)]
    return catmull_rom(ctrl, n)


def knot_path(n=160):
    """The knotless cinch on the CloverButton: a tight coil sitting on its outer face."""
    x0 = -BTN_T / 2 - 0.8
    t = np.linspace(0, 2.6 * 2 * math.pi, n)
    r = 1.05 + 0.15 * np.sin(3 * t)
    return np.stack([x0 - 0.35 * (t / t[-1]) - 0.25 * np.cos(2 * t), r * np.cos(t), r * np.sin(t)], 1)
