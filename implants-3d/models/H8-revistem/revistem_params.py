"""Revistem M modular revision stem: proximal body 20x70 + fluted distal stem 16x190.
Shared by build_sdf.py (system Python) and build_blender.py (Blender).

Catalogue (`Каталог_Palarmus_Ендопротези_суглобів_2026_NEW.pdf`, revision page):
  proximal 20x60 / 20x70 / 20x80 mm, offset 40 mm, neck length 47 mm, diameter 20 mm;
  distal 13-20 x 150 / 190 mm, 1 mm steps, rib height 1.2 mm, distal diameter 7.9-15 mm.
The middle of the range is built: proximal 20x70, distal 16x190 (tip 10.9 mm by linear
interpolation of 13 -> 7.9 ... 20 -> 15). Not in the catalogue, assumed from the render: CCD
135 deg, 8 ribs, the polished locking ring at the junction, coating up to just below the neck.

Frame (same as the DeltaWay stem, so the hip-system assemblies can swap stems): millimetres,
Z up the stem axis (tip at z=0), +X medial (towards the head), Y anterior-posterior.
"""
import math
import numpy as np

# ---- distal fluted stem ------------------------------------------------------------------
LD = 190.0
R_TOP, R_TIP = 8.0, 10.9 / 2        # over the ribs
RIB_H, RIBS = 1.2, 8
NOSE = 6.0                          # rounded nose length
RIB_FADE = 18.0                     # ribs run out over this length above the nose

# ---- junction ring + proximal body -------------------------------------------------------
Z_RING0, Z_RING1 = LD - 2.0, LD + 4.0     # polished locking ring (the distal taper is inside)
R_BODY = 10.0                             # diameter 20 over the coating
COAT = 0.5
R_METAL = R_BODY - COAT
L_PROX = 70.0
Z_TOP = Z_RING0 + L_PROX                  # lateral shoulder top
Z_COAT1 = Z_TOP - 18.0                    # coating stops below the neck

# ---- neck --------------------------------------------------------------------------------
CCD = 135.0
OFFSET = 40.0
PHI = math.radians(180 - CCD)
NECK_DIR = np.array([math.sin(PHI), 0.0, math.cos(PHI)])
Z_NECK_AXIS = Z_TOP - 12.0                # neck axis crosses the stem axis here
HEAD = np.array([OFFSET, 0.0, Z_NECK_AXIS + OFFSET / math.tan(PHI)])

# 12/14 trunnion, identical to the DeltaWay one (same heads fit): s along the neck, 0 at the head centre
S_TIP = 5.0
S_TAPER0 = S_TIP - 16.0
S_NECK_END = S_TAPER0 - 2.4
LATHE_PROFILE = [
    (S_NECK_END - 1.6, 3.8),
    (S_NECK_END - 0.2, 6.1),
    (S_NECK_END + 0.0, 6.25),
    (S_NECK_END + 1.2, 6.25),
    (S_NECK_END + 1.45, 6.05),
    (S_NECK_END + 1.8, 5.75),
    (S_NECK_END + 2.15, 6.05),
    (S_TAPER0, 7.0),
    (S_TIP - 0.8, 6.2),
    (S_TIP - 0.05, 5.45),
    (S_TIP, 5.3),
    (S_TIP, 0.0),
]
LATHE_SHARP = {2, 3, 7, 8, 9, 10}


def neck_frame(p):
    q = p - HEAD
    s = q @ NECK_DIR
    r = np.linalg.norm(q - s[..., None] * NECK_DIR, axis=-1)
    return s, r


def lathe_radius(s):
    ss = np.array([p[0] for p in LATHE_PROFILE[:-1]])
    rr = np.array([p[1] for p in LATHE_PROFILE[:-1]])
    out = np.interp(s, ss, rr)
    return np.where((s < ss[0]) | (s > ss[-1]), np.nan, out)


# ---- profiles for blender_kit (material on the right, walked from the tip upwards) --------
def distal_r(z):
    """Radius over the ribs at height z (linear taper)."""
    return R_TIP + (R_TOP - R_TIP) * z / LD


def rib(phi):
    """0 in a flute, 1 on a crest; narrow crests and concave flutes like a Wagner stem."""
    u = (phi * RIBS / (2 * math.pi)) % 1.0
    u = min(u, 1.0 - u)                       # distance to the nearest crest, in periods
    return (1.0 - 2.0 * u) ** 2.2


def distal_columns(n_per_rib, n_shaft):
    """Columns for blender_kit.swept: a crest column on every rib, nose closing to a pole."""
    # nose stations by arc angle (even spacing on the round, no cone at the pole)
    zs = [NOSE * (1 - math.cos(t)) for t in np.linspace(0, math.pi / 2, 9)]
    zs += list(NOSE + RIB_FADE * (1 - np.cos(np.linspace(0, math.pi / 2, 7)[1:])))
    zs += list(np.linspace(NOSE + RIB_FADE, LD + 1.0, n_shaft + 1)[1:])
    cols = []
    for k in range(RIBS * n_per_rib):
        phi = 2 * math.pi * k / (RIBS * n_per_rib)
        f = rib(phi)
        prof = []
        for z in zs:
            fade = min(max((z - NOSE) / RIB_FADE, 0.0), 1.0)
            fade = fade * fade * (3 - 2 * fade)
            r = distal_r(z) - RIB_H * (1.0 - f * fade)
            if z < NOSE:                                  # bullet nose on the core
                rc = distal_r(NOSE) - RIB_H
                r = rc * math.sqrt(max(0.0, 1 - ((NOSE - z) / NOSE) ** 2))
            prof.append((z, r))
        cols.append((phi, prof))
    return cols


def ring_profile():
    z0, z1 = Z_RING0, Z_RING1
    return [(z0 + 1.5, 5.6), (z0, 5.6), (z0, R_BODY - 0.4), (z0 + 0.4, R_BODY),
            (z1 - 0.35, R_BODY), (z1, R_BODY - 0.35), (z1 + 0.5, R_BODY - 0.35)]


RING_SHARP = {1, 2, 3, 4, 5}


def coat_profile():
    return [(Z_RING1, R_METAL + 0.05), (Z_RING1, R_BODY), (Z_COAT1, R_BODY), (Z_COAT1, R_METAL + 0.05)]


COAT_SHARP = {1, 2}
