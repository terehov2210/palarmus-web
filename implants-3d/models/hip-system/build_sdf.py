"""Apex TPS cup 52 and Apex XPE liner 32/52 as SDFs -> reference meshes + fields.

Outputs (build/):
  cup_metal_hi.ply   bare titanium: rim band, rim face, liner seat, notches, holes, inner dome
  cup_coat_hi.ply    plasma-spray shell, 2 mm longer than its band (trimmed in Blender)
  liner_hi.ply       polyethylene liner
  fields.npz         cup_metal, cup_coat, cup_coat_exact, liner
Heads are pure lathes and are built directly in Blender.
"""
import sys
import numpy as np
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from hip_params import *          # noqa: E402,F401
from sdf_kit import Grid, smax, smin  # noqa: E402

OUT = HERE / "build"
OUT.mkdir(exist_ok=True)
G = Grid([-28.5, -28.5, -7.5], [28.5, 28.5, 27.5], 0.2)
X, Y, Z, P = G.X, G.Y, G.Z, G.P
R = np.linalg.norm(P, axis=-1)
RHO = np.sqrt(X * X + Y * Y)


def seat_r(z, offset=0.0):
    return SEAT_R0 + (SEAT_R1 - SEAT_R0) * np.clip(z / SEAT_H, 0, 1) + offset


def radial_boxes(count, width, r_out, z0, z1, r_in=15.0):
    """`count` boxes around Z (azimuth 0, 360/count, ...): |tangential| < width/2, r_in < radial < r_out."""
    out = np.full(X.shape, np.inf, dtype=np.float32)
    for k in range(count):
        a = 2 * np.pi * k / count
        u = X * np.cos(a) + Y * np.sin(a)
        t = -X * np.sin(a) + Y * np.cos(a)
        box = np.maximum.reduce([np.abs(t) - width / 2, u - r_out, r_in - u, z0 - Z, Z - z1])
        out = np.minimum(out, box)
    return out


def holes(extra=0.0):
    """Three countersunk screw holes + the apex hole, as one field."""
    h = np.full(X.shape, np.inf, dtype=np.float32)
    for polar, azim in SCREW_HOLES:
        th, ph = np.radians(polar), np.radians(azim)
        d = np.array([np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.cos(th)], dtype=np.float32)
        s = P @ d
        rad = np.linalg.norm(P - s[..., None] * d, axis=-1)
        sink = np.clip((INNER_R + 1.4 - s) / 1.9, 0, 1) * (SCREW_SINK_R - SCREW_R)   # cone at the inner side
        h = np.minimum(h, np.maximum(rad - (SCREW_R + sink + extra), 15.0 - s))
    h = np.minimum(h, np.maximum(RHO - (APEX_R + extra), 15.0 - Z))   # plain: a thread aliases at web density
    return h


# ---- cup metal --------------------------------------------------------------------------
band = np.maximum(RHO - RIM_BAND_R, Z - RIM_BAND_H)              # polished equator band
outer = np.minimum(band, R - CUP_METAL_R)                       # + dome under the coating
outer = smax(outer, -Z, 0.4)                                    # rim face, rounded outer edge
cavity = np.minimum(R - INNER_R, np.maximum(RHO - seat_r(Z), Z - SEAT_H))
cup = smax(outer, -cavity, 0.4)                                 # rounded inner rim edge
cup = smax(cup, -radial_boxes(NOTCHES, NOTCH_W, SEAT_R0 + NOTCH_DEPTH, -5, NOTCH_H), 0.3)
cup_metal = smax(cup, -holes(), 0.3)
del band, outer, cavity, cup

# ---- cup coating: a 1.2 mm shell on the outside, cut back 0.15 mm around the holes -------
shell = np.maximum(R - CUP_R, (CUP_R - 1.2) - R)
cup_coat = np.maximum(shell, (RIM_BAND_H - 2.0) - Z)            # 2 mm too long: trimmed later
cup_coat = smax(cup_coat, -holes(0.15), 0.3)
cup_coat_exact = np.maximum(cup_coat, RIM_BAND_H - Z)
del shell

# ---- liner ------------------------------------------------------------------------------
outer = np.minimum(R - (INNER_R - 0.02), np.maximum(RHO - seat_r(Z, -0.02), Z - SEAT_H))
outer = smin(outer, radial_boxes(NOTCHES, TAB_W, SEAT_R0 + NOTCH_DEPTH - 0.15, 0.25, TAB_H), 0.25)  # fully inside the notches
tan_h = np.tan(np.radians(HOOD_DEG))
flat = LINER_FACE_Z - Z
hood = (LINER_FACE_Z - Y * tan_h - Z) / np.sqrt(1 + tan_h**2)
face = smin(flat, hood, 4.0)                                    # solid lies above the lower plane
liner = smax(outer, face, 0.6)
liner = smax(liner, -(R - LINER_IN_R), 1.0)                     # bearing, rounded entry
del outer, flat, hood, face

print("marching cubes...")
G.mesh(cup_metal, OUT / "cup_metal_hi.ply")
G.mesh(cup_coat, OUT / "cup_coat_hi.ply")
G.mesh(liner, OUT / "liner_hi.ply")
G.save_fields(OUT / "fields.npz", cup_metal=cup_metal, cup_coat=cup_coat,
              cup_coat_exact=cup_coat_exact, liner=liner)
print("done")
