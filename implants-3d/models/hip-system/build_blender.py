"""Hip cups, liner, heads + total hip assemblies -> GLBs (LOD0/LOD1) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render]

Parts (local frame: origin at the bearing centre, +Z to the dome pole):
  cup_apex_tps_52      turned part (band, rim, seat + notches, ledge) as a structured sweep;
                       inner dome with holes from the SDF, trimmed at the ledge plane; coating
                       from the SDF, cut at the band plane with a step wall
  cup_apex_3dtf_52     the same cup with the trabecular coating (Apex 3D TF)
  cup_chemi_52         C-Hemi cemented all-poly cup: one structured sweep (cement grooves as profile
                       steps / doubled columns) + the X-ray marker wire as a tube
  liner_apex_xpe_32_52 structured sweep: hooded face, 12 tabs as crisp doubled columns
  head_ceramic_32      lathe, BIOLOX-style ceramic
  head_metal_32        lathe, CoCr
Assemblies (stem frame, origin at the head centre, one node per part):
  tha_* (TPS cup), tha_tf_* (3D TF cup) = DeltaWay 4# + head + liner + cup; hybrid_* = DeltaWay
  + head + C-Hemi; revision_* / revision_tf_* = Revistem M (H8) + head + liner + TPS / 3D TF
  cup. Cups coaxial with the neck, hood superior. Contact surfaces nobody can see
  are removed per assembly (cup seat under the liner, liner bearing and head under each other,
  head bore and the trunnion inside it); the liner's back stays where it shows through the
  screw holes.
"""
import bpy, sys, math
import numpy as np
from pathlib import Path

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1] / "tools"))
sys.path.insert(0, str(ROOT.parent / "H1-deltaway-stem"))
sys.path.insert(0, str(ROOT.parent / "H8-revistem"))
import blender_kit as K       # noqa: E402
from hip_params import *      # noqa: E402,F401
import stem_params as S       # noqa: E402
import revistem_params as RV  # noqa: E402

BUILD = ROOT / "build"
# stem -> (GLB per LOD: metres, origin at the head centre; neck axis in the stem frame)
STEMS = {
    "deltaway": (ROOT.parent / "H1-deltaway-stem" / "build" / "deltaway_stem_{lod}.glb", S.NECK_DIR),
    "revistem": (ROOT.parent / "H8-revistem" / "build" / "revistem_m_20x70_16x190_{lod}.glb", RV.NECK_DIR),
}
RENDER = "--no-render" not in sys.argv
F = K.Fields(BUILD / "fields.npz")

LODS = {
    "lod0": dict(metal=0.75, coat=1.1, phi=144, arc=24, head_seg=80, head_arc=1.0, wire_seg=8),
    "lod1": dict(metal=1.5, coat=2.2, phi=64, arc=10, head_seg=40, head_arc=0.5, wire_seg=5),
}


def cup(cfg, coat_mat="ti_plasma_spray"):
    # turned part (band, rim face, seat with notches, ledge): structured, crisp edges
    turned = K.swept(cup_turned_columns(cfg["phi"]), (0, 0, 0), (0, 0, 1), (1, 0, 0), "ti_polished",
                     name="cup_turned", uv_radius=24.0)
    # inner dome + holes: SDF, trimmed exactly at the ledge plane where the turned part takes over
    dome = K.remeshed_surface(BUILD / "cup_metal_hi.ply", cfg["metal"], F, "cup_metal",
                              hidden=lambda c: F.sample("cup_coat_exact", c) < -0.3)
    K.bisect_keep(dome, [((0, 0, -1), -DOME_CUT_Z)])
    K.uv_polar(dome.data, K.tile_mm("ti_polished"), (0, 0, 0), (0, 0, 1), (1, 0, 0))
    K.set_normals(dome.data, K.field_corner_normals(dome.data, F, "cup_metal"))
    K.assign(dome, "ti_polished")

    coat = K.remeshed_surface(BUILD / "cup_coat_hi.ply", cfg["coat"], F, "cup_coat",
                              hidden=lambda c: F.sample("cup_metal", c) < -0.25)
    flat = K.cut_with_wall(coat, F, "cup_coat", [((0, 0, -1), -RIM_BAND_H)], depth=CUP_COAT + 0.3)
    K.uv_polar(coat.data, K.tile_mm(coat_mat), (0, 0, 0), (0, 0, 1), (1, 0, 0))
    K.set_normals(coat.data, K.field_corner_normals(coat.data, F, "cup_coat", flat))
    K.assign(coat, coat_mat)
    return K.join([turned, dome, coat], "cup")


def chemi(cfg):
    body = K.swept(chemi_columns(cfg["phi"], cfg["arc"]), (0, 0, 0), (0, 0, 1), (1, 0, 0), "uhmwpe",
                   name="chemi", uv_radius=20.0)
    wire = K.tube(chemi_wire_path(cfg["phi"]), CH_WIRE_R, "ti_satin", segments=cfg["wire_seg"],
                  closed=True, name="chemi_wire")
    return K.join([body, wire], "cup")


