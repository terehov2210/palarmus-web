"""Blender-side toolkit for implant models (runs inside Blender's Python).

Everything a model's build_blender.py needs to turn SDF reference meshes into clean web geometry:
uniform remesh, removal of hidden faces, snapping to the exact surface, coating edges cut by
planes with a step wall, lathe parts with analytic normals, millimetre UVs, shared materials,
LOD export and Cycles review renders. See PIPELINE.md for why each step exists.
"""
import bpy, bmesh, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector

KIT = Path(__file__).parent
MATLIB = KIT.parent / "materials"
LIB = json.loads((MATLIB / "materials.json").read_text(encoding="utf-8"))
HDR = Path(r"E:\Palarmus\palarmus-web\public\models\tex\studio.hdr")
BLENDER_TRI = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)  # noqa: E731


# ---------------------------------------------------------------------------------------
# fields
class Fields:
    def __init__(self, npz):
        f = np.load(npz)
        self.lo, self.vox = f["lo"].astype(np.float64), float(f["vox"])
        self.grids = {k: f[k].astype(np.float32) for k in f.files if k not in ("lo", "vox")}

    def sample(self, name, p):
        grid = self.grids[name]
        g = (p - self.lo) / self.vox
        i0 = np.clip(np.floor(g).astype(int), 0, np.array(grid.shape) - 2)
        t = np.clip(g - i0, 0, 1)
        out = np.zeros(len(p))
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    w = ((t[:, 0] if dx else 1 - t[:, 0]) * (t[:, 1] if dy else 1 - t[:, 1])
                         * (t[:, 2] if dz else 1 - t[:, 2]))
                    out += w * grid[i0[:, 0] + dx, i0[:, 1] + dy, i0[:, 2] + dz]
        return out

    def gradient(self, name, p):
        h = self.vox
        return np.stack([self.sample(name, p + e) - self.sample(name, p - e) for e in np.eye(3) * h], 1) / (2 * h)


def unit(v):
    return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-12)


# ---------------------------------------------------------------------------------------
# mesh helpers
def get_co(me):
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


def set_co(me, co):
    me.vertices.foreach_set("co", np.ascontiguousarray(co).ravel())
    me.update()


def loop_vertex_index(me):
    vi = np.empty(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", vi)
    return vi


def loop_face_index(me):
    sizes = np.empty(len(me.polygons), dtype=np.int64)
    me.polygons.foreach_get("loop_total", sizes)
    return np.repeat(np.arange(len(me.polygons)), sizes)


def face_centres(me):
    c = np.empty(len(me.polygons) * 3)
    me.polygons.foreach_get("center", c)
    return c.reshape(-1, 3)


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def tri_count(obj):
    return BLENDER_TRI(obj)


def import_remeshed(ply, voxel):
    """Import a reference mesh and voxel-remesh it: uniform quads at `voxel` mm."""
    bpy.ops.wm.ply_import(filepath=str(ply))
    obj = bpy.context.selected_objects[0]
    select_only(obj)
    obj.data.remesh_voxel_size = voxel
    obj.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()
    return obj


def snap(me, F, name, iters=4):
    p = get_co(me)
    for _ in range(iters):
        f = F.sample(name, p)
        g = F.gradient(name, p)
        p -= (f / (np.sum(g * g, 1) + 1e-9))[:, None] * g
    set_co(me, p)


def relax(me, F, name, rounds=3, k=0.5):
    """Tangential Laplacian smoothing + snap: evens out the voxel-remesh quads."""
    e = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", e)
    e = e.reshape(-1, 2)
    deg = np.bincount(e.ravel(), minlength=len(me.vertices)).astype(float)
    bm = bmesh.new()
    bm.from_mesh(me)
    fixed = np.array([v.is_boundary for v in bm.verts])     # open edges stay put
    bm.free()
    for _ in range(rounds):
        p = get_co(me)
        acc = np.zeros_like(p)
        np.add.at(acc, e[:, 0], p[e[:, 1]])
        np.add.at(acc, e[:, 1], p[e[:, 0]])
        d = acc / np.maximum(deg, 1)[:, None] - p
        n = unit(F.gradient(name, p))
        d -= np.sum(d * n, 1)[:, None] * n
        d[fixed] = 0
        set_co(me, p + k * d)
        snap(me, F, name, 2)


def delete_faces(obj, mask):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.where(mask)[0]], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()


