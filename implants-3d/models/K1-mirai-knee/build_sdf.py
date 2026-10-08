"""Mirai PS knee: SDF parts + outlines.

Outputs (build/):
  femoral_hi.ply   femoral component (one closed surface; Blender splits polished / blasted)
  insert_hi.ply    PS insert
  keel_hi.ply      tibial keel + fins (trimmed to the tray underside in Blender)
  fields.npz       femoral, bone (the resected femur), insert, keel
  outlines.npz     tray outline (points + outward normals, CCW), for the swept tray edge
The tray plate itself is a profile swept along the outline in Blender.
"""
import sys
import numpy as np
from pathlib import Path
from skimage import measure

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from knee_params import *                 # noqa: E402,F401
from sdf_kit import Grid, smin, smax      # noqa: E402

OUT = HERE / "build"
OUT.mkdir(exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ---- tray outline --------------------------------------------------------------------------
def outline(offset, step):
    h = 0.05
    xs = np.arange(-40, 40 + h, h)
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
for lod, step in (("lod0", 0.7), ("lod1", 1.5)):
    for name, off in (("tray", 0.0), ("tray_top", RIM_W)):
        p, nn = outline(off, step)
        outs[f"{name}_{lod}_p"], outs[f"{name}_{lod}_n"] = p, nn
np.savez(OUT / "outlines.npz", **outs)
print("outlines", {k: v.shape for k, v in outs.items() if k.endswith("_p")})

# ---- femoral component ----------------------------------------------------------------------
G = Grid([-36, -37, -2], [36, 37, 50], 0.25)
X, Y, Z = G.X, G.Y, G.Z


# Outer (articular) surface as ONE swept field: a coronal profile (two ridges with a groove
# between) carried along the sagittal J-curve, posterior condyle -> distal -> anterior flange.
# No blends between separate primitives, so no lumps in the mirror polish.
from scipy.interpolate import splprep, splev
from scipy.spatial import cKDTree

ctrl = np.array([(-23.5, 43.0), (-30.0, 34.0), (-33.0, 22.0), (-30.0, 10.0), (-22.0, 2.5), (-11.0, 0.0),
                 (0.0, 0.0), (12.0, 1.8), (22.0, 6.5), (29.0, 13.0), (32.0, 21.0), (32.5, 30.0),
                 (31.8, 40.0), (30.8, 49.0)])
tck, _ = splprep(ctrl.T, s=1.5)
cy, cz = splev(np.linspace(0, 1, 6000), tck)
ty, tz = splev(np.linspace(0, 1, 6000), tck, der=1)
tl = np.hypot(ty, tz)
ny, nz = tz / tl, -ty / tl                                    # outward (away from the bone)
yz = np.stack([Y[0], Z[0]], -1).reshape(-1, 2)                 # the field is separable in x
_, idx = cKDTree(np.stack([cy, cz], 1)).query(yz)
d2 = ((yz[:, 0] - cy[idx]) * ny[idx] + (yz[:, 1] - cz[idx]) * nz[idx]).reshape(Y.shape[1:])
py, pz = cy[idx].reshape(Y.shape[1:]), cz[idx].reshape(Y.shape[1:])
d = np.broadcast_to(d2, X.shape)
troch = smoothstep(12, 24, py)[None]                           # trochlea / flange region
xr = COND_X - 4.0 * troch                                      # ridge positions
rr = COND_RC - 4.0 * troch                                     # coronal radius of each ridge
half_w = 33.0 - 0.32 * np.clip(pz - 16, 0, None)[None] * smoothstep(18, 28, py)[None]
sx = np.sqrt(X**2 + 1.0)
outer = G.normalize(d + (sx - xr) ** 2 / (2 * rr))
outer = smax(outer, np.abs(X) - half_w, 3.0)                   # rounded medial/lateral edges
z_top = 43.0 + 4.0 * smoothstep(-5, 5, py)[None]
outer = smax(outer, Z - z_top, 2.0)
del d, d2, py, pz, troch, xr, rr, half_w, sx, z_top

bone = np.max([G.P @ n - d for n, d in BONE_CUTS], axis=0)   # resected femur, negative inside
femoral = smax(outer, -bone, 1.2)                             # shell over the bone cuts
notch = np.maximum.reduce([np.abs(X) - NOTCH_HALF_W, Y - 6.0, Z - 28.0])
femoral = smax(femoral, -notch, 1.2)
# PS box housing (inside the bone volume), with the cam bar across the back of the notch
housing = np.maximum.reduce([np.abs(X) - BOX_HALF_W, Y - 8.0, -21.0 - Y, Z - BOX_TOP])
housing = np.maximum(housing, -np.maximum.reduce([np.abs(X) - NOTCH_HALF_W, Z - (BOX_TOP - 2.0), Y - 9.0]))
cam = np.maximum(np.sqrt((Y + 19.0) ** 2 + (Z - 12.0) ** 2) - 3.8, np.abs(X) - BOX_HALF_W)
housing = smin(housing, cam, 1.0)
housing = np.maximum(housing, outer)                          # only inside the component's envelope
femoral = smin(femoral, housing, 0.8)
# fixation pegs on the distal cut
for xp in (-PEG_X, PEG_X):
    peg = np.sqrt((X - xp) ** 2 + (Y - PEG_Y) ** 2) - PEG_R
    tip = np.sqrt((X - xp) ** 2 + (Y - PEG_Y) ** 2 + (Z - (PEG_TOP - PEG_R)) ** 2) - PEG_R
    peg = np.where(Z > PEG_TOP - PEG_R, tip, np.maximum(peg, 8.0 - Z))
    femoral = smin(femoral, peg, 1.0)
# cement pockets: 0.8 mm recess in the bone-facing surface, a 2.5 mm land left round the edges
pocket = np.maximum(bone - POCKET_DEPTH, -(outer + 2.5))
pocket = np.maximum(pocket, 1.5 - housing)                    # no pockets against the box walls
femoral = smax(femoral, -pocket, 1.4)   # gentle pocket walls: a 0.8 mm step aliases at web mesh density
G.mesh(femoral, OUT / "femoral_hi.ply")
G.save_fields(OUT / "fields_femoral.npz", femoral=femoral, bone=bone)
del femoral, bone, outer, notch, housing, cam, pocket, peg, tip
del G, X, Y, Z

# ---- PS insert + keel (tibial frame) --------------------------------------------------------
G = Grid([-38, -28, -45], [38, 28, 30], 0.25)   # keel tip reaches z = -41
X, Y, Z = G.X, G.Y, G.Z
ins2d = tray_outline_field(X, Y) + INSERT_INSET
dish = [DISH_MIN + (X - xc) ** 2 / (2 * DISH_RC) + (Y - DISH_Y) ** 2 / (2 * DISH_RS) for xc in (-DISH_X, DISH_X)]
k = 6.0
h = np.clip(0.5 + 0.5 * (dish[1] - dish[0]) / k, 0, 1)
top = dish[1] * (1 - h) + dish[0] * h - k * h * (1 - h)       # smooth min: ridge between dishes
top = top + 2.2 * smoothstep(10, 19, Y)                       # anterior lip
top = np.minimum(top, INSERT_TOP + 2.0 * smoothstep(10, 19, Y))
gy, gx = np.gradient(top, G.vox, axis=1), np.gradient(top, G.vox, axis=0)
top_f = (Z - top) / np.sqrt(1 + gx**2 + gy**2)
insert = smax(G.normalize(ins2d), top_f, 1.5)
insert = smax(insert, INSERT_BASE - Z, 0.6)
post = np.maximum.reduce([np.abs(X) - POST_HALF_W, Y - POST_Y1, POST_Y0 - Y, Z - POST_TOP])
post = smax(post, (Z - POST_TOP) + (np.abs(X) - POST_HALF_W) * 0.6, 2.0)        # rounded top
post = smax(post, (Y - POST_Y1) * 0.8 + (Z - POST_TOP) * 0.6, 2.0)            # sloped front
insert = smin(insert, np.maximum(post, INSERT_BASE + 2 - Z), 2.5)
G.mesh(insert, OUT / "insert_hi.ply")

rk = KEEL_R0 + (KEEL_R1 - KEEL_R0) * np.clip(-Z / KEEL_LEN, 0, 1)
cone = np.sqrt(X**2 + (Y + 2.0) ** 2) - rk
tipz = -KEEL_LEN
cone = np.where(Z < tipz, np.sqrt(X**2 + (Y + 2.0) ** 2 + (Z - tipz) ** 2) - KEEL_R1, cone)
span = KEEL_R0 + (FIN_HALF_SPAN - KEEL_R0) * np.clip(1 + Z / FIN_DEPTH, 0, 1)
fin = np.maximum.reduce([np.abs(Y + 2.0) - FIN_T / 2, np.abs(X) - span, -FIN_DEPTH - Z])
keel = smin(cone, fin, 2.0)
keel = np.maximum(keel, Z - 0.8)                              # trimmed to z = 0 in Blender
G.mesh(keel, OUT / "keel_hi.ply")
G.save_fields(OUT / "fields_tibia.npz", insert=insert, keel=keel)
print("done")
