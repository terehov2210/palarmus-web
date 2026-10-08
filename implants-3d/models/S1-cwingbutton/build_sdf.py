"""WingButton and CloverButton as SDFs -> reference meshes + fields (strands are tubes in Blender)."""
import sys
import numpy as np
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from cwing_params import *          # noqa: E402,F401
from sdf_kit import Grid, smax      # noqa: E402

OUT = HERE / "build"
OUT.mkdir(exist_ok=True)
h = BTN_T / 2

# WingButton, local frame centred at the origin (moved to x = SPAN in Blender)
G = Grid([-1.2, -2.4, -6.6], [1.2, 2.4, 6.6], 0.04)
X, Y, Z = G.X, G.Y, G.Z
r = WING_W / 2
q = np.maximum(np.abs(Z) - (WING_L / 2 - r), 0)
wing = np.sqrt(q**2 + Y**2) - r                               # stadium outline
wing = smax(wing, np.abs(X) - h, 0.35)
holes = np.full(X.shape, np.inf, dtype=np.float32)
for s in (-1, 1):
    a, b = WING_HOLE
    holes = np.minimum(holes, (np.sqrt(((Z - s * WING_HOLE_Z) / a) ** 2 + (Y / b) ** 2) - 1.0) * min(a, b))
wing = smax(wing, -holes, 0.25)
G.mesh(wing, OUT / "wing_hi.ply")
G.save_fields(OUT / "fields_wing.npz", wing=wing)

# CloverButton
G = Grid([-1.2, -4.6, -6.1], [1.2, 4.6, 6.1], 0.04)
X, Y, Z = G.X, G.Y, G.Z
clover = (np.sqrt((Z / CLOVER_A) ** 2 + (Y / CLOVER_B) ** 2) - 1.0) * CLOVER_B
clover = G.normalize(clover)
dome = (np.abs(X) - h) - 0.25 * (1 - np.clip((Z / CLOVER_A) ** 2 + (Y / CLOVER_B) ** 2, 0, 1))   # slightly domed faces
clover = smax(clover, dome, 0.4)
a, b = CLOVER_HOLE
hole = (np.sqrt((Z / a) ** 2 + (Y / b) ** 2) - 1.0) * min(a, b)
clover = smax(clover, -hole, 0.3)
G.mesh(clover, OUT / "clover_hi.ply")
G.save_fields(OUT / "fields_clover.npz", clover=clover)
print("done")