def keep_largest_parts(obj, min_faces=50):
    """Drop marching-cubes crumbs (tiny disconnected islands)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    seen, kill = set(), []
    for f in bm.faces:
        if f in seen:
            continue
        stack, island = [f], []
        seen.add(f)
        while stack:
            g = stack.pop()
            island.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in seen:
                        seen.add(h)
                        stack.append(h)
        if len(island) < min_faces:
            kill += island
    if kill:
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()


def remeshed_surface(ply, voxel, F, field, hidden=None):
    """The standard surface recipe: remesh -> delete hidden faces -> relax + snap."""
    obj = import_remeshed(ply, voxel)
    if hidden is not None:
        delete_faces(obj, hidden(face_centres(obj.data)))
    keep_largest_parts(obj)
    relax(obj.data, F, field)
    return obj


# ---------------------------------------------------------------------------------------
# normals
def field_corner_normals(me, F, name, flat_faces=None):
    """Per-corner normals from the SDF gradient; flat face normals on faces in flat_faces."""
    n_v = unit(F.gradient(name, get_co(me)))
    fn = np.empty(len(me.polygons) * 3)
    me.polygons.foreach_get("normal", fn)
    fn = fn.reshape(-1, 3)
    lf = loop_face_index(me)
    ln = n_v[loop_vertex_index(me)]
    if flat_faces is not None:
        ln = np.where(flat_faces[lf][:, None], fn[lf], ln)
    return ln


def set_normals(me, corner_normals):
    me.normals_split_custom_set([tuple(v) for v in corner_normals])


# ---------------------------------------------------------------------------------------
# coating edge
def cut_with_wall(obj, F, field, planes, depth, merge=0.02):
    """Cut a surface with planes (keep n.p <= d), then hang a flat step wall of `depth` mm from
    every new boundary edge, lying in its plane. Returns the per-face 'flat' mask (wall faces)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for n, d in planes:
        n = np.asarray(n, dtype=float)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-4,
                               plane_co=Vector(n * d), plane_no=Vector(n), clear_outer=True)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=merge)

    def on_plane(v):
        p = np.array(v.co[:])
        return any(abs(p @ np.asarray(n, dtype=float) - d) < 1e-3 for n, d in planes)

    # only the edges the planes made: other open edges (e.g. where hidden faces were removed)
    # are tucked under neighbouring parts and need no wall
    boundary = [e for e in bm.edges if e.is_boundary and on_plane(e.verts[0]) and on_plane(e.verts[1])]
    bverts = list({v for e in boundary for v in e.verts})
    pts = np.array([v.co[:] for v in bverts])
    nrm = unit(F.gradient(field, pts))
    top, bot, plane_of = {}, {}, {}
    for v, p, nv in zip(bverts, pts, nrm):
        pn, _ = min(planes, key=lambda pl: abs(p @ np.asarray(pl[0]) - pl[1]))
        pn = np.asarray(pn, dtype=float)
        m = unit(nv - (nv @ pn) * pn)
        top[v] = bm.verts.new(Vector(p))
        bot[v] = bm.verts.new(Vector(p - m * depth))
        plane_of[v] = Vector(pn)
    wall = set(top.values()) | set(bot.values())
    for e in boundary:
        a, b = e.verts
        f = bm.faces.new((top[a], top[b], bot[b], bot[a]))
        f.normal_update()
        if f.normal.dot(plane_of[a]) < 0:
            f.normal_flip()
    bm.faces.index_update()
    flat = np.array([all(v in wall for v in f.verts) for f in bm.faces])
    bm.to_mesh(obj.data)
    bm.free()
    return flat


# ---------------------------------------------------------------------------------------
# UVs (millimetres of surface / tile size)
def _write_uv(me, uv):
    layer = me.uv_layers.new(name="UVMap")
    layer.data.foreach_set("uv", np.ascontiguousarray(uv, dtype=np.float32).ravel())


def _frame(axis, ref):
    a = unit(np.asarray(axis, dtype=float))
    r = np.asarray(ref, dtype=float)
    r = unit(r - (r @ a) * a)
    return a, r, np.cross(a, r)


