"""Osteosynthesis screws -> GLBs (LOD0/LOD1) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render]
Every screw is one helical sweep from tools/screws.py (screw_params.py holds the specs).
#48 adds the integrated compression screw, nested in a groove of the lag screw.
#41 washer: a sweep of one profile.
"""
import bpy, sys, math
import numpy as np
from pathlib import Path

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1] / "tools"))
import blender_kit as K                        # noqa: E402
import screws                                  # noqa: E402
from screw_params import SCREWS, COMPANION, WASHER   # noqa: E402

BUILD = ROOT / "build"
BUILD.mkdir(exist_ok=True)
RENDER = "--no-render" not in sys.argv


def sweep(sc, lod, name):
    cols, ds, pp = lod
    return K.swept_zip(screws.columns(sc, cols, ds, pp), (0, 0, 0), (0, 0, 1), (1, 0, 0), sc.mat,
                   name=name, uv_radius=sc.uv_radius, crease=40.0)


def build(name, lod):
    if name == WASHER["name"]:
        n = 64 if lod == "lod0" else 32
        cols = [(phi, WASHER["profile"]) for phi in np.linspace(0, 2 * math.pi, n, endpoint=False)]
        return K.swept(cols, (0, 0, 0), (0, 0, 1), (1, 0, 0), WASHER["mat"], name=name, crease=40.0)
    sc, lods = SCREWS[name]
    obj = sweep(sc, lods[lod], name)
    if name.startswith("os48"):
        comp = sweep(COMPANION["screw"], COMPANION["lod"][lod], "compression_screw")
        K.set_co(comp.data, K.get_co(comp.data) + np.asarray(COMPANION["offset"]))
        obj = K.join([obj, comp], name)
    return obj


names = list(SCREWS) + [WASHER["name"]]
only = [a for a in sys.argv[sys.argv.index("--") + 2:] if not a.startswith("--")]
if only:
    names = [n for n in names if any(n.startswith(o) for o in only)]

bpy.ops.wm.read_factory_settings(use_empty=True)
outputs = {}
for name in names:
    for lod in ("lod0", "lod1"):
        obj = build(name, lod)
        K.to_metres(obj)
        print(f"[{name}_{lod}] {K.tri_count(obj)} tris")
        path = BUILD / f"{name}_{lod}.glb"
        K.export_glb(obj, path)
        outputs[f"{name}_{lod}"] = path
        bpy.data.objects.remove(obj)

if RENDER:
    shots = {}
    for name in names:
        if name == WASHER["name"]:
            shots[name] = (name + "_lod0", (0, 0, 0.001), (0.3, -0.6, 0.75), 0.075)
            continue
        L = SCREWS[name][0].length / 1000
        shots[name] = (name + "_lod0", (0, 0, L / 2), (0.55, -0.8, 0.2), L * 2.4 + 0.02)
        shots[name + "_head"] = (name + "_lod0", (0, 0, L - 0.003), (0.45, -0.6, 0.65), 0.035 + L * 0.15)
        shots[name + "_tip"] = (name + "_lod0", (0, 0, 0.005), (0.6, -0.75, -0.1), 0.035 + L * 0.15)
    K.render_shots({k: v for k, v in outputs.items() if k.endswith("lod0")}, shots, ROOT / "renders",
                   size=(600, 900), samples=64)
