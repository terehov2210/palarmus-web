"""RingButton button as an SDF -> reference mesh + field. (Sutures and the screw are built
directly in Blender: tubes along splines, and a helical sweep.)"""
import sys
import numpy as np
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from acl_params import *            # noqa: E402,F401
from sdf_kit import Grid, smax      # noqa: E402

OUT = HERE / "build"
OUT.mkdir(exist_ok=True)
G = Grid([-7.0, -3.0, -1.5], [7.0, 3.0, 1.5], 0.04)
X, Y, Z = G.X, G.Y, G.Z
# rounded-rectangle outline, extruded, rounded edges
qx, qy = np.abs(X) - (BTN_L / 2 - BTN_CORNER), np.abs(Y) - (BTN_W / 2 - BTN_CORNER)
rect = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - BTN_CORNER
btn = smax(rect, np.abs(Z) - BTN_T / 2, 0.35)
holes = np.full(X.shape, np.inf, dtype=np.float32)
for sx in (-1, 1):
    a, b = LOOP_HOLE
    holes = np.minimum(holes, (np.sqrt(((X - sx * LOOP_HOLES_X) / a) ** 2 + (Y / b) ** 2) - 1.0) * min(a, b))
    holes = np.minimum(holes, np.sqrt((X - sx * END_HOLES_X) ** 2 + Y**2) - END_HOLE_R)
btn = smax(btn, -holes, 0.25)
G.mesh(btn, OUT / "button_hi.ply")
G.save_fields(OUT / "fields.npz", button=btn)
print("done")