def uv_cylindrical(me, tile_mm, origin, axis, ref, radius=None):
    """u = arc length around the axis (seam at azimuth +-pi from `ref`), v = height along it.
    `radius(p, h)` gives the effective radius for arc length (default: the point's own)."""
    a, e1, e2 = _frame(axis, ref)
    p = get_co(me) - np.asarray(origin)
    h = p @ a
    theta = np.arctan2(p @ e2, p @ e1)
    rad = radius(p, h) if radius else np.linalg.norm(p - h[:, None] * a, axis=1)
    vi = loop_vertex_index(me)
    th = theta[vi].copy()
    for poly in me.polygons:                         # unwrap faces that straddle the seam
        sl = slice(poly.loop_start, poly.loop_start + poly.loop_total)
        if th[sl].max() - th[sl].min() > math.pi:
            seg = th[sl]
            seg[seg < 0] += 2 * math.pi
            th[sl] = seg
    _write_uv(me, np.stack([th * rad[vi], h[vi]], 1) / tile_mm)


def uv_polar(me, tile_mm, centre, pole, ref):
    """Azimuthal-equidistant projection about `pole`: seamless over a dome or a cup."""
    a, e1, e2 = _frame(pole, ref)
    p = get_co(me) - np.asarray(centre)
    r = np.linalg.norm(p, axis=1)
    theta = np.arccos(np.clip((p @ a) / np.maximum(r, 1e-9), -1, 1))
    phi = np.arctan2(p @ e2, p @ e1)
    rho = r * theta
    uv = np.stack([rho * np.cos(phi), rho * np.sin(phi)], 1)
    _write_uv(me, uv[loop_vertex_index(me)] / tile_mm)


def uv_smart(obj, tile_mm):
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
_MATS = {}