def liner(cfg):
    obj = K.swept(liner_columns(cfg["phi"], cfg["arc"]), (0, 0, 0), (0, 0, 1), (1, 0, 0), "uhmwpe",
                  name="liner", uv_radius=20.0)
    return obj


def head(cfg, mat):
    prof = head_profile()
    # thin the sphere arc for LOD1 (keep the bore/base corners)
    if cfg["head_arc"] < 1:
        keep = set(range(11)) | {len(prof) - 1}
        prof = [p for i, p in enumerate(prof) if i in keep or i % int(round(1 / cfg["head_arc"])) == 0]
    return K.lathe(prof, (0, 0, 0), (0, 0, 1), (1, 0, 0), cfg["head_seg"], mat, sharp=HEAD_SHARP, name="head")


def stem(name, lod):
    bpy.ops.import_scene.gltf(filepath=str(STEMS[name][0]).format(lod=lod))
    obj = [o for o in bpy.context.selected_objects if o.type == "MESH"][0]
    obj.name = "stem"
    return obj


def duplicate(obj, name):
    c = obj.copy()
    c.data = obj.data.copy()
    c.name = c.data.name = name
    bpy.context.scene.collection.objects.link(c)
    return c


# ---- faces an assembly hides (contact surfaces), in the parts' shared local frame ----------
def hole_axes():
    out = []
    for polar, azim in SCREW_HOLES:
        th, ph = np.radians(polar), np.radians(azim)
        out.append((np.array([np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.cos(th)]), SCREW_SINK_R + 1.5))
    out.append((np.array([0.0, 0.0, 1.0]), APEX_R + 1.5))
    return out


def near_hole(c):
    m = np.zeros(len(c), dtype=bool)
    for d, rad in hole_axes():
        s = c @ d
        m |= np.linalg.norm(c - s[:, None] * d, axis=1) < rad
    return m


def chemi_bearing_end(c):
    """z where the C-Hemi bearing ends, at each point's azimuth (the hood makes it vary)."""
    phi = np.arctan2(c[:, 1], c[:, 0])
    return np.array([chemi_face_z(LINER_IN_R + 0.5, p) + 1.0 for p in phi])


def hidden_in_assembly(name, c, cemented=False):
    r = np.linalg.norm(c, axis=1)
    rho = np.linalg.norm(c[:, :2], axis=1)
    bore = (rho < 7.6) & (c[:, 2] > HEAD_BASE_S + 1.5)
    if cemented:                             # C-Hemi: the head fills its bearing, no liner
        if name == "cup":
            return np.abs(r - LINER_IN_R) < 0.15
        if name == "head":
            return (c[:, 2] > chemi_bearing_end(c) + 0.3) | bore
        return np.zeros(len(c), dtype=bool)
    if name == "cup":                        # inner seat + dome: the liner sits on it
        return np.abs(F.sample("liner", c)) < 0.3
    if name == "liner":
        on_head = (np.abs(r - LINER_IN_R) < 0.3) & (F.sample("liner", c * (r - 0.4)[:, None] / r[:, None]) > 0)
        in_cup = (F.sample("cup_metal", c) < 0.3) & (c[:, 2] > 0.3) & ~near_hole(c)   # seen through holes
        return on_head | in_cup
    if name == "head":                       # bearing inside the liner, and the bore (trunnion fills it)
        push = c + 0.3 * c / np.maximum(r, 1e-9)[:, None]
        return (F.sample("liner", push) < 0) | bore
    return np.zeros(len(c), dtype=bool)


def hide_stem_in_head(obj, neck_dir):
    """Stem faces inside the head bore (the trunnion past the bore entry)."""
    c = K.face_centres(obj.data) * 1000.0           # stem GLB: metres, origin at the head centre
    s = c @ np.asarray(neck_dir)
    rad = np.linalg.norm(c - s[:, None] * np.asarray(neck_dir), axis=1)
    K.delete_faces(obj, (s > HEAD_BASE_S + 1.5) & (rad < 7.6))


def to_stem(neck_dir):
    """Local part frame -> stem frame: +Z along the neck axis, hood (+Y) superior."""
    z_l = np.asarray(neck_dir, dtype=float)
    y_l = np.array([-z_l[2], 0.0, z_l[0]])      # in the CCD plane, pointing superior-lateral
    x_l = np.cross(y_l, z_l)
    return np.stack([x_l, y_l, z_l], 1)


# assembly -> (stem, cup, liner); a cemented cup carries the bearing itself
ASSEMBLIES = {
    "tha": ("deltaway", "cup_apex_tps_52", "liner_apex_xpe_32_52"),       # H1 + H5 + H4 + head
    "tha_tf": ("deltaway", "cup_apex_3dtf_52", "liner_apex_xpe_32_52"),   # H1 + H6 + H4 + head
    "hybrid": ("deltaway", "cup_chemi_52", None),                        # H1 + H7 + head
    "revision": ("revistem", "cup_apex_tps_52", "liner_apex_xpe_32_52"),  # H8 + H5 + H4 + head
    "revision_tf": ("revistem", "cup_apex_3dtf_52", "liner_apex_xpe_32_52"),  # H8 + H6 + H4 + head
}

