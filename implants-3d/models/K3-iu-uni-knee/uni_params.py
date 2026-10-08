"""iU unicompartmental knee (CR, cemented), mid size 4#. Shared by build_sdf.py and build_blender.py.

The catalogue (p. 8) lists the range only — femoral and tray 1#-7# LM/RL / RM/LL, insert 7-11 mm —
with no millimetres, so the numbers below are typical of a mid-size fixed-bearing uni knee and the
shapes follow the two manufacturer renders (`source/Ендопротезування/Ендопротез одновиростковий
колінного суглоба.png` and catalogue p. 8): a narrow polished runner with a fin and a peg on the
bone side, a D-shaped tray with a rim and a keel, a flat polyethylene insert.
Swap in the real dimensions when iKey's CAD or a size table arrives.

Frame (all parts): millimetres, x medio-lateral (+x towards the intercondylar notch, the tray's
straight side), y antero-posterior (+anterior), z up.
Tibial parts: tray underside at z = 0. Femoral component: lowest runner point at the origin.
"""
import math
import numpy as np

# ---- tibial tray -------------------------------------------------------------------------
TRAY_HALF_ML = 15.5          # oval half-width before the straight side is cut
TRAY_STRAIGHT_X = 11.0       # straight (intercondylar) side -> tray 26.5 mm wide
TRAY_HALF_AP = 25.0          # 50 mm deep
TRAY_T = 3.0                 # plate thickness
RIM_H, RIM_W = 1.2, 1.5      # rim around the top that holds the insert
KEEL_X = 1.0                 # keel runs front to back under the middle of the plate
KEEL_HALF_T = 1.8
KEEL_TOP_HALF, KEEL_BOT_HALF, KEEL_DEPTH = 15.0, 9.0, 9.0   # trapezoid in the sagittal plane
KEEL_Y = -1.0

# ---- insert (7-11 mm range: 8 mm shown) ----------------------------------------------------
INSERT_INSET = RIM_W + 0.05  # sits inside the rim
INSERT_BASE = TRAY_T         # bottom of the insert
DISH_X, DISH_Y = -1.0, -2.0  # centre of the shallow articular dish
INSERT_MIN = 8.0             # thinnest point of the insert
DISH_MIN = INSERT_BASE + INSERT_MIN
DISH_RC, DISH_RS = 38.0, 80.0  # coronal / sagittal radii: fixed bearing, nearly flat

# ---- femoral component ---------------------------------------------------------------------
RUNNER_HALF_W = 10.0         # 20 mm wide at the distal contact
RUNNER_RC = 22.0             # coronal radius of the runner
POCKET_DEPTH = 0.8
PEG_R, PEG_Y, PEG_TOP = 3.0, 6.0, 16.0
FIN_HALF_T, FIN_Y0, FIN_Y1, FIN_DEPTH, FIN_TOP = 1.5, -15.0, 1.0, 8.0, 15.0
# sagittal J-curve of the runner, (y, z): posterior condyle top -> distal -> anterior tip
RUNNER_CURVE = [(-21.5, 38.0), (-24.5, 31.0), (-25.5, 22.0), (-24.0, 13.0), (-19.5, 6.0),
                (-11.0, 1.5), (0.0, 0.0), (10.0, 1.2), (18.0, 4.5), (23.0, 9.5), (25.5, 14.0)]
POST_TOP_Z = 35.0
ANT_END = (np.array([0.0, 0.486, 0.874]), 24.5 * 0.486 + 12.5 * 0.874)   # cap across the tip

# bone cuts (femoral component inner side), as planes n.p = d with n pointing out of the bone
_s2 = math.sqrt(2)
BONE_CUTS = [
    (np.array([0.0, 0.0, -1.0]), -6.0),                 # distal cut, z = 6
    (np.array([0.0, -1.0, 0.0]), 19.5),                 # posterior cut, y = -19.5
    (np.array([0.0, -1.0, -1.0]) / _s2, 6.0 / _s2),     # posterior chamfer
    (np.array([0.0, 1.0, -1.0]) / _s2, 5.0 / _s2),      # anterior chamfer
]

# assembly: runner resting in the dish, knee extended
FEMUR_IN_TIBIA = np.array([DISH_X, DISH_Y, DISH_MIN + 0.05])


def tray_outline_field(x, y):
    """2D signed distance (approx.) of the tray outline: an oval with its notch side cut straight."""
    n = 2.4
    q = (np.abs(x / TRAY_HALF_ML) ** n + np.abs(y / TRAY_HALF_AP) ** n) ** (1 / n)
    oval = (q - 1.0) * TRAY_HALF_ML
    side = x - TRAY_STRAIGHT_X
    k = 2.5
    h = np.clip(0.5 + 0.5 * (side - oval) / k, 0, 1)            # smooth max, rounded corners
    return oval * (1 - h) + side * h + k * h * (1 - h)