def material(key):
    if key in _MATS:
        return _MATS[key]
    spec = LIB[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*spec.get("base_color", [1, 1, 1]), 1)
    bsdf.inputs["Metallic"].default_value = spec.get("metallic", 1.0)
    bsdf.inputs["Roughness"].default_value = spec.get("roughness", 0.5)

    def img(name, non_color):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(str(MATLIB / key / f"{name}.png"))
        n.image.name = f"{key}_{name}"
        if non_color:
            n.image.colorspace_settings.name = "Non-Color"
        return n

    maps = spec.get("maps", [])
    if "basecolor" in maps:
        nt.links.new(img("basecolor", False).outputs["Color"], bsdf.inputs["Base Color"])
    if "orm" in maps:
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(img("orm", True).outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
        nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
        if spec.get("occlusion"):
            # the glTF exporter reads occlusion from a group node named "glTF Material Output"
            grp = bpy.data.node_groups.get("glTF Material Output")
            if grp is None:
                grp = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
                grp.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
            g = nt.nodes.new("ShaderNodeGroup")
            g.node_tree = grp
            nt.links.new(sep.outputs["Red"], g.inputs["Occlusion"])
    if "normal" in maps:
        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = spec.get("normal_scale", 1.0)
        nt.links.new(img("normal", True).outputs["Color"], nmap.inputs["Color"])
        nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    _MATS[key] = m
    return m


def tile_mm(key):
    return LIB[key]["tile_mm"]


def assign(obj, key):
    obj.data.materials.clear()
    obj.data.materials.append(material(key))


# ---------------------------------------------------------------------------------------
# lathe
def lathe(profile, origin, axis, ref, segments, mat, sharp=(), name="lathe", uv_radius=None):
    """Surface of revolution from an (s, r) profile around `axis` through `origin`.

    The profile is walked with the solid on one side so that the normal of each segment,
    (-dr, ds), points out of the material. Endpoints with r == 0 become flat caps. Corners
    listed in `sharp` (profile indices) break the shading; elsewhere normals are averaged
    between neighbouring segments, i.e. analytic normals of the revolved curve.
    UVs: u = azimuth x uv_radius (default: mean profile radius), v = s, both / material tile.
    """
    a, e1, e2 = _frame(axis, ref)
    o = np.asarray(origin, dtype=float)
    prof = [tuple(map(float, p)) for p in profile]
    n_seg = []
    for i in range(len(prof) - 1):
        (s0, r0), (s1, r1) = prof[i], prof[i + 1]
        v = np.array([-(r1 - r0), s1 - s0])
        n_seg.append(v / np.linalg.norm(v))
    start_cap = prof[0][1] == 0
    end_cap = prof[-1][1] == 0
    ring_ids = [i for i, (_, r) in enumerate(prof) if r > 0]
    th = np.linspace(0, 2 * math.pi, segments, endpoint=False)
    radial = np.cos(th)[:, None] * e1 + np.sin(th)[:, None] * e2
    uvr = uv_radius or float(np.mean([r for _, r in prof if r > 0]))
    tile = tile_mm(mat)

    def corner_n(pi, seg):
        if pi in sharp or pi == 0 or pi == len(prof) - 1 or pi - 1 < 0 or pi >= len(n_seg):
            return n_seg[seg]
        return unit(n_seg[pi - 1] + n_seg[pi])

    bm = bmesh.new()
    rings = {i: [bm.verts.new(o + prof[i][0] * a + prof[i][1] * radial[k]) for k in range(segments)]
             for i in ring_ids}
    cn, uv = [], []
    for j in range(len(ring_ids) - 1):
        i0, i1 = ring_ids[j], ring_ids[j + 1]
        if i1 != i0 + 1:
            raise ValueError("profile may touch the axis only at its ends")
        for k in range(segments):
            k1 = (k + 1) % segments
            t0, t1 = th[k], (th[k1] if k1 else 2 * math.pi)
            bm.faces.new((rings[i0][k], rings[i0][k1], rings[i1][k1], rings[i1][k]))
            for pi, kk, tk in ((i0, k, t0), (i0, k1, t1), (i1, k1, t1), (i1, k, t0)):
                ns, nr = corner_n(pi, i0)
                cn.append(ns * a + nr * radial[kk])
                uv.append((tk * uvr / tile, prof[pi][0] / tile))
    caps = []
    if start_cap:
        caps.append((bm.faces.new(rings[ring_ids[0]]), n_seg[0]))
    if end_cap:
        caps.append((bm.faces.new(rings[ring_ids[-1]]), n_seg[-1]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for idx, (_, nsr) in enumerate(caps):
        poly = me.polygons[len(me.polygons) - len(caps) + idx]
        want = nsr[0] * a                       # caps are perpendicular to the axis
        if Vector(poly.normal).dot(Vector(want)) < 0:
            poly.flip()
        for li in range(poly.loop_start, poly.loop_start + poly.loop_total):
            p = np.array(me.vertices[me.loops[li].vertex_index].co) - o
            cn.append(unit(want))
            uv.append(((p @ e1) / tile, (p @ e2) / tile))
    _write_uv(me, np.array(uv))
    set_normals(me, np.array(cn))
    me.materials.append(material(mat))
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def auto_normals(me, angle=35.0):
    """Smooth normals split at creases sharper than `angle`, frozen as custom normals so they
    survive joining with SDF parts that carry their own."""
    for p in me.polygons:
        p.use_smooth = True
    bm = bmesh.new()
    bm.from_mesh(me)
    for e in bm.edges:
        e.smooth = not (e.is_manifold and e.calc_face_angle(0) > math.radians(angle))
    bm.to_mesh(me)
    bm.free()
    cn = np.array([c.vector[:] for c in me.corner_normals])
    set_normals(me, cn)


def _sweep(cols, axis, mat, name, crease, u_period):
    """Core of swept / swept_outline. cols: (origin, radial, u_mm, profile); each profile point
    (s, r) sits at origin + s*axis + r*radial. Columns wrap; u_period closes the UVs."""
    a = unit(np.asarray(axis, dtype=float))
    n_pts = len(cols[0][3])
    bm = bmesh.new()
    grid = []
    for o, rad, _, prof in cols:
        assert len(prof) == n_pts
        o, rad = np.asarray(o, dtype=float), np.asarray(rad, dtype=float)
        grid.append([bm.verts.new(o + s * a + r * rad) for s, r in prof])
    tile = tile_mm(mat)
    # v = arc length along each profile (not height): faces across the axis (tops, ledges,
    # rims) get undistorted texture instead of radial streaks
    arclen = []
    for _, _, _, prof in cols:
        pr = np.asarray(prof, dtype=float)
        arclen.append(np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pr, axis=0), axis=1))]))
    uv_of = {}
    nc = len(cols)
    for j in range(nc):
        j1 = (j + 1) % nc
        u0, u1 = cols[j][2], cols[j1][2] + (u_period if j1 == 0 else 0)
        va, vb = arclen[j], arclen[j1]
        for i in range(n_pts - 1):
            quad = (grid[j][i], grid[j1][i], grid[j1][i + 1], grid[j][i + 1])
            if len(set(quad)) < 4:
                continue
            f = bm.faces.new(quad)
            uv_of[f] = [(u0, va[i]), (u1, vb[i]), (u1, vb[i + 1]), (u0, va[i + 1])]
    uvl = bm.loops.layers.uv.new("UVMap")
    for f, uvs in uv_of.items():
        for l, (u, s) in zip(f.loops, uvs):
            l[uvl].uv = (u / tile, s / tile)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-5)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_area() < 1e-8], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    auto_normals(me, crease)
    me.materials.append(material(mat))
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def swept(columns, origin, axis, ref, mat, name="swept", uv_radius=None, crease=35.0):
    """Structured surface from a list of (azimuth, profile) columns around `axis`.

    Like a lathe, but every column may carry its own (s, r) profile (same point count), so a
    face can tilt with azimuth (a hooded liner rim) and a repeated azimuth with a different
    profile makes a crisp wall (notches, tabs). Columns wrap around; coincident points are
    welded, so profile points on the axis close into a pole and repeated points simply vanish.
    Normals: smooth, split where faces meet at more than `crease` degrees.
    Profiles are walked with the material on the right (see lathe)."""
    a, e1, e2 = _frame(axis, ref)
    uvr = uv_radius or float(np.mean([r for _, p in columns for _, r in p if r > 0]))
    tile = tile_mm(mat)
    uvr = max(1, round(2 * math.pi * uvr / tile)) * tile / (2 * math.pi)   # whole tiles: no seam
    cols = [(origin, math.cos(phi) * e1 + math.sin(phi) * e2, phi * uvr, prof) for phi, prof in columns]
    return _sweep(cols, a, mat, name, crease, 2 * math.pi * uvr)


