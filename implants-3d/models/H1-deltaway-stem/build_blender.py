"""Reference meshes -> clean web GLBs (two LODs) + review renders.

blender -b --factory-startup -P build_blender.py -- <model_dir> [--no-render]

Per surface (polished metal, satin metal, coating):
  1. voxel remesh at the LOD's edge length: uniform quads, no slivers
  2. delete every face nobody can see (metal under the coating, the neck end inside the collar,
     the hollow's internal caps)
  3. snap vertices onto the exact SDF surface, relax tangentially, snap again
  4. shading normals = SDF gradient, so reflections follow the true curvature
The coating is then cut with the two band planes (an exact, straight edge loop) and given a
0.5 mm step wall. The 12/14 trunnion with its collar and relief groove is a lathe with analytic
normals. UVs are in millimetres (cylindrical about the stem axis for coating and satin, so the
satin lines run along the stem); materials come from ../../materials.
"""
import bpy, bmesh, sys, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT))
from stem_params import *  # noqa: E402

BUILD = ROOT / "build"
MATLIB = ROOT.parents[1] / "materials"
LIB = json.loads((MATLIB / "materials.json").read_text(encoding="utf-8"))
HDR = Path(r"E:\Palarmus\palarmus-web\public\models\tex\studio.hdr")
RENDER = "--no-render" not in sys.argv

# edge length per surface (mm) and lathe segments, per LOD
LODS = {
    "lod0": dict(polished=0.62, satin=1.0, coat=0.95, lathe=64),
    "lod1": dict(polished=1.25, satin=2.0, coat=1.6, lathe=32),
}
WALL_DEPTH = COAT + 0.3   # the step wall reaches 0.3 mm below the bare metal

FIELDS = np.load(BUILD / "fields.npz")
F_LO, F_VOX = FIELDS["lo"].astype(np.float64), float(FIELDS["vox"])
GRID = {"metal": FIELDS["metal"].astype(np.float32), "coat": FIELDS["coat"].astype(np.float32)}


# ---------------------------------------------------------------------------------------
# field sampling
def sample(grid, p):
    g = (p - F_LO) / F_VOX
    i0 = np.clip(np.floor(g).astype(int), 0, np.array(grid.shape) - 2)
    t = np.clip(g - i0, 0, 1)
    out = np.zeros(len(p))
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (t[:, 0] if dx else 1 - t[:, 0]) * (t[:, 1] if dy else 1 - t[:, 1]) * (t[:, 2] if dz else 1 - t[:, 2])
                out += w * grid[i0[:, 0] + dx, i0[:, 1] + dy, i0[:, 2] + dz]
    return out


def gradient(grid, p):
    h = F_VOX
    return np.stack([sample(grid, p + e) - sample(grid, p - e) for e in np.eye(3) * h], 1) / (2 * h)


def unit(v):
    return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-12)


# ---------------------------------------------------------------------------------------
# mesh helpers
def get_co(me):
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


def set_co(me, co):
    me.vertices.foreach_set("co", co.ravel())
    me.update()


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def snap(me, grid, iters=4):
    p = get_co(me)
    for _ in range(iters):
        f = sample(grid, p)
        g = gradient(grid, p)
        p -= (f / (np.sum(g * g, 1) + 1e-9))[:, None] * g
    set_co(me, p)


def relax(me, grid, rounds=3, k=0.5):
    """Tangential Laplacian smoothing + snap: evens out the voxel-remesh quads."""
    e = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", e)
    e = e.reshape(-1, 2)
    nv = len(me.vertices)
    deg = np.bincount(e.ravel(), minlength=nv).astype(float)
    bm = bmesh.new()
    bm.from_mesh(me)
    fixed = np.array([v.is_boundary for v in bm.verts])   # open edges stay put
    bm.free()
    for _ in range(rounds):
        p = get_co(me)
        acc = np.zeros_like(p)
        np.add.at(acc, e[:, 0], p[e[:, 1]])
        np.add.at(acc, e[:, 1], p[e[:, 0]])
        d = acc / np.maximum(deg, 1)[:, None] - p
        n = unit(gradient(grid, p))
        d -= np.sum(d * n, 1)[:, None] * n
        d[fixed] = 0
        set_co(me, p + k * d)
        snap(me, grid, 2)


