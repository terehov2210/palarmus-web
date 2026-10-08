"""Suture anchors S6-S11 -> GLBs (LOD0/LOD1) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render] [name prefixes]
Anchor bodies are helical sweeps from tools/screws.py (anchor_params.py holds the specs);
sutures, the XtraLoc loop and the SutureLoc sleeve are tubes along splines.
"""
import bpy, sys, math
import numpy as np
from pathlib import Path

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1] / "tools"))
import blender_kit as K                        # noqa: E402
import screws                                  # noqa: E402
from anchor_params import (ANCHORS, LOD, SUTURE_LOD, SUTURE_R, SUTURELOC, SLEEVE_W, SLEEVE_T, SLEEVE_CRIMP,  # noqa: E402
                           catmull_rom, sutureloc_paths)

BUILD = ROOT / "build"
BUILD.mkdir(exist_ok=True)
RENDER = "--no-render" not in sys.argv


def sweep(sc, lod, name):
    cols, ds, pp = lod
    return K.swept_zip(screws.columns(sc, cols, ds, pp), (0, 0, 0), (0, 0, 1), (1, 0, 0), sc.mat,
                       name=name, uv_radius=sc.uv_radius, crease=40.0)


def tails(spec, cfg):
    return [K.tube(catmull_rom(ctrl, int(90 * cfg["n"])), SUTURE_R, mat, cfg["seg"], name=mat,
                   end_round=(0.05, 0.08), u_repeats=1) for ctrl, mat in spec]


def build(name, lod):
    cfg = SUTURE_LOD[lod]
    if name == SUTURELOC:
        sleeve, tl = sutureloc_paths()
        path = catmull_rom(sleeve, int(160 * cfg["n"]) + 20)
        s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
        amp, per = SLEEVE_CRIMP
        sl = K.tube(path, (SLEEVE_T, SLEEVE_W), "suture_white", cfg["seg"] + 6, name="sleeve", end_round=0.5,
                    u_repeats=2, scale=1 + amp * np.sin(2 * math.pi * s / per))
        return K.join([sl] + tails(tl, cfg), name)
    a = ANCHORS[name]
    parts = [sweep(a["screw"], LOD[lod], "body")]
    if "tails" in a:
        parts += tails(a["tails"], cfg)
    if "rod" in a:
        rod = sweep(a["rod"], LOD[lod], "eyelet")
        R = np.asarray(a["rod_place"]["matrix"], float)
        K.to_metres(rod, matrix=R)                      # rotate (and scale to m) ...
        K.set_co(rod.data, K.get_co(rod.data) * 1000 + np.asarray(a["rod_place"]["offset"]))   # ... back to mm
        ctrl, mat = a["loop"]
        loop = K.tube(catmull_rom(ctrl, int(120 * cfg["n"]), closed=True), SUTURE_R, mat, cfg["seg"],
                      closed=True, name="loop", u_repeats=1)
        parts += [rod, loop]
    return K.join(parts, name)


names = list(ANCHORS) + [SUTURELOC]
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
        if name == SUTURELOC:
            shots[name] = (name + "_lod0", (0, 0, 0.012), (0.55, -0.8, 0.2), 0.075)
            shots[name + "_close"] = (name + "_lod0", (0, 0, 0.004), (0.4, -0.85, 0.3), 0.045)
            continue
        L = ANCHORS[name]["screw"].length / 1000
        lo = -0.008 if "rod" in ANCHORS[name] else 0.0
        shots[name] = (name + "_lod0", (0, 0, (L + lo) / 2), (0.55, -0.8, 0.2), (L - lo) * 3.0 + 0.02)
        shots[name + "_top"] = (name + "_lod0", (0, 0, L - 0.002), (0.45, -0.6, 0.65), 0.05)
        shots[name + "_tip"] = (name + "_lod0", (0, 0, lo / 2 + 0.002), (0.6, -0.75, -0.1), 0.05)
    K.render_shots({k: v for k, v in outputs.items() if k.endswith("lod0")}, shots, ROOT / "renders",
                   size=(600, 900), samples=64)
