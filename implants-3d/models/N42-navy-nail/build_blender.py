"""NAVY femoral nail -> GLBs (LOD0/LOD1) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render]
Nail: tube along the bowed axis with a bullet tip (ti_satin). Wings: flattened tubes.
Locking screws: helical sweeps from tools/profiles.screw_profile, colour-anodised; the part of
each screw inside the nail is removed (hidden).
"""
import bpy, sys, math
import numpy as np
from pathlib import Path

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1] / "tools"))
import blender_kit as K                         # noqa: E402
from profiles import screw_profile, hex_socket_r   # noqa: E402
from navy_params import *                       # noqa: E402,F401

BUILD = ROOT / "build"
BUILD.mkdir(exist_ok=True)
RENDER = "--no-render" not in sys.argv
LODS = {
    "lod0": dict(step=2.0, seg=40, wing_seg=12, cols=32, ds=0.35),
    "lod1": dict(step=5.0, seg=20, wing_seg=8, cols=16, ds=0.8),
}


def screw(z, mat, cfg):
    cols = [(phi, screw_profile(phi, cfg["ds"], SCREW_L, SCREW_MAJOR, SCREW_ROOT, SCREW_PITCH,
                                head=SCREW_HEAD, socket=lambda p: hex_socket_r(p, SCREW_HEX),
                                socket_depth=2.5, tip_len=3.0))
            for phi in np.linspace(0, 2 * math.pi, cfg["cols"], endpoint=False)]
    o = K.swept(cols, (0, 0, 0), (0, 0, 1), (1, 0, 0), mat, name="screw", uv_radius=2.5, crease=40.0)
    # lay it along +X through the nail axis at height z, head on the +X side
    p = K.get_co(o.data)
    p = np.stack([p[:, 2] - SCREW_L / 2 - 2.0, p[:, 1], -p[:, 0]], 1) + [0, axis_y(z), z]
    K.set_co(o.data, p)
    ln = np.array([l.normal[:] for l in o.data.loops])
    K.set_normals(o.data, np.stack([ln[:, 2], ln[:, 1], -ln[:, 0]], 1))
    # the shank inside the nail is hidden
    c = K.face_centres(o.data)
    inside = np.hypot(c[:, 1] - axis_y(c[:, 2]), c[:, 2] - z) < 2.4
    inside &= np.abs(c[:, 0]) < NAIL_R - 0.4
    K.delete_faces(o, inside)
    return o


def navy(cfg):
    path = nail_path(cfg["step"])
    nail = K.tube(path, NAIL_R, "ti_satin", cfg["seg"], name="nail", end_round=(3.0, 1.0),
                  scale=nail_scale(path))
    parts = [nail]
    for side in (-1, 1):
        parts.append(K.tube(wing_path(side), (0.9, 2.2), "ti_satin", cfg["wing_seg"], name="wing", end_round=0.6))
    for z, mat in zip(SCREW_Z, SCREW_MAT):
        parts.append(screw(z, mat, cfg))
    return K.join(parts, "navy")


bpy.ops.wm.read_factory_settings(use_empty=True)
outputs = {}
for lod, cfg in LODS.items():
    obj = navy(cfg)
    K.to_metres(obj)
    print(f"[navy_11x360_{lod}] {K.tri_count(obj)} tris")
    path = BUILD / f"navy_11x360_{lod}.glb"
    K.export_glb(obj, path)
    outputs[f"navy_11x360_{lod}"] = path
    bpy.data.objects.remove(obj)

if RENDER:
    K.render_shots(
        {"navy": outputs["navy_11x360_lod0"]},
        {
            "navy": ("navy", (0, 0.005, 0.18), (0.35, -0.9, 0.1), 1.25),
            "screws": ("navy", (0.005, 0.005, 0.33), (0.6, -0.75, 0.25), 0.14),
            "wings": ("navy", (0.0, 0.005, 0.03), (0.3, -0.9, 0.3), 0.12),
        },
        ROOT / "renders",
    )
