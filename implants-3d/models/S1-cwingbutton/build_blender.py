"""C-WingButton 2, deployed -> GLBs (LOD0/LOD1) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render]
Buttons: SDF remesh (ti_satin). Strands: two loops as tubes along splines + the cinch knot
on the CloverButton (suture_tracer). Origin at the CloverButton centre, strands along +X.
"""
import bpy, sys
import numpy as np
from pathlib import Path

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1] / "tools"))
import blender_kit as K     # noqa: E402
from cwing_params import *  # noqa: E402,F401

BUILD = ROOT / "build"
RENDER = "--no-render" not in sys.argv
FW = K.Fields(BUILD / "fields_wing.npz")
FC = K.Fields(BUILD / "fields_clover.npz")
LODS = {"lod0": dict(button=0.22, seg=10, path=0.7), "lod1": dict(button=0.38, seg=6, path=0.4)}


def button(name, F, field, cfg, offset=(0, 0, 0)):
    o = K.remeshed_surface(BUILD / f"{name}_hi.ply", cfg["button"], F, field)
    K.uv_smart(o, K.tile_mm("ti_satin"))
    K.set_normals(o.data, K.field_corner_normals(o.data, F, field))
    K.set_co(o.data, K.get_co(o.data) + np.asarray(offset))
    K.assign(o, "ti_satin")
    return o


def system(cfg):
    parts = [button("clover", FC, "clover", cfg), button("wing", FW, "wing", cfg, (SPAN, 0, 0))]
    for side in (-1, 1):
        parts.append(K.tube(loop_path(side, int(300 * cfg["path"])), STRAND_R, "suture_tracer", cfg["seg"],
                            name=f"loop{side}", end_round=0.1, u_repeats=1))
    parts.append(K.tube(knot_path(int(160 * cfg["path"])), STRAND_R * 1.05, "suture_tracer", cfg["seg"],
                        name="knot", end_round=0.2, u_repeats=1))
    return K.join(parts, "cwingbutton")


bpy.ops.wm.read_factory_settings(use_empty=True)
outputs = {}
for lod, cfg in LODS.items():
    obj = system(cfg)
    K.to_metres(obj)
    print(f"[cwingbutton_{lod}] {K.tri_count(obj)} tris")
    path = BUILD / f"cwingbutton_{lod}.glb"
    K.export_glb(obj, path)
    outputs[f"cwingbutton_{lod}"] = path
    bpy.data.objects.remove(obj)

if RENDER:
    K.render_shots(
        {"cwingbutton_lod0": outputs["cwingbutton_lod0"]},
        {
            "cwingbutton": ("cwingbutton_lod0", (0.02, 0, 0), (0.3, -0.9, 0.35), 0.17),
            "clover": ("cwingbutton_lod0", (0.0, 0, 0), (-0.75, -0.55, 0.35), 0.045),
            "wing": ("cwingbutton_lod0", (0.04, 0, 0), (0.75, -0.55, 0.35), 0.045),
        },
        ROOT / "renders",
    )
