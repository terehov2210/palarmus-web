"""ACL graft fixation: RingButton (S3) cortical button with a fixed loop, GraftFix (S5)
bioresorbable interference screw. Sizes from `Каталог_Palarmus_Спортивна_травма_2026_NEW.pdf` p. 4:
  RingButton: button 12 x 4 x 1.5 mm, fixed loop 15/20/25/30 mm (built: 20 mm)
  GraftFix:   7-9 x 23/28 mm, star drive (built: 8 x 23 mm)
Shapes follow the renders `source/Спортивна травма/RingButton.png`, `GraftFix.png`.
Millimetres. Button: long axis X, thickness Z (top face +Z). Screw: axis Z, tip at z = 0.
"""
import math
import numpy as np

# ---- RingButton --------------------------------------------------------------------------
BTN_L, BTN_W, BTN_T, BTN_CORNER = 12.0, 4.0, 1.5, 1.2
LOOP_HOLES_X, LOOP_HOLE = 1.6, (1.0, 0.8)       # centre pair: half-axes of the oval holes
END_HOLES_X, END_HOLE_R = 4.3, 0.6
LOOP_LEN = 20.0
LOOP_R, SUTURE_R = 0.75, 0.42


def loop_path(n=160):
    """Closed path of the fixed loop: under the button between the centre holes, up through
    them, and a long flattened loop above (graft side)."""
    ctrl = [(-1.6, 0.0, -1.35), (0.0, 0.0, -1.5), (1.6, 0.0, -1.35), (LOOP_HOLES_X, 0.0, 0.0),
            (1.8, 0.1, 1.8), (2.6, 0.5, 6.0), (3.3, 0.9, 12.0), (3.0, 0.8, 17.0), (1.6, 0.5, 19.8),
            (0.0, 0.3, LOOP_LEN + 0.6), (-1.6, 0.0, 19.8), (-3.0, -0.4, 17.0), (-3.2, -0.8, 12.0),
            (-2.5, -0.5, 6.0), (-1.8, -0.1, 1.8), (-LOOP_HOLES_X, 0.0, 0.0)]
    return catmull_rom(ctrl, n, closed=True)


def suture_path(side, wiggle, n=120):
    """A suture through one end hole: one tail up through the hole, over the end of the button,
    both tails hanging down (towards the tunnel)."""
    s = side
    x0 = s * END_HOLES_X
    ctrl = [(s * 7.2 + wiggle, -1.2, -38.0), (s * 6.2, -0.7, -22.0), (s * 5.0, -0.3, -9.0), (x0, 0.0, -1.6),
            (x0, 0.0, 0.0), (s * (END_HOLES_X + 0.4), 0.0, 1.1), (s * 6.0, 0.0, 1.05),
            (s * 6.65, 0.05, -0.2), (s * 7.0, 0.4, -6.0), (s * 7.7, 1.0, -19.0), (s * 8.6 - wiggle, 1.6, -36.0)]
    return catmull_rom(ctrl, n, closed=False)


def catmull_rom(ctrl, n, closed):
    c = np.asarray(ctrl, dtype=float)
    if closed:
        c = np.vstack([c[-1:], c, c[:2]])
    else:
        c = np.vstack([2 * c[0] - c[1], c, 2 * c[-1] - c[-2]])
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


# ---- GraftFix ----------------------------------------------------------------------------
SCREW_L, SCREW_R, ROOT_R, TIP_R = 23.0, 4.0, 3.05, 2.3
PITCH = 2.8
SOCKET_DEPTH, CANNULA_R = 6.0, 0.8


def star_r(phi):
    return 1.75 + 0.32 * math.cos(6 * phi)        # hexalobular drive, smoothed


def screw_profile(phi, ds):
    """Closed (s, r) profile at azimuth phi, material on the right: up the threaded flank,
    across the top into the star socket, down the cannula, out across the tip face."""
    def smooth(e0, e1, x):
        t = min(max((x - e0) / (e1 - e0), 0.0), 1.0)
        return t * t * (3 - 2 * t)

    pts = [(0.0, 2.0), (0.3, TIP_R)]
    for s in np.arange(0.6, SCREW_L - 0.55, ds):
        root = ROOT_R - (ROOT_R - TIP_R) * (1 - smooth(0.0, 4.0, s))
        h = (SCREW_R - ROOT_R) * smooth(0.6, 4.5, s)
        u = ((s - PITCH * phi / (2 * math.pi)) / PITCH) % 1.0
        crest = (0.5 + 0.5 * math.cos(2 * math.pi * (u - 0.5))) ** 0.55   # wide, rounded crest
        r = root + h * crest
        r = max(r, 3.55 * smooth(SCREW_L - 2.4, SCREW_L - 1.5, s))   # full ring under the top face
        pts.append((float(s), r))
    top = SCREW_L
    rs = star_r(phi)
    pts += [(top - 0.25, 3.55), (top, 3.25),                  # rounded top edge
            (top, rs + 0.3), (top - 0.3, rs),                 # socket chamfer
            (top - SOCKET_DEPTH, rs), (top - SOCKET_DEPTH, CANNULA_R + 0.25),
            (top - SOCKET_DEPTH - 0.25, CANNULA_R), (0.25, CANNULA_R), (0.0, CANNULA_R + 0.25),
            (0.0, 2.0)]                                       # closes on the first point
    return pts