def swept_zip(columns, origin, axis, ref, mat, name="swept", uv_radius=None, crease=35.0):
    """Like swept, but columns may differ in point count: columns = [(azimuth, [(lam, s, r)])],
    the last column closing the surface (azimuth 2pi, its points welded onto the first).
    Neighbouring columns are zipped by lam: points with equal lam make a quad, otherwise the
    side with the smaller next lam advances (a triangle). Used for helix-locked threads
    (tools/screws.py). Profiles are walked with the material on the right (see lathe)."""
    a, e1, e2 = _frame(axis, ref)
    o = np.asarray(origin, dtype=float)
    uvr = uv_radius or float(np.mean([r for _, p in columns for _, _, r in p if r > 0]))
    tile = tile_mm(mat)
    uvr = max(1, round(2 * math.pi * uvr / tile)) * tile / (2 * math.pi)   # whole tiles: no seam
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    cols = []
    for phi, prof in columns:
        rad = math.cos(phi) * e1 + math.sin(phi) * e2
        sr = np.array([(s, r) for _, s, r in prof], dtype=float)
        v = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(sr, axis=0), axis=1))])
        verts = [bm.verts.new(o + s * a + r * rad) for s, r in sr]
        cols.append((phi * uvr, [p[0] for p in prof], verts, v))

    def face(vs, uvs):
        if len(set(vs)) < len(vs):
            return
        f = bm.faces.new(vs)
        for l, (u, w) in zip(f.loops, uvs):
            l[uvl].uv = (u / tile, w / tile)

    tol = 1e-7
    for (ua, la, va, wa), (ub, lb, vb, wb) in zip(cols, cols[1:]):
        i = j = 0
        while i < len(va) - 1 or j < len(vb) - 1:
            na = la[i + 1] if i < len(va) - 1 else math.inf
            nb = lb[j + 1] if j < len(vb) - 1 else math.inf
            if abs(na - nb) < tol:
                face((va[i], vb[j], vb[j + 1], va[i + 1]), [(ua, wa[i]), (ub, wb[j]), (ub, wb[j + 1]), (ua, wa[i + 1])])
                i += 1
                j += 1
            elif nb < na:
                face((va[i], vb[j], vb[j + 1]), [(ua, wa[i]), (ub, wb[j]), (ub, wb[j + 1])])
                j += 1
            else:
                face((va[i], vb[j], va[i + 1]), [(ua, wa[i]), (ub, wb[j]), (ua, wa[i + 1])])
                i += 1
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-5)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_area() < 1e-8], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    auto_normals(me, crease)
    me.materials.append(material(mat))
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def swept_outline(points, normals, profile, z_axis, mat, name="outline", crease=35.0):
    """Sweep an (s, o) profile along a closed planar outline: each point is
    outline_point + s * z_axis + o * outward_normal. Plates, trays, inserts: a crisp edge band.
    The outline must run counter-clockwise seen from +z_axis (then, as for the lathe, walk the
    profile with the material on the right). `profile` is a list, or a function of the point
    index for edges that change along the outline."""
    pts = np.asarray(points, dtype=float)
    seg = np.linalg.norm(np.roll(pts, -1, 0) - pts, axis=1)
    u = np.concatenate([[0], np.cumsum(seg)[:-1]])
    prof = profile if callable(profile) else (lambda i: profile)
    cols = [(pts[i], normals[i], u[i], prof(i)) for i in range(len(pts))]
    return _sweep(cols, z_axis, mat, name, crease, float(seg.sum()))


