"""Mirai PS knee -> GLBs (LOD0/LOD1) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render]

Parts (frame in knee_params.py):
  femoral_mirai   SDF remesh; bone side (cut exactly along the offset bone planes) ->
                  metal_beadblast, articular side cocr_polished
  insert_mirai_ps SDF remesh, uhmwpe
  tray_mirai      edge band swept along the outline (crisp rim) + flat caps (polished top,
                  blasted underside) + SDF keel trimmed exactly at the underside plane
Assembly tka_mirai: tray + insert + femoral component in extension, one node per part;
the insert's underside (sitting on the tray) is removed.
"""
import bpy, sys
import numpy as np
from pathlib import Path

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1] / "tools"))
import blender_kit as K     # noqa: E402
from knee_params import *   # noqa: E402,F401

BUILD = ROOT / "build"
RENDER = "--no-render" not in sys.argv
FF = K.Fields(BUILD / "fields_femoral.npz")
FT = K.Fields(BUILD / "fields_tibia.npz")
OUTL = np.load(BUILD / "outlines.npz")

LODS = {
    "lod0": dict(femoral=1.15, insert=0.9, keel=0.9),
    "lod1": dict(femoral=2.0, insert=1.7, keel=1.8),
}


def femoral(cfg):
    obj = K.remeshed_surface(BUILD / "femoral_hi.ply", cfg["femoral"], FF, "femoral")
    # Bone-facing side = inside all five bone-cut planes pushed out 1 mm (deep enough to take the
    # 0.8 mm cement pockets, shallow enough to run through the edge fillet). Cutting the mesh
    # along those planes makes the polish / grit-blast boundary exact and straight.
    blasted = K.split_by_planes(obj, BONE_CUTS, offset=1.0)
    K.uv_smart(obj, K.tile_mm("cocr_polished"))
    K.set_normals(obj.data, K.field_corner_normals(obj.data, FF, "femoral"))
    me = obj.data
    me.materials.clear()
    me.materials.append(K.material("cocr_polished"))
    me.materials.append(K.material("metal_beadblast"))
    me.polygons.foreach_set("material_index", blasted.astype(np.int32))
    obj.name = me.name = "femoral"
    return obj


def insert(cfg):
    obj = K.remeshed_surface(BUILD / "insert_hi.ply", cfg["insert"], FT, "insert")
    K.uv_smart(obj, K.tile_mm("uhmwpe"))
    K.set_normals(obj.data, K.field_corner_normals(obj.data, FT, "insert"))
    K.assign(obj, "uhmwpe")
    obj.name = obj.data.name = "insert"
    return obj


def tray(cfg, lod):
    p2 = OUTL[f"tray_{lod}_p"]
    n2 = OUTL[f"tray_{lod}_n"]
    pts = np.column_stack([p2, np.zeros(len(p2))])
    nrm = np.column_stack([n2, np.zeros(len(n2))])
    top = TRAY_T + RIM_H
    profile = [(0.0, -1.0), (0.0, -0.35), (0.1, -0.1), (0.35, 0.0),            # underside edge
               (top - 0.35, 0.0), (top - 0.1, -0.1), (top, -0.35),             # outer wall, rim
               (top, -RIM_W + 0.35), (top - 0.1, -RIM_W + 0.1), (top - 0.35, -RIM_W),
               (TRAY_T, -RIM_W)]                                              # rim inner wall
    band = K.swept_outline(pts, nrm, profile, (0, 0, 1), "cocr_polished", name="tray_band")
    under = K.cap(pts - 1.0 * nrm, (0, 0, -1), "metal_beadblast", name="tray_under")
    plate = K.cap(pts - RIM_W * nrm + [0, 0, TRAY_T], (0, 0, 1), "cocr_polished", name="tray_top")
    keel = K.remeshed_surface(BUILD / "keel_hi.ply", cfg["keel"], FT, "keel")
    K.bisect_keep(keel, [((0, 0, 1), 0.0)])
    K.uv_smart(keel, K.tile_mm("metal_beadblast"))
    K.set_normals(keel.data, K.field_corner_normals(keel.data, FT, "keel"))
    K.assign(keel, "metal_beadblast")
    return K.join([band, under, plate, keel], "tray")


def duplicate(obj, name):
    c = obj.copy()
    c.data = obj.data.copy()
    c.name = c.data.name = name
    bpy.context.scene.collection.objects.link(c)
    return c


bpy.ops.wm.read_factory_settings(use_empty=True)
outputs = {}
for lod, cfg in LODS.items():
    parts = {"femoral_mirai": femoral(cfg), "insert_mirai_ps": insert(cfg), "tray_mirai": tray(cfg, lod)}
    for name, obj in parts.items():
        solo = duplicate(obj, name)
        K.to_metres(solo)
        print(f"[{name}_{lod}] {K.tri_count(solo)} tris")
        K.export_glb(solo, BUILD / f"{name}_{lod}.glb")
        outputs[f"{name}_{lod}"] = BUILD / f"{name}_{lod}.glb"
        bpy.data.objects.remove(solo)
    # assembly, knee in extension
    pieces = []
    for name, node in (("tray_mirai", "tray"), ("insert_mirai_ps", "insert"), ("femoral_mirai", "femoral")):
        o = duplicate(parts[name], node)
        if node == "insert":                                   # underside sits on the tray
            c = K.face_centres(o.data)
            K.delete_faces(o, c[:, 2] < INSERT_BASE + 0.3)
        if node == "femoral":
            K.set_co(o.data, K.get_co(o.data) + FEMUR_IN_TIBIA)
        K.to_metres(o)
        pieces.append(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in pieces:
        o.select_set(True)
    path = BUILD / f"tka_mirai_{lod}.glb"
    bpy.ops.export_scene.gltf(filepath=str(path), use_selection=True, export_format="GLB",
                              export_yup=True, export_normals=True, export_texcoords=True)
    print(f"[tka_mirai_{lod}] {sum(K.tri_count(o) for o in pieces)} tris")
    outputs[f"tka_mirai_{lod}"] = path
    for o in pieces + list(parts.values()):
        bpy.data.objects.remove(o)

if RENDER:
    K.render_shots(
        {k: v for k, v in outputs.items() if k.endswith("lod0")},
        {
            "femoral": ("femoral_mirai_lod0", (0, 0, 0.018), (0.45, 0.75, -0.5), 0.3),
            "femoral_inner": ("femoral_mirai_lod0", (0, 0, 0.018), (-0.4, -0.5, 0.75), 0.3),
            "insert": ("insert_mirai_ps_lod0", (0, 0, 0.01), (0.4, 0.7, 0.6), 0.28),
            "tray": ("tray_mirai_lod0", (0, 0, -0.01), (0.5, 0.7, 0.4), 0.33),
            "tka": ("tka_mirai_lod0", (0, 0, 0.012), (0.55, 0.8, 0.15), 0.42),
            "tka_side": ("tka_mirai_lod0", (0, 0, 0.012), (1, 0.05, 0.1), 0.42),
        },
        ROOT / "renders",
    )
