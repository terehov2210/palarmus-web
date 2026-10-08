"""Revistem M 20x70 + 16x190 -> GLBs (LOD0/LOD1) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render]

  distal     structured sweep: 8 ribs (a crest column on each), bullet nose closing to a pole,
             satin with the lines along the stem
  ring       polished locking ring at the junction, lathe (hides the distal stem's top)
  coat       plasma-sprayed body, lathe with 0.5 mm step walls at both edges
  metal      shoulder + neck: SDF -> remesh, trimmed under the coating by a plane
  trunnion   the DeltaWay 12/14 lathe (collar, relief groove, cone), same heads fit
Exported like the DeltaWay stem: origin at the head centre, metres, glTF Y = stem axis.
"""
import bpy, sys, math
import numpy as np
from pathlib import Path

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1] / "tools"))
import blender_kit as K          # noqa: E402
from revistem_params import *    # noqa: E402,F401

BUILD = ROOT / "build"
RENDER = "--no-render" not in sys.argv
F = K.Fields(BUILD / "fields.npz")
LODS = {
    "lod0": dict(metal=0.62, per_rib=16, shaft=24, lathe=96, trunnion=64),
    "lod1": dict(metal=1.25, per_rib=8, shaft=10, lathe=48, trunnion=32),
}
AXIS, REF = (0, 0, 1), (1, 0, 0)


def metal(cfg):
    def hidden(c):
        s, r = neck_frame(c)
        with np.errstate(invalid="ignore"):
            inside = r < lathe_radius(s) - 0.4                # well inside the turned collar
        return inside | (s > S_NECK_END - 0.05)               # the neck's flat end
    obj = K.remeshed_surface(BUILD / "metal_hi.ply", cfg["metal"], F, "metal", hidden=hidden)
    K.bisect_keep(obj, [((0, 0, -1), -(Z_COAT1 - 0.6))])     # ends under the coating
    K.uv_smart(obj, K.tile_mm("ti_polished"))
    K.set_normals(obj.data, K.field_corner_normals(obj.data, F, "metal"))
    K.assign(obj, "ti_polished")
    return obj


def build(cfg):
    parts = [
        K.swept(distal_columns(cfg["per_rib"], cfg["shaft"]), (0, 0, 0), AXIS, REF, "ti_satin", name="distal"),
        K.lathe(ring_profile(), (0, 0, 0), AXIS, REF, cfg["lathe"], "ti_polished", sharp=RING_SHARP, name="ring"),
        K.lathe(coat_profile(), (0, 0, 0), AXIS, REF, cfg["lathe"], "ti_plasma_spray", sharp=COAT_SHARP, name="coat"),
        metal(cfg),
        K.lathe(LATHE_PROFILE, HEAD, NECK_DIR, (0, 1, 0), cfg["trunnion"], "ti_polished",
                sharp=LATHE_SHARP, name="trunnion"),
    ]
    counts = {o.name: K.tri_count(o) for o in parts}
    obj = K.join(parts, "revistem")
    K.to_metres(obj, origin=HEAD)
    return obj, counts


bpy.ops.wm.read_factory_settings(use_empty=True)
outputs = {}
for lod, cfg in LODS.items():
    obj, counts = build(cfg)
    path = BUILD / f"revistem_m_20x70_16x190_{lod}.glb"
    print(f"[revistem_{lod}] {K.tri_count(obj)} tris {counts}")
    K.export_glb(obj, path)
    outputs[lod] = path
    bpy.data.objects.remove(obj)

if RENDER:
    K.render_shots(outputs, {
        "hero": ("lod0", (-0.03, 0, -0.12), (0.32, -0.9, 0.12), 0.6),
        "proximal": ("lod0", (-0.025, 0, -0.03), (0.45, -0.85, 0.3), 0.18),
        "junction": ("lod0", (-0.04, 0, -0.1), (0.4, -0.9, 0.1), 0.1),
        "tip": ("lod0", (-0.04, 0, -0.27), (0.4, -0.9, -0.2), 0.08),
        "proximal_mobile": ("lod1", (-0.025, 0, -0.03), (0.45, -0.85, 0.3), 0.18),
    }, ROOT / "renders")