def cap(points, normal, mat, name="cap"):
    """A flat n-gon (concave is fine) through `points`, facing `normal`, planar mm UVs."""
    n = unit(np.asarray(normal, dtype=float))
    _, e1, e2 = _frame(n, [1, 0, 0] if abs(n[0]) < 0.9 else [0, 1, 0])
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in points]
    f = bm.faces.new(vs)
    f.normal_update()
    if np.dot(f.normal, n) < 0:
        f.normal_flip()
    tile = tile_mm(mat)
    uvl = bm.loops.layers.uv.new("UVMap")
    for l in f.loops:
        p = np.array(l.vert.co[:])
        l[uvl].uv = ((p @ e1) / tile, (p @ e2) / tile)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    set_normals(me, np.tile(n, (len(me.loops), 1)))
    me.materials.append(material(mat))
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def bisect_keep(obj, planes):
    """Trim a surface to n.p <= d for each plane: exact, straight boundaries for joining parts."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for n, d in planes:
        n = np.asarray(n, dtype=float)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-4,
                               plane_co=Vector(n * d), plane_no=Vector(n), clear_outer=True)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=0.02)
    bm.to_mesh(obj.data)
    bm.free()


def tube(path, radius, mat, segments=12, closed=False, name="tube", u_repeats=None, end_round=None, scale=None):
    """A round strand along a 3D polyline (sutures, cables, wire, nails). Parallel-transport
    frames, so it never twists. UVs: v = length / tile_mm; u = turns around x u_repeats
    (default: circumference / tile, i.e. true millimetres; braided sutures pass u_repeats=1).
    Open ends close in rounded tips (end_round mm, or (start, end)); `scale` tapers the radius."""
    p = np.asarray(path, dtype=float)
    if closed and np.linalg.norm(p[0] - p[-1]) < 1e-6:
        p = p[:-1]
    n = len(p)
    if closed:
        t = unit(np.roll(p, -1, 0) - np.roll(p, 1, 0))
    else:
        t = unit(np.gradient(p, axis=0))
    ref = np.array([0.0, 0.0, 1.0]) if abs(t[0][2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    nrm = [unit(ref - (ref @ t[0]) * t[0])]
    for i in range(1, n):                                  # parallel transport
        v = nrm[-1] - (nrm[-1] @ t[i]) * t[i]
        nrm.append(unit(v))
    nrm = np.array(nrm)
    bin_ = np.cross(t, nrm)
    seg = np.linalg.norm(np.diff(p, axis=0), axis=1)
    s_len = np.concatenate([[0], np.cumsum(seg)])
    # radius may be (across normal, across binormal): a flattened strand / blade
    ra, rb = (radius if isinstance(radius, (tuple, list)) else (radius, radius))
    radius = max(ra, rb)
    radii = np.full(n, 1.0)
    if scale is not None:                                  # per-point radius multiplier (tapers)
        radii = radii * np.asarray(scale, dtype=float)
    if not closed:                                         # rounded tips (start, end) radii
        ers = end_round if isinstance(end_round, (tuple, list)) else (end_round or radius,) * 2
        for i in range(n):
            for d, er in ((s_len[i], ers[0]), (s_len[-1] - s_len[i], ers[1])):
                if d < er:
                    radii[i] = min(radii[i], math.sqrt(max(0.0, 1 - ((er - d) / er) ** 2)) + 1e-4)
    th = np.linspace(0, 2 * math.pi, segments, endpoint=False)
    bm = bmesh.new()
    rings = [[bm.verts.new(p[i] + radii[i] * (ra * math.cos(a) * nrm[i] + rb * math.sin(a) * bin_[i])) for a in th]
             for i in range(n)]
    tile = tile_mm(mat)
    if u_repeats is None:          # true millimetres around (rods, wire); sutures pass 1 turn = 1 tile
        u_repeats = max(1, round(2 * math.pi * radius / tile))
    uvl = bm.loops.layers.uv.new("UVMap")
    rows = n if closed else n - 1
    for i in range(rows):
        i1 = (i + 1) % n
        v0, v1 = s_len[i] / tile, (s_len[i1] if i1 else s_len[-1] + np.linalg.norm(p[0] - p[-1])) / tile
        for k in range(segments):
            k1 = (k + 1) % segments
            f = bm.faces.new((rings[i][k], rings[i][k1], rings[i1][k1], rings[i1][k]))
            u0, u1 = k / segments * u_repeats, (k + 1) / segments * u_repeats
            for l, uv in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
                l[uvl].uv = uv
    if not closed:
        for ring, outward in ((rings[0], -t[0]), (rings[-1], t[-1])):
            f = bm.faces.new(ring)
            f.normal_update()
            if np.dot(f.normal, outward) < 0:
                f.normal_flip()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    auto_normals(me, 60.0)
    me.materials.append(material(mat))
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def split_by_planes(obj, planes, offset=0.0):
    """Cut a surface along planes (n.p = d + offset) without removing anything, so every face
    lies wholly on one side of each plane. Returns the per-face mask 'inside all planes'
    (n.p < d + offset for every plane): an exact, straight material boundary."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for n, d in planes:
        n = np.asarray(n, dtype=float)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-4,
                               plane_co=Vector(n * (d + offset)), plane_no=Vector(n))
    bm.to_mesh(obj.data)
    bm.free()
    c = face_centres(obj.data)
    return np.all([c @ np.asarray(n, dtype=float) < d + offset for n, d in planes], axis=0)