def delete_faces(obj, mask):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.where(mask)[0]], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()


def face_centres(me):
    c = np.empty(len(me.polygons) * 3)
    me.polygons.foreach_get("center", c)
    return c.reshape(-1, 3)


def import_remeshed(name, voxel):
    bpy.ops.wm.ply_import(filepath=str(BUILD / f"{name}_hi.ply"))
    obj = bpy.context.selected_objects[0]
    select_only(obj)
    obj.data.remesh_voxel_size = voxel
    obj.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()
    return obj


def corner_normals(me, grid, flat_faces=None):
    """Per-corner normals: SDF gradient, or the flat face normal on faces marked in flat_faces."""
    n_v = unit(gradient(grid, get_co(me)))
    vi = np.empty(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", vi)
    fn = np.empty(len(me.polygons) * 3)
    me.polygons.foreach_get("normal", fn)
    fn = fn.reshape(-1, 3)
    sizes = np.empty(len(me.polygons), dtype=np.int64)
    me.polygons.foreach_get("loop_total", sizes)
    lf = np.repeat(np.arange(len(me.polygons)), sizes)
    ln = n_v[vi]
    if flat_faces is not None:
        ln = np.where(flat_faces[lf][:, None], fn[lf], ln)
    return ln


# ---------------------------------------------------------------------------------------
# UVs, all in millimetres of surface divided by the material's tile size
def ramanujan(a, b):
    return math.pi * (3 * (a + b) - np.sqrt((3 * a + b) * (a + 3 * b)))


def cylindrical_uv(me, tile_mm):
    """u = arc length around the body section, v = height. Seam on the lateral side."""
    p = get_co(me)
    xl, xm, t, _ = body_profile(p[:, 2])
    cx = (xl + xm) / 2
    theta = np.arctan2(p[:, 1], p[:, 0] - cx)                 # 0 medial, +-pi lateral
    rad = ramanujan((xm - xl) / 2, t / 2) / (2 * math.pi)
    vi = np.empty(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", vi)
    th = theta[vi].copy()
    for poly in me.polygons:                                  # unwrap faces straddling the seam
        sl = slice(poly.loop_start, poly.loop_start + poly.loop_total)
        if th[sl].max() - th[sl].min() > math.pi:
            seg = th[sl]
            seg[seg < 0] += 2 * math.pi
            th[sl] = seg
    uv = me.uv_layers.new(name="UVMap")
    uv.data.foreach_set("uv", np.stack([th * rad[vi] / tile_mm, p[vi, 2] / tile_mm], 1).ravel())


def smart_uv(obj, tile_mm):
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.002, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    uvl = bm.loops.layers.uv.active
    a3 = auv = 0.0
    for f in bm.faces:
        a3 += f.calc_area()
        q = [l[uvl].uv for l in f.loops]
        auv += abs(sum(q[i].x * q[i - 1].y - q[i - 1].x * q[i].y for i in range(len(q)))) / 2
    k = math.sqrt(a3 / auv) / tile_mm
    for f in bm.faces:
        for l in f.loops:
            l[uvl].uv *= k
    bm.to_mesh(obj.data)
    bm.free()


# ---------------------------------------------------------------------------------------
# materials from the shared library
def material(key):
    spec = LIB[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*spec.get("base_color", [1, 1, 1]), 1)

    def img(name, non_color):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(str(MATLIB / key / f"{name}.png"))
        n.image.name = f"{key}_{name}"
        if non_color:
            n.image.colorspace_settings.name = "Non-Color"
        return n

    if "basecolor" in spec["maps"]:
        nt.links.new(img("basecolor", False).outputs["Color"], bsdf.inputs["Base Color"])
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(img("orm", True).outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = spec.get("normal_scale", 1.0)
    nt.links.new(img("normal", True).outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    if key == "ti_plasma_spray":
        # the glTF exporter reads occlusion from a group node named "glTF Material Output"
        grp = bpy.data.node_groups.get("glTF Material Output")
        if grp is None:
            grp = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
            grp.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        g = nt.nodes.new("ShaderNodeGroup")
        g.node_tree = grp
        nt.links.new(sep.outputs["Red"], g.inputs["Occlusion"])
    return m


# ---------------------------------------------------------------------------------------
# parts
def build_metal(name, voxel, mat):
    obj = import_remeshed(name, voxel)
    c = face_centres(obj.data)
    hidden = band_distance(c) < -0.6                     # under the coating, and the hollow's caps
    s, r = neck_frame(c)
    with np.errstate(invalid="ignore"):
        hidden |= r < lathe_radius(s) - 0.4              # well inside the turned collar (ragged edge stays hidden)
    hidden |= s > S_NECK_END - 0.05                      # the neck's end cap
    delete_faces(obj, hidden)
    relax(obj.data, GRID["metal"])
    if mat == "ti_satin":
        cylindrical_uv(obj.data, LIB[mat]["tile_mm"])    # lines along the stem
    else:
        smart_uv(obj, LIB[mat]["tile_mm"])
    obj.data.normals_split_custom_set([tuple(v) for v in corner_normals(obj.data, GRID["metal"])])
    obj.data.materials.append(MATS[mat])
    return obj


def build_coat(voxel):
    obj = import_remeshed("coat", voxel)
    relax(obj.data, GRID["coat"])
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    # exact coating edge: cut the (over-long) slab with both band planes, keep the inside
    for n, d in BAND_PLANES:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-4,
                               plane_co=Vector(n * d), plane_no=Vector(n), clear_outer=True)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=0.02)
    bm.verts.ensure_lookup_table()
    # step wall: from every boundary edge straight down into the metal, lying in the band plane
    boundary = [e for e in bm.edges if e.is_boundary]
    bverts = list({v for e in boundary for v in e.verts})
    pts = np.array([v.co[:] for v in bverts])
    nrm = unit(gradient(GRID["coat"], pts))
    top, bot, plane_of = {}, {}, {}
    for v, p, nv in zip(bverts, pts, nrm):
        pn, pd = min(BAND_PLANES, key=lambda pl: abs(p @ pl[0] - pl[1]))
        m = unit(nv - (nv @ pn) * pn)
        top[v] = bm.verts.new(Vector(p))
        bot[v] = bm.verts.new(Vector(p - m * WALL_DEPTH))
        plane_of[v] = Vector(pn)
    wall_verts = set(top.values()) | set(bot.values())
    for e in boundary:
        a, b = e.verts
        f = bm.faces.new((top[a], top[b], bot[b], bot[a]))
        f.normal_update()
        if f.normal.dot(plane_of[a]) < 0:                 # face out of the band
            f.normal_flip()
    bm.faces.index_update()
    flat = np.array([all(v in wall_verts for v in f.verts) for f in bm.faces])
    bm.to_mesh(obj.data)
    bm.free()
    cylindrical_uv(obj.data, LIB["ti_plasma_spray"]["tile_mm"])
    obj.data.normals_split_custom_set([tuple(v) for v in corner_normals(obj.data, GRID["coat"], flat)])
    obj.data.materials.append(MATS["ti_plasma_spray"])
    return obj


def build_lathe(segments):
    d = NECK_DIR
    e1 = np.array([d[2], 0.0, -d[0]])       # in the CCD plane, perpendicular to the neck axis
    e2 = np.array([0.0, 1.0, 0.0])
    prof = LATHE_PROFILE[:-1]                # the last point is on the axis: closed by a flat cap
    ns = len(prof)
    seg_n = []                               # outward (s, r) normal of each profile segment
    for i in range(ns - 1):
        (s0, r0), (s1, r1) = prof[i], prof[i + 1]
        v = np.array([-(r1 - r0), s1 - s0])
        seg_n.append(v / np.linalg.norm(v))
    th = np.linspace(0, 2 * math.pi, segments, endpoint=False)
    radial = np.cos(th)[:, None] * e1 + np.sin(th)[:, None] * e2
    bm = bmesh.new()
    rings = [[bm.verts.new(HEAD + s * d + r * radial[k]) for k in range(segments)] for s, r in prof]
    cn, uv = [], []
    for i in range(ns - 1):
        for k in range(segments):
            k1 = (k + 1) % segments
            f = bm.faces.new((rings[i][k], rings[i][k1], rings[i + 1][k1], rings[i + 1][k]))
            for pi, kk, tk in ((i, k, th[k]), (i, k1, th[k1] if k1 else 2 * math.pi),
                               (i + 1, k1, th[k1] if k1 else 2 * math.pi), (i + 1, k, th[k])):
                if pi in LATHE_SHARP or pi in (0, ns - 1):
                    nsr = seg_n[i]                   # crease: this face's own normal
                else:
                    nsr = unit(seg_n[pi - 1] + seg_n[pi])
                cn.append(nsr[0] * d + nsr[1] * radial[kk])
                uv.append((tk * 6.5, prof[pi][0]))
    bm.faces.new(rings[-1])
    me = bpy.data.meshes.new("lathe")
    bm.to_mesh(me)
    bm.free()
    cap = me.polygons[-1]
    if Vector(cap.normal).dot(Vector(d)) < 0:
        cap.flip()
    tip = HEAD + S_TIP * d
    for li in range(cap.loop_start, cap.loop_start + cap.loop_total):
        p = np.array(me.vertices[me.loops[li].vertex_index].co) - tip
        cn.append(d.copy())
        uv.append((p @ e1, p @ e2))
    tile = LIB["ti_polished"]["tile_mm"]
    me.uv_layers.new(name="UVMap").data.foreach_set("uv", (np.array(uv) / tile).ravel())
    me.normals_split_custom_set([tuple(v) for v in cn])
    me.materials.append(MATS["ti_polished"])
    obj = bpy.data.objects.new("lathe", me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def finish(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = obj.data.name = name
    set_co(obj.data, (get_co(obj.data) - HEAD) * 0.001)   # origin at the head centre, metres
    return obj


# ---------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {k: material(k) for k in ("ti_polished", "ti_satin", "ti_plasma_spray")}
lods = {}
for lod, cfg in LODS.items():
    parts = {
        "polished": build_metal("polished", cfg["polished"], "ti_polished"),
        "satin": build_metal("satin", cfg["satin"], "ti_satin"),
        "coat": build_coat(cfg["coat"]),
        "lathe": build_lathe(cfg["lathe"]),
    }
    counts = {k: tri_count(o) for k, o in parts.items()}
    obj = finish(list(parts.values()), f"DeltaWay_stem_4_{lod}")
    print(f"[{obj.name}] {tri_count(obj)} tris  {counts}")
    select_only(obj)
    bpy.ops.export_scene.gltf(
        filepath=str(BUILD / f"deltaway_stem_{lod}.glb"), use_selection=True, export_format="GLB",
        export_yup=True, export_normals=True, export_texcoords=True,
    )
    lods[lod] = obj

if RENDER:
    # render what ships: re-import the exported GLBs
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    for lod in LODS:
        bpy.ops.import_scene.gltf(filepath=str(BUILD / f"deltaway_stem_{lod}.glb"))
        lods[lod] = [o for o in bpy.context.selected_objects if o.type == "MESH"][0]
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 900, 1200
    scene.render.film_transparent = True
    world = bpy.data.worlds.new("studio")
    world.use_nodes = True
    env = world.node_tree.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(str(HDR))
    world.node_tree.links.new(env.outputs["Color"], world.node_tree.nodes["Background"].inputs["Color"])
    scene.world = world
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 85
    scene.collection.objects.link(cam)
    scene.camera = cam
    shots = {   # (lod, target m, view direction, distance m)
        "hero": ("lod0", (-0.035, 0, -0.065), (0.32, -0.9, 0.12), 0.42),
        "back": ("lod0", (-0.035, 0, -0.065), (-0.4, 0.9, 0.1), 0.42),
        "detail": ("lod0", (-0.014, 0, -0.022), (0.45, -0.85, 0.35), 0.15),
        "mobile_detail": ("lod1", (-0.014, 0, -0.022), (0.45, -0.85, 0.35), 0.15),
    }
    for shot, (lod, tgt, dvec, dist) in shots.items():
        for o in lods.values():
            o.hide_render = o is not lods[lod]
        dvec = Vector(dvec).normalized()
        cam.location = Vector(tgt) + dvec * dist
        cam.rotation_euler = (-dvec).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(ROOT / "renders" / f"render_{shot}.png")
        bpy.ops.render.render(write_still=True)
