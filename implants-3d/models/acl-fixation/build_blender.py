"""ACL fixation -> GLBs (LOD0/LOD1) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render]

  ringbutton_20   titanium button (SDF remesh) + fixed loop and two sutures (tubes along splines,
                  braided textures from the library)
  graftfix_8x23   helical sweep: each azimuth's profile is the thread shifted by pitch * phi / 2pi,
                  star socket and cannulation in the same closed profile
"""
import bpy, sys, math
import numpy as np
from pathlib import Path

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1] / "tools"))
import blender_kit as K    # noqa: E402
from acl_params import *   # noqa: E402,F401

BUILD = ROOT / "build"
RENDER = "--no-render" not in sys.argv
F = K.Fields(BUILD / "fields.npz")
LODS = {
    "lod0": dict(button=0.18, loop_seg=14, sut_seg=8, path=1.0, screw_cols=64, screw_ds=0.28),
    "lod1": dict(button=0.32, loop_seg=8, sut_seg=6, path=0.5, screw_cols=32, screw_ds=0.6),
}


def ringbutton(cfg):
    btn = K.remeshed_surface(BUILD / "button_hi.ply", cfg["button"], F, "button")
    K.uv_smart(btn, K.tile_mm("ti_satin"))
    K.set_normals(btn.data, K.field_corner_normals(btn.data, F, "button"))
    K.assign(btn, "ti_satin")
    loop = K.tube(loop_path(int(220 * cfg["path"])), LOOP_R, "suture_white", cfg["loop_seg"], closed=True, name="loop", u_repeats=1)
    s1 = K.tube(suture_path(-1, 0.6, int(170 * cfg["path"])), SUTURE_R, "suture_white", cfg["sut_seg"], name="suture_white", end_round=0.08, u_repeats=1)
    s2 = K.tube(suture_path(1, -0.8, int(170 * cfg["path"])), SUTURE_R, "suture_tracer", cfg["sut_seg"], name="suture_tracer", end_round=0.08, u_repeats=1)
    return K.join([btn, loop, s1, s2], "ringbutton")


def graftfix(cfg):
    cols = [(phi, screw_profile(phi, cfg["screw_ds"]))
            for phi in np.linspace(0, 2 * math.pi, cfg["screw_cols"], endpoint=False)]
    return K.swept(cols, (0, 0, 0), (0, 0, 1), (1, 0, 0), "bioabsorbable", name="graftfix",
                   uv_radius=3.5, crease=40.0)


bpy.ops.wm.read_factory_settings(use_empty=True)
outputs = {}
for lod, cfg in LODS.items():
    for name, obj in (("ringbutton_20", ringbutton(cfg)), ("graftfix_8x23", graftfix(cfg))):
        K.to_metres(obj)
        print(f"[{name}_{lod}] {K.tri_count(obj)} tris")
        path = BUILD / f"{name}_{lod}.glb"
        K.export_glb(obj, path)
        outputs[f"{name}_{lod}"] = path
        bpy.data.objects.remove(obj)

if RENDER:
    K.render_shots(
        {k: v for k, v in outputs.items() if k.endswith("lod0")},
        {
            "ringbutton": ("ringbutton_20_lod0", (0, 0, -0.012), (0.45, -0.85, 0.25), 0.2),
            "ringbutton_detail": ("ringbutton_20_lod0", (0, 0, 0.0), (0.35, -0.8, 0.45), 0.05),
            "graftfix": ("graftfix_8x23_lod0", (0, 0, 0.0115), (0.6, -0.7, 0.35), 0.11),
            "graftfix_top": ("graftfix_8x23_lod0", (0, 0, 0.018), (0.3, -0.4, 0.85), 0.07),
        },
        ROOT / "renders",
    )