def arc(centre_s, radius, a0, a1, n):
    """Profile points on a circle in the (s, r) plane: angle measured from +s towards +r."""
    t = np.linspace(a0, a1, n)
    return [(centre_s + radius * math.cos(x), radius * math.sin(x)) for x in t]


# ---------------------------------------------------------------------------------------
# assembly / export / renders
def join(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = obj.data.name = name
    return obj


def to_metres(obj, origin=(0, 0, 0), matrix=None):
    """Move `origin` (mm) to 0, optionally rotate (3x3), convert to metres. Normals follow."""
    me = obj.data
    p = get_co(me) - np.asarray(origin)
    if matrix is not None:
        R = np.asarray(matrix)
        p = p @ R.T
        # custom normals must be rotated too
        ln = np.array([l.normal[:] for l in me.loops]) @ R.T
        set_co(me, p * 0.001)
        set_normals(me, ln)
    else:
        set_co(me, p * 0.001)
    return obj


def export_glb(obj, path):
    select_only(obj)
    bpy.ops.export_scene.gltf(filepath=str(path), use_selection=True, export_format="GLB",
                              export_yup=True, export_normals=True, export_texcoords=True)


def render_shots(glbs, shots, out_dir, size=(900, 1200), samples=128):
    """Re-import exported GLBs (render what ships) and render Cycles shots.
    shots: {name: (glb_key, target_m (Blender Z-up), view_dir, distance_m)}"""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    objs = {}
    for key, path in glbs.items():
        bpy.ops.import_scene.gltf(filepath=str(path))
        objs[key] = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.film_transparent = True
    world = bpy.data.worlds.new("studio")
    world.use_nodes = True
    env = world.node_tree.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(str(HDR))
    world.node_tree.links.new(env.outputs["Color"], world.node_tree.nodes["Background"].inputs["Color"])
    scene.world = world
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 85
    cam.data.clip_start = 0.001          # close-ups of small parts sit nearer than the 0.1 m default
    scene.collection.objects.link(cam)
    scene.camera = cam
    Path(out_dir).mkdir(exist_ok=True)
    for shot, (key, tgt, dvec, dist) in shots.items():
        for k, os_ in objs.items():
            for o in os_:
                o.hide_render = k != key
        dvec = Vector(dvec).normalized()
        cam.location = Vector(tgt) + dvec * dist
        cam.rotation_euler = (-dvec).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(Path(out_dir) / f"render_{shot}.png")
        bpy.ops.render.render(write_still=True)
