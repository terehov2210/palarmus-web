"""Mirai PS total knee (iKey Medical), mid size. Shared by build_sdf.py and build_blender.py.

The catalogue gives sizes only as a range (1#-7#, LM/RM), no millimetres, so the numbers below
are typical of a mid-size posterior-stabilised knee and the shapes follow the manufacturer
renders (`source/Ендопротезування/Ендопротез колінного суглобу зі стемом.png`, catalogue p. 9).
Swap in the real dimensions when iKey's CAD or a size table arrives.

Frame (all parts): millimetres, x medio-lateral, y antero-posterior (+anterior), z up.
Tibial parts: tray underside at z = 0. Femoral component: lowest condyle point at z = 0.
"""
import math
import numpy as np

# ---- tibial tray -------------------------------------------------------------------------
TRAY_HALF_ML = 35.0          # 70 mm wide
TRAY_HALF_AP = 22.5          # ~46 mm deep (medial lobe a little deeper)
TRAY_T = 3.0                 # plate thickness
RIM_H, RIM_W = 1.0, 1.6      # locking rim around the top
PCL_NOTCH_W, PCL_NOTCH_D = 14.0, 8.0
KEEL_LEN, KEEL_R0, KEEL_R1 = 36.0, 8.0, 5.0
FIN_HALF_SPAN, FIN_T, FIN_DEPTH = 21.0, 2.4, 18.0

# ---- PS insert ---------------------------------------------------------------------------
INSERT_INSET = RIM_W + 0.05  # sits inside the rim
INSERT_BASE = TRAY_T         # bottom of the insert
DISH_X = 19.0                # condylar dish centres
DISH_Y = -3.0
DISH_MIN = 9.0               # lowest point of the dishes (tray underside = 0)
DISH_RC, DISH_RS = 32.0, 55.0  # coronal / sagittal radii of the dishes
INSERT_TOP = 14.0
POST_HALF_W, POST_Y0, POST_Y1, POST_TOP = 7.5, -12.0, 2.0, 27.0

# ---- femoral component -------------------------------------------------------------------
COND_X = 19.0                # condyle centres
COND_HALF_W = 14.0
COND_RC = 30.0               # coronal radius of each condyle
NOTCH_HALF_W = 9.5
BOX_HALF_W, BOX_TOP = 11.5, 26.0
PEG_R, PEG_X, PEG_Y, PEG_TOP = 3.5, 19.0, -2.0, 21.0
POCKET_DEPTH = 0.8

# bone cuts (femoral component inner side), as planes n.p = d with n pointing out of the bone
_s2 = math.sqrt(2)
BONE_CUTS = [
    (np.array([0.0, 0.0, -1.0]), -9.0),                 # distal cut, z = 9
    (np.array([0.0, 1.0, 0.0]), 24.0),                  # anterior cut, y = 24
    (np.array([0.0, -1.0, 0.0]), 23.0),                 # posterior cut, y = -23
    (np.array([0.0, 1.0, -1.0]) / _s2, 5.0 / _s2),      # anterior chamfer
    (np.array([0.0, -1.0, -1.0]) / _s2, 9.0 / _s2),     # posterior chamfer
]

# assembly: femoral condyles resting in the dishes, knee extended
FEMUR_IN_TIBIA = np.array([0.0, DISH_Y, DISH_MIN + 0.05])


def tray_outline_field(x, y):
    """2D signed distance (approx.) of the tray outline: asymmetric oval minus the PCL notch."""
    half_ap = TRAY_HALF_AP - 1.0 + 1.0 * np.tanh(x / 10.0)     # medial (+x) lobe deeper
    n = 2.6
    q = (np.abs(x / TRAY_HALF_ML) ** n + np.abs(y / half_ap) ** n) ** (1 / n)
    oval = (q - 1.0) * np.minimum(TRAY_HALF_ML, half_ap)
    notch = np.maximum(np.abs(x) - PCL_NOTCH_W / 2, y - (-TRAY_HALF_AP + PCL_NOTCH_D))
    k = 2.0
    h = np.clip(0.5 - 0.5 * (-notch - oval) / k, 0, 1)        # smooth max(oval, -notch)
    return oval * h + (-notch) * (1 - h) + k * h * (1 - h)