bpy.ops.wm.read_factory_settings(use_empty=True)
outputs = {}
for lod, cfg in LODS.items():
    parts = {
        "cup_apex_tps_52": cup(cfg),
        "cup_apex_3dtf_52": cup(cfg, "ti_trabecular"),
        "cup_chemi_52": chemi(cfg),
        "liner_apex_xpe_32_52": liner(cfg),
        "head_ceramic_32": head(cfg, "ceramic_biolox"),
        "head_metal_32": head(cfg, "cocr_polished"),
    }
    # standalone parts, in their local frame (metres)
    for name, obj in parts.items():
        solo = duplicate(obj, name)
        K.to_metres(solo)
        print(f"[{name}_{lod}] {K.tri_count(solo)} tris")
        K.export_glb(solo, BUILD / f"{name}_{lod}.glb")
        outputs[f"{name}_{lod}"] = BUILD / f"{name}_{lod}.glb"
        bpy.data.objects.remove(solo)
    # assemblies
    for asm, bearing in [(a, b) for a in ASSEMBLIES for b in ("ceramic", "metal")]:
        stem_name, cup_part, liner_part = ASSEMBLIES[asm]
        cemented = liner_part is None
        neck_dir = STEMS[stem_name][1]
        s = stem(stem_name, lod)
        hide_stem_in_head(s, neck_dir)
        pieces = [s]
        for name, part_name in (("head", f"head_{bearing}_32"), ("liner", liner_part), ("cup", cup_part)):
            if part_name is None:
                continue
            o = duplicate(parts[part_name], name)
            K.delete_faces(o, hidden_in_assembly(name, K.face_centres(o.data), cemented))
            K.to_metres(o, matrix=to_stem(neck_dir))
            pieces.append(o)
        bpy.ops.object.select_all(action="DESELECT")
        for o in pieces:
            o.select_set(True)
        key = f"{asm}_{bearing}_{lod}"
        path = BUILD / f"{key}.glb"
        bpy.ops.export_scene.gltf(filepath=str(path), use_selection=True, export_format="GLB",
                                  export_yup=True, export_normals=True, export_texcoords=True)
        print(f"[{key}] {sum(K.tri_count(o) for o in pieces)} tris")
        outputs[key] = path
        for o in pieces:
            bpy.data.objects.remove(o)
    for obj in parts.values():
        bpy.data.objects.remove(obj)

if RENDER:
    K.render_shots(
        {k: v for k, v in outputs.items() if k.endswith("lod0") or k == "tha_ceramic_lod1"},
        {
            "cup": ("cup_apex_tps_52_lod0", (0, 0, 0.008), (0.55, -0.6, -0.55), 0.24),
            "cup_top": ("cup_apex_tps_52_lod0", (0, 0, 0.01), (0.3, -0.5, 0.8), 0.24),
            "cup_3dtf": ("cup_apex_3dtf_52_lod0", (0, 0, 0.008), (0.55, -0.6, -0.55), 0.24),
            "cup_3dtf_top": ("cup_apex_3dtf_52_lod0", (0, 0, 0.01), (0.3, -0.5, 0.8), 0.24),
            "cup_chemi": ("cup_chemi_52_lod0", (0, 0, 0.006), (0.55, -0.6, -0.55), 0.24),
            "cup_chemi_top": ("cup_chemi_52_lod0", (0, 0, 0.01), (0.3, -0.5, 0.8), 0.24),
            "tha_tf_ceramic": ("tha_tf_ceramic_lod0", (-0.02, 0, -0.05), (0.35, -0.9, 0.15), 0.55),
            "hybrid_metal": ("hybrid_metal_lod0", (-0.02, 0, -0.05), (0.35, -0.9, 0.15), 0.55),
            "revision_metal": ("revision_metal_lod0", (-0.02, 0, -0.13), (0.35, -0.9, 0.15), 1.05),
            "revision_tf_ceramic": ("revision_tf_ceramic_lod0", (-0.02, 0, -0.13), (-0.35, -0.9, 0.15), 1.05),
            "liner": ("liner_apex_xpe_32_52_lod0", (0, 0, 0.004), (0.5, -0.7, -0.5), 0.22),
            "head_ceramic": ("head_ceramic_32_lod0", (0, 0, 0), (0.5, -0.8, -0.35), 0.15),
            "head_metal": ("head_metal_32_lod0", (0, 0, 0), (0.5, -0.8, -0.35), 0.15),
            "tha_ceramic": ("tha_ceramic_lod0", (-0.02, 0, -0.05), (0.35, -0.9, 0.15), 0.55),
            "tha_metal": ("tha_metal_lod0", (-0.02, 0, -0.05), (-0.35, -0.9, 0.15), 0.55),
            "tha_ceramic_mobile": ("tha_ceramic_lod1", (-0.02, 0, -0.05), (0.35, -0.9, 0.15), 0.55),
        },
        ROOT / "renders",
    )
