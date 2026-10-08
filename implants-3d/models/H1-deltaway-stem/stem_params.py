"""DeltaWay 4# geometry parameters, shared by build_sdf.py (system Python) and build_blender.py (Blender).

Dimensions from `Delta (англійською мовою).pdf`, page 2:
  stem length A = 137 mm, offset B = 38 mm, neck length C = 32.5 mm, distal diameter D = 8 mm,
  CCD angle 130 deg, 12/14 taper, 0.5 mm porous Ti coating on the proximal body.
Section shapes, calcar curve and coating boundary are read off the manufacturer renders.

Frame: millimetres, Z up the stem axis (tip at z=0), +X medial (towards the head), Y anterior-posterior.
"""
import math
import numpy as np

A, B, C, D = 137.0, 38.0, 32.5, 8.0
CCD = 130.0
COAT = 0.5

# neck axis and head centre
PHI = math.radians(180 - CCD)
NECK_DIR = np.array([math.sin(PHI), 0.0, math.cos(PHI)])
HEAD = np.array([B, 0.0, A + 3.0])

# positions along the neck axis, s = 0 at the head centre (negative towards the body)
S_TIP = 5.0                # trunnion tip, past the head centre
S_TAPER0 = S_TIP - 16.0    # start of the 12/14 cone
S_NECK_END = S_TAPER0 - 2.4  # where the SDF neck stops and the turned (lathe) part takes over


def body_profile(z):
    """Lateral edge, medial edge, A/P thickness and superellipse exponent of the body at height z."""
    zc = np.clip(z, 0, A)
    x_lat = -(D / 2 + 0.050 * zc + 0.00012 * np.maximum(zc - 90, 0) ** 2)
    x_med = D / 2 + 0.028 * zc + 0.0030 * np.maximum(zc - 70, 0) ** 2
    t = D + 0.034 * zc + 0.0006 * np.maximum(zc - 60, 0) ** 2
    n = 2.0 + 1.4 * np.clip((zc - 20) / 90, 0, 1)
    return x_lat, x_med, t, n


X_LAT_TOP = float(body_profile(np.array(A))[0])


# Coating band: between two oblique planes, written as  n . p = d  (n points out of the band).
#   lower edge: z = 70 + 0.10 x       -> band is above it
#   upper edge: z = A - 8 - 0.62 (x - X_LAT_TOP)  -> band is below it (clear of the inserter hole)
def _plane(nx, nz, d):
    l = math.hypot(nx, nz)
    return np.array([nx / l, 0.0, nz / l]), d / l


LOWER_N, LOWER_D = _plane(0.10, -1.0, -70.0)                       # 0.10x - z <= -70 inside
UPPER_N, UPPER_D = _plane(0.62, 1.0, A - 8.0 + 0.62 * X_LAT_TOP)   # z + 0.62x <= ... inside
BAND_PLANES = [(LOWER_N, LOWER_D), (UPPER_N, UPPER_D)]


def band_distance(p):
    """Signed distance to the coating band (negative inside). p: (..., 3)."""
    return np.maximum(p @ LOWER_N - LOWER_D, p @ UPPER_N - UPPER_D)


def neck_frame(p):
    """(s, r) of points in the neck/trunnion frame."""
    q = p - HEAD
    s = q @ NECK_DIR
    r = np.linalg.norm(q - s[..., None] * NECK_DIR, axis=-1)
    return s, r


# Turned part (collar + relief groove + 12/14 cone + chamfered tip), as an (s, r) profile.
# The first points dive into the neck so the seam is a clean intersection, not an open rim.
LATHE_PROFILE = [
    (S_NECK_END - 1.6, 3.8),
    (S_NECK_END - 0.2, 6.1),
    (S_NECK_END + 0.0, 6.25),          # collar face
    (S_NECK_END + 1.2, 6.25),
    (S_NECK_END + 1.45, 6.05),         # relief groove
    (S_NECK_END + 1.8, 5.75),
    (S_NECK_END + 2.15, 6.05),
    (S_TAPER0, 7.0),                   # 14 mm end of the taper
    (S_TIP - 0.8, 6.2),                # 12.4 mm end
    (S_TIP - 0.05, 5.45),              # 0.8 mm chamfer
    (S_TIP, 5.3),
    (S_TIP, 0.0),
]
# profile vertices where shading must break (edges, not curvature)
LATHE_SHARP = {2, 3, 7, 8, 9, 10}


# inserter hole in the lateral shoulder (drilled along the stem axis)
HOLE_X, HOLE_TOP, HOLE_DEPTH, HOLE_R = X_LAT_TOP + 6.5, A - 1.5, 7.0, 2.6


def lathe_radius(s):
    """Radius of the turned part at neck coordinate s (nan outside it)."""
    ss = np.array([p[0] for p in LATHE_PROFILE[:-1]])
    rr = np.array([p[1] for p in LATHE_PROFILE[:-1]])
    out = np.interp(s, ss, rr)
    return np.where((s < ss[0]) | (s > ss[-1]), np.nan, out)
