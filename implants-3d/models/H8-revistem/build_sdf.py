"""Revistem M proximal metal (top of the body, lateral shoulder, neck) as an SDF -> reference mesh.

Only the polished part needs a field: the distal stem, locking ring and coated body are exact
sweeps/lathes in Blender, and the trunnion is the DeltaWay lathe. The body here starts below the
coating edge (Z_COAT1) and is trimmed in Blender by that plane, under the coating.

Outputs (build/): metal_hi.ply, fields.npz (metal)
"""
import sys
import numpy as np
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from revistem_params import *          # noqa: E402,F401
from sdf_kit import Grid, smax, smin  # noqa: E402

OUT = HERE / "build"
OUT.mkdir(exist_ok=True)
G = Grid([-12.5, -11.5, Z_COAT1 - 4.0], [36.0, 11.5, HEAD[2] - 2.0], 0.2)
X, Y, Z, P = G.X, G.Y, G.Z, G.P

# ---- body: cylinder, lateral shoulder sloping down towards the neck (exact distances) ------
body = np.sqrt(X * X + Y * Y) - R_METAL
slope = 0.32
shoulder = (Z - (Z_TOP - slope * (X + R_METAL))) / np.sqrt(1 + slope**2)
body = smax(body, shoulder, 3.0)
body = np.maximum(body, (Z_COAT1 - 2.5) - Z)          # closed below the coating edge (trimmed later)

# ---- neck: a round cone along the neck axis (an exact distance field, so the blend into the
# body is one clean saddle; a superellipse section only approximates distance and its blend
# rippled in the reflections), flat end under the turned collar ------------------------------
s, r = neck_frame(P)
s_axis = -float(np.linalg.norm(HEAD - np.array([0.0, 0.0, Z_NECK_AXIS])))
s0, s1 = s_axis + 8.0, S_NECK_END                       # base (inside the body) -> collar
r0, r1 = 8.6, 5.9
k = (r0 - r1) / (s1 - s0)                               # radius falls by k per mm towards the collar
cone = (r - (r1 - k * (s - s1))) / np.sqrt(1 + k * k)
neck = np.maximum(cone, np.maximum(s - s1, s0 - s))
del s, r, cone

metal = smin(body, neck, 6.0)
del body, neck, shoulder

print("marching cubes...")
G.mesh(metal, OUT / "metal_hi.ply")
G.save_fields(OUT / "fields.npz", metal=metal)
print("done")
