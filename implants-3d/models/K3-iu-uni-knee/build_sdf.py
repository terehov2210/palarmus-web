"""iU unicompartmental knee: SDF parts + tray outline.

Outputs (build/):
  femoral_hi.ply   femoral runner (one closed surface; Blender splits polished / blasted)
  insert_hi.ply    insert
  keel_hi.ply      tibial keel (trimmed to the tray underside in Blender)
  fields_*.npz     femoral, bone (the resected condyle), insert, keel
  outlines.npz     tray outline (points + outward normals, CCW), for the swept tray edge
The tray plate itself is a profile swept along the outline in Blender (as in K1).
"""
import sys
import numpy as np
from pathlib import Path
from skimage import measure
from scipy.interpolate import splprep, splev
from scipy.spatial import cKDTree

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from uni_params import *                  # noqa: E402,F401
from sdf_kit import Grid, smin, smax      # noqa: E402

OUT = HERE / "build"
OUT.mkdir(exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ---- tray outline --------------------------------------------------------------------------
def outline(offset, step):
    h = 0.04
    xs = np.arange(-22, 18 + h, h)
    ys = np.arange(-30, 30 + h, h)
    X2, Y2 = np.meshgrid(xs, ys, indexing="ij")
    f = tray_outline_field(X2, Y2) + offset
    c = max(measure.find_contours(f, 0.0), key=len)
    pts = np.stack([xs[0] + c[:, 0] * h, ys[0] + c[:, 1] * h], 1)
    if np.sum(pts[:, 0] * np.roll(pts[:, 1], -1) - np.roll(pts[:, 0], -1) * pts[:, 1]) < 0:
        pts = pts[::-1]                                      # counter-clockwise
    seg = np.linalg.norm(np.diff(pts, axis=0, append=pts[:1]), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = int(round(s[-1] / step))
    t = np.linspace(0, s[-1], n, endpoint=False)
    closed = np.vstack([pts, pts[:1]])
    res = np.stack([np.interp(t, s, closed[:, 0]), np.interp(t, s, closed[:, 1])], 1)
    e = 1e-3
    gx = (tray_outline_field(res[:, 0] + e, res[:, 1]) - tray_outline_field(res[:, 0] - e, res[:, 1]))
    gy = (tray_outline_field(res[:, 0], res[:, 1] + e) - tray_outline_field(res[:, 0], res[:, 1] - e))
    nrm = np.stack([gx, gy], 1)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    return res, nrm


outs = {}
for lod, step in (("lod0", 0.5), ("lod1", 1.1)):
    for name, off in (("tray", 0.0), ("tray_top", RIM_W)):
        p, nn = outline(off, step)
        outs[f"{name}_{lod}_p"], outs[f"{name}_{lod}_n"] = p, nn
np.savez(OUT / "outlines.npz", **outs)
print("outlines", {k: v.shape for k, v in outs.items() if k.endswith("_p")})

# ---- femoral runner -------------------------------------------------------------------------
G = Grid([-14, -30, -2], [14, 30, 41], 0.2)
X, Y, Z = G.X, G.Y, G.Z

# Outer (articular) surface as ONE swept field, as in K1: a convex coronal profile carried along
# the sagittal J-curve, so the mirror polish has no blends in it.
ctrl = np.array(RUNNER_CURVE)
tck, _ = splprep(ctrl.T, s=1.0)
cy, cz = splev(np.linspace(-0.08, 1.08, 6000), tck)          # run past both ends; caps trim it
ty, tz = splev(np.linspace(-0.08, 1.08, 6000), tck, der=1)
tl = np.hypot(ty, tz)
ny, nz = tz / tl, -ty / tl                                    # outward (away from the bone)
yz = np.stack([Y[0], Z[0]], -1).reshape(-1, 2)                 # the field is separable in x
_, idx = cKDTree(np.stack([cy, cz], 1)).query(yz)
d2 = ((yz[:, 0] - cy[idx]) * ny[idx] + (yz[:, 1] - cz[idx]) * nz[idx]).reshape(Y.shape[1:])
py, pz = cy[idx].reshape(Y.shape[1:]), cz[idx].reshape(Y.shape[1:])
d = np.broadcast_to(d2, X.shape)
outer = G.normalize(d + X**2 / (2 * RUNNER_RC))
# the runner narrows towards the anterior tip and the top of the posterior condyle
half_w = (RUNNER_HALF_W - 3.5 * smoothstep(12, 26, py) - 2.0 * smoothstep(22, 38, pz) * smoothstep(-5, -15, py))[None]
outer = smax(outer, np.abs(X) - half_w, 2.5)                  # rounded side edges
outer = smax(outer, Z - POST_TOP_Z, 2.0)                      # posterior condyle top
n_a, d_a = ANT_END
outer = smax(outer, n_a[1] * Y + n_a[2] * Z - d_a, 2.0)       # anterior tip
del d, d2, py, pz, half_w

bone = np.max([G.P @ n - dd for n, dd in BONE_CUTS], axis=0)  # resected condyle, negative inside
femoral = smax(outer, -bone, 1.0)                             # shell over the bone cuts
# fin along the sagittal plane, standing 8 mm into the bone off the distal cut and chamfer
fin = np.maximum.reduce([np.abs(X) - FIN_HALF_T, -bone - FIN_DEPTH, bone - 0.5, Y - FIN_Y1, FIN_Y0 - Y,
                         Z - FIN_TOP])
fin = smax(fin, (Z - FIN_TOP) * 0.7 - (Y - FIN_Y0) * 0.7 + 3.0, 1.0)   # slanted back top corner
fin = np.maximum(fin, outer)                                   # never beyond the runner's sides
# peg on the distal cut, round-ended
r = np.sqrt(X**2 + (Y - PEG_Y) ** 2)
peg = np.where(Z > PEG_TOP - PEG_R, np.sqrt(r**2 + (Z - (PEG_TOP - PEG_R)) ** 2) - PEG_R,
               np.maximum(r - PEG_R, 5.0 - Z))
fixation = np.minimum(fin, peg)
femoral = smin(femoral, fixation, 0.8)
# cement pocket: 0.8 mm recess in the bone-facing surface, a 2 mm land round the edges
pocket = np.maximum(bone - POCKET_DEPTH, -(outer + 2.0))
pocket = np.maximum(pocket, 1.2 - fixation)                   # no pocket against the fin and peg
femoral = smax(femoral, -pocket, 1.2)
G.mesh(femoral, OUT / "femoral_hi.ply")
G.save_fields(OUT / "fields_femoral.npz", femoral=femoral, bone=bone)
del femoral, bone, outer, fin, peg, fixation, pocket, r
del G, X, Y, Z

# ---- insert + keel (tibial frame) -----------------------------------------------------------
G = Grid([-20, -29, -12], [16, 29, 16], 0.2)
X, Y, Z = G.X, G.Y, G.Z
ins2d = tray_outline_field(X, Y) + INSERT_INSET
top = DISH_MIN + (X - DISH_X) ** 2 / (2 * DISH_RC) + (Y - DISH_Y) ** 2 / (2 * DISH_RS)
gy, gx = np.gradient(top, G.vox, axis=1), np.gradient(top, G.vox, axis=0)
top_f = (Z - top) / np.sqrt(1 + gx**2 + gy**2)
insert = smax(G.normalize(ins2d), top_f, 1.6)                 # rounded top edge
insert = smax(insert, INSERT_BASE - Z, 0.4)
G.mesh(insert, OUT / "insert_hi.ply")

# keel: a trapezoid plate in the sagittal plane, rounded all round, under the middle of the tray
half = KEEL_TOP_HALF + (KEEL_TOP_HALF - KEEL_BOT_HALF) * np.clip(Z / KEEL_DEPTH, -1, 0)
# The sagittal trapezoid first, as a true distance (its slanted sides are not one), then the
# thickness with rounded edges: a raw max of the two left a saw-tooth along the slanted edges.
trap = smax(np.abs(Y - KEEL_Y) - half, -KEEL_DEPTH - Z, 2.0)
trap = G.normalize(trap)
keel = smax(trap, np.abs(X - KEEL_X) - KEEL_HALF_T, 1.0)   # >= two remesh steps
keel = np.maximum(keel, Z - 0.8)                              # trimmed to z = 0 in Blender
G.mesh(keel, OUT / "keel_hi.ply")
G.save_fields(OUT / "fields_tibia.npz", insert=insert, keel=keel)
print("done")
