"""Stage 2: clean bone set, split long bones into zone pieces, rig with joint empties,
calm pose, backwards Palarmus cap. Saves a .blend and preview renders.

blender -b -P stage2.py -- <skeletal.fbx> <logo.png> <out.blend> <render-prefix>

Z is up, the skeleton faces -Y, the model's ".l" side is +X. Units are metres.
"""
import sys, math, bpy, bmesh
from mathutils import Vector, Matrix, Euler

args = sys.argv[sys.argv.index("--") + 1:]
SRC, LOGO, BLEND, OUT = args

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SRC)
scene = bpy.context.scene

# ---------------------------------------------------------------- clean-up

# Soft tissue and hidden inner parts an office skeleton does not have
DROP = ("Malleus", "Incus", "Stapes", "Sinus of", "cells of ethmoid", "cartilage.", "Nasal septal",
        "Thyroid cartilage", "Cricoid cartilage", "Major alar")

def is_bone(o):
    # Z-Anatomy tags labels (.j/.i) and muscle attachment areas (.o*/.e*) by suffix; bones are .l/.r/none
    parts = o.name.rsplit(".", 1)
    return len(parts) == 1 or parts[1] in ("l", "r")

def keep(o):
    if o.type != "MESH" or not is_bone(o) or len(o.data.polygons) <= 20:
        return False
    if o.name.startswith("Costal cartilage"):
        return True  # reads as bone on a teaching skeleton
    return not any(d in o.name for d in DROP)

bones = [o for o in scene.objects if keep(o)]

# Bake world transforms into mesh data so every piece lives in plain world space.
# Read them all first: the FBX nests bones under grouping empties that are removed next.
world = {o.name: o.matrix_world.copy() for o in bones}
for o in [o for o in scene.objects if o not in bones]:
    bpy.data.objects.remove(o)
for o in bones:
    mw = world[o.name]
    o.parent = None
    if o.data.users > 1:
        o.data = o.data.copy()
    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
        if o.data.has_custom_normals:
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
    o.data.transform(mw)
    if mw.determinant() < 0:
        o.data.flip_normals()
    o.matrix_world = Matrix.Identity(4)
    for p in o.data.polygons:
        p.use_smooth = True
for m in [m for m in bpy.data.meshes if m.users == 0]:
    bpy.data.meshes.remove(m)

# ---------------------------------------------------------------- split long bones

# (proximal end, distal start) as fractions of bone height measured from the top.
# Pieces share their cut edges exactly, so the bone still looks whole.
SPLITS = {"Femur": (0.22, 0.80), "Tibia": (0.20, 0.85), "Fibula": (0.15, 0.85), "Humerus": (0.22, 0.82)}

def zspan(o):
    zs = [v.co.z for v in o.data.vertices]
    return min(zs), max(zs)

def split(o, fr):
    """Cut a long bone into proximal / shaft / distal with two flat horizontal planes. The pieces
    share their cut loops vertex for vertex, so the bone still looks whole, and where two zones
    meet the boundary is a clean ring rather than the mesh's own triangle zigzag."""
    lo, hi = zspan(o)
    h = hi - lo
    cuts = (hi - fr[0] * h, hi - fr[1] * h)
    base, side = o.name.rsplit(".", 1)
    out = []
    for label, below, above in (("proximal", cuts[0], None), ("shaft", cuts[1], cuts[0]), ("distal", None, cuts[1])):
        bm = bmesh.new()
        bm.from_mesh(o.data)
        # clear_outer drops the side the normal points to
        if below is not None:
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, below),
                                   plane_no=(0, 0, -1), clear_outer=True)
        if above is not None:
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, above),
                                   plane_no=(0, 0, 1), clear_outer=True)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        me = bpy.data.meshes.new(f"{base} {label}.{side}")
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = True
        piece = bpy.data.objects.new(me.name, me)
        scene.collection.objects.link(piece)
        out.append(piece)
    bpy.data.objects.remove(o)
    return out

for o in list(bones):
    base = o.name.rsplit(".", 1)[0]
    if base in SPLITS:
        bones.remove(o)
        bones += split(o, SPLITS[base])

# ---------------------------------------------------------------- zones

# A bone can belong to several zones; the first listed is its "home" for colouring.
# Zone ids map to catalogue directions on the site.
def zones_of(name):
    n = name.rsplit(".", 1)[0]
    if n.startswith(("Atlas", "Axis", "Vertebra")) or n in ("Sacrum", "Coccyx"):
        return ["spine"]
    if n == "Hip bone" or n == "Femur proximal":
        return ["hip"]
    if n in ("Femur distal", "Patella", "Tibia proximal"):
        return ["knee", "sports"]
    if n == "Fibula proximal":
        return ["knee"]
    if n in ("Scapula", "Humerus proximal"):
        return ["shoulder", "sports"]
    if n == "Clavicle":
        return ["trauma", "shoulder"]
    if n in ("Tibia distal", "Fibula distal") or n.endswith("of foot") or n.startswith(
        ("Talus", "Calcaneus", "Navicular", "Cuboid", "Sesamoid")) or "cuneiform" in n or "metatarsal" in n:
        return ["foot-ankle"]
    if n.endswith(("shaft", "Humerus distal")) or n in ("Radius", "Ulna") or n.endswith("of hand") or \
            "metacarpal" in n or n.split(" ")[0] in ("Scaphoid", "Lunate", "Trapezium", "Trapezoid",
                                                    "Capitate", "Hamate", "Triquetrum", "Pisiform"):
        return ["trauma"]
    return []

for o in bones:
    z = zones_of(o.name)
    o["zones"] = ",".join(z)  # glTF extras; comma list keeps the exporter happy

# ---------------------------------------------------------------- rig

def verts_world(o):
    return [v.co for v in o.data.vertices]

def band_centroid(name, end, depth):
    """Centroid of the vertices within `depth` of a bone's top or bottom."""
    o = bpy.data.objects[name]
    lo, hi = zspan(o)
    vs = [v for v in verts_world(o) if (v.z >= hi - depth if end == "top" else v.z <= lo + depth)]
    return sum(vs, Vector()) / len(vs)

HEAD_Z = 1.49  # below the mandible: everything above that is not a vertebra rides with the head

def rig_part(o):
    n, _, side = o.name.rpartition(".")
    if not n:
        n, side = o.name, ""
    s = f".{side}" if side in ("l", "r") else ""
    if n.startswith("Humerus"):
        return "upper_arm" + s
    if n in ("Radius", "Ulna"):
        return "forearm" + s
    if zones_of(o.name) == ["trauma"] and n not in ("Clavicle",) and not n.endswith("shaft"):
        return "hand" + s  # carpals, metacarpals, finger bones
    if n.startswith("Femur"):
        return "thigh" + s
    if n.startswith(("Tibia", "Fibula", "Patella")):
        return "shin" + s
    if zones_of(o.name) == ["foot-ankle"]:
        return "foot" + s
    if n in ("Hip bone", "Sacrum", "Coccyx"):
        return "pelvis"
    if n.startswith("Vertebra L"):
        return "lumbar"
    if n.startswith(("Atlas", "Axis", "Vertebra C")) or n == "Hyoid bone":
        return "neck"
    lo, hi = zspan(o)
    if (lo + hi) / 2 > HEAD_Z:
        return "head"
    return "chest"  # thoracic vertebrae, ribs, sternum, clavicles, scapulae

# (part, parent, pivot)
JOINTS = [
    ("pelvis", None, Vector((0, 0.03, 0.92))),
    ("lumbar", "pelvis", Vector((0, 0.03, 0.975))),
    ("chest", "lumbar", Vector((0, 0.035, 1.115))),
    ("neck", "chest", Vector((0, 0.045, 1.445))),
    ("head", "neck", Vector((0, 0.02, 1.55))),
]
for s in ("l", "r"):
    JOINTS += [
        (f"upper_arm.{s}", "chest", band_centroid(f"Humerus proximal.{s}", "top", 0.045)),
        (f"forearm.{s}", f"upper_arm.{s}", band_centroid(f"Humerus distal.{s}", "bottom", 0.025)),
        (f"hand.{s}", f"forearm.{s}", band_centroid(f"Radius.{s}", "bottom", 0.02)),
        (f"thigh.{s}", "pelvis", band_centroid(f"Femur proximal.{s}", "top", 0.045)),
        (f"shin.{s}", f"thigh.{s}", band_centroid(f"Femur distal.{s}", "bottom", 0.03)),
        (f"foot.{s}", f"shin.{s}", band_centroid(f"Talus.{s}", "top", 0.02)),
    ]

rig, pivots = {}, {}
for name, parent, pivot in JOINTS:
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = "PLAIN_AXES"
    e.empty_display_size = 0.03
    scene.collection.objects.link(e)
    e.rotation_mode = "XYZ"
    if parent:
        e.parent = rig[parent]
        e.location = pivot - pivots[parent]
    else:
        e.location = pivot
    pivots[name] = pivot
    rig[name] = e

def attach(o, part):
    """Put a world-space object under a joint empty with its mesh in joint-local space."""
    pivot = pivots[part]
    o.data.transform(Matrix.Translation(-pivot))
    o.parent = rig[part]
    o.matrix_parent_inverse = Matrix.Identity(4)  # FBX leaves stale ones behind
    o.matrix_basis = Matrix.Identity(4)

for o in bones:
    attach(o, rig_part(o))

# ---------------------------------------------------------------- cap (built in world space, rides the head)

import numpy as np

# The crown is a radial surface around C: r(a, th) is sampled on a grid and shrink-fitted to the
# skull vault, so the cap follows the head's real width and length instead of a scaled sphere.
# a = azimuth, 0 at the forehead (-Y), +X at a = +90 deg; th = angle down from straight up.
C = Vector((0, 0.006, 1.600))
NA, NT, TMAX = 96, 48, math.radians(108)
FABRIC, AIR = 0.0025, 0.002

def direction(a, th):
    return Vector((math.sin(th) * math.sin(a), -math.sin(th) * math.cos(a), math.cos(th)))

vault = np.array([tuple(v.co + pivots["head"] - C) for o in bones if o.parent is rig["head"] for v in o.data.vertices])
vault = vault[vault[:, 2] > 1.572 - C.z]
dist = np.linalg.norm(vault, axis=1)
unit = vault / dist[:, None]
grid = np.array([tuple(direction(2 * math.pi * i / NA, TMAX * j / (NT - 1))) for j in range(NT) for i in range(NA)])
need = np.full(len(grid), np.nan)
window = math.cos(math.radians(9))
for c0 in range(0, len(grid), 256):
    cos = unit @ grid[c0:c0 + 256].T
    hit = np.where(cos > window, dist[:, None], 0).max(axis=0)
    need[c0:c0 + 256] = np.where(hit > 0, hit, np.nan)
need = need.reshape(NT, NA)
for j in range(1, NT):  # directions that miss the vault (below it) inherit the row above
    need[j] = np.where(np.isnan(need[j]), need[j - 1], need[j])
need += FABRIC + AIR
radius = need.copy()
for _ in range(40):  # upper-envelope smoothing: never dips inside the skull, irons out suture bumps
    padded = np.vstack([radius[:1], radius, radius[-1:]])
    avg = (padded[:-2] + padded[2:] + np.roll(radius, 1, 1) + np.roll(radius, -1, 1) + 2 * radius) / 6
    radius = np.maximum(need, avg)
radius[0] = radius[0].mean()  # single apex
print("REPORT cap radius min/max", round(float(radius[:30].min()), 4), round(float(radius[:30].max()), 4))

def surf(a, th):
    fi = (a % (2 * math.pi)) / (2 * math.pi) * NA
    fj = min(max(th / TMAX * (NT - 1), 0), NT - 1.001)
    i0, j0 = int(fi) % NA, int(fj)
    di, dj = fi - int(fi), fj - j0
    i1 = (i0 + 1) % NA
    top = radius[j0, i0] * (1 - di) + radius[j0, i1] * di
    bot = radius[j0 + 1, i0] * (1 - di) + radius[j0 + 1, i1] * di
    return float(top * (1 - dj) + bot * dj)

def point(a, th, grow=0.0):
    return C + direction(a, th) * (surf(a, th) + grow)

def theta_at(a, z):
    lo, hi = 0.0, TMAX
    for _ in range(40):
        mid = (lo + hi) / 2
        if C.z + surf(a, mid) * math.cos(mid) > z:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2

def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi

BACK = math.pi
ARCH_W, ARCH_H = 0.36, 0.034  # snapback opening over the occiput

def band_z(a):
    # The band sits on the forehead just above the brow and drops over the occiput
    return C.z + 0.012 + 0.019 * math.cos(a)

def rim_z(a):
    d = abs(wrap(a - BACK))
    return band_z(a) + (ARCH_H * math.sqrt(1 - (d / ARCH_W) ** 2) if d < ARCH_W else 0)

def build(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    return o

def solidify(o, thickness, offset=-1.0):
    m = o.modifiers.new("solid", "SOLIDIFY")
    m.thickness, m.offset, m.use_even_offset = thickness, offset, True
    with bpy.context.temp_override(object=o, active_object=o):
        bpy.ops.object.modifier_apply(modifier=m.name)

def weld(o, dist=0.0003):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bm.to_mesh(o.data); bm.free()

def curve(name, pts, depth):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", depth, 1
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts):
        p.co = (*v, 1)
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    return o

# Crown
SEG, ROWS = 96, 24
verts, faces = [], []
for j in range(ROWS):
    for i in range(SEG):
        a = 2 * math.pi * i / SEG
        verts.append(point(a, theta_at(a, rim_z(a)) * (1 - j / ROWS)))
apex = len(verts)
verts.append(point(0, 0))
for j in range(ROWS - 1):
    for i in range(SEG):
        k, n = j * SEG + i, j * SEG + (i + 1) % SEG
        faces.append((k, n, n + SEG, k + SEG))
for i in range(SEG):
    faces.append(((ROWS - 1) * SEG + i, (ROWS - 1) * SEG + (i + 1) % SEG, apex))
crown = build("Cap crown", verts, faces)
solidify(crown, FABRIC)

# Panel seams: six ridges from the button down to the band, front and back ones on the centre line
seams = []
for k in range(6):
    a = k * math.pi / 3
    th_end = theta_at(a, rim_z(a))
    seams.append(curve(f"Cap seam {k}", [point(a, 0.03 + (th_end - 0.03) * t / 40, 0.0004) for t in range(41)], 0.0009))

# Button
top = point(0, 0)
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=0.0075)
bmesh.ops.scale(bm, vec=(1, 1, 0.45), verts=bm.verts)
bmesh.ops.translate(bm, vec=top + Vector((0, 0, 0.0012)), verts=bm.verts)
me = bpy.data.meshes.new("Cap button"); bm.to_mesh(me); bm.free()
for p in me.polygons:
    p.use_smooth = True
button = bpy.data.objects.new("Cap button", me); scene.collection.objects.link(button)

# Snapback strap across the bottom of the opening
verts, faces = [], []
N = 32
for i in range(N + 1):
    a = BACK - ARCH_W * 1.08 + 2 * ARCH_W * 1.08 * i / N
    zb = band_z(a)
    verts += [point(a, theta_at(a, zb - 0.001), 0.001), point(a, theta_at(a, zb + 0.013), 0.001)]
for i in range(N):
    faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
strap = build("Cap strap", verts, faces)
solidify(strap, 0.002, 1.0)

# Brim: a pre-curved baseball bill, as on a real six-panel cap. Seen from above it is a broad D
# off the front of the band, reaching well past the temples; across its width it is bent down
# like a strip of a cylinder, and the whole bill is pitched down towards the front.
NU, NV = 72, 16
SPAN = 1.36          # band arc the bill is sewn to, each side of the centre (~78 deg)
DEPTH = 0.074        # forward reach at the centre
PITCH = math.radians(11)
BEND = 3.9           # across-width curvature: drop = BEND * x^2 at the front edge
THICK = 0.0034

def bill_root(a):
    p = point(a, theta_at(a, band_z(a)), -0.0015)   # tucked just inside the crown
    p.z = band_z(a) - 0.0006
    return p

ROOT_FRONT = bill_root(0.0)

def bill_point(u, v, lift=0.0):
    """u in -1..1 across the bill, v in 0..1 from the band to the edge."""
    a = u * SPAN
    root = bill_root(a)
    fwd = (Vector((math.sin(a), -math.cos(a), 0)) * 0.3 + Vector((0, -1, 0)) * 0.7).normalized()
    reach = DEPTH * max(1 - abs(u) ** 2.4, 0.0) ** 0.5   # full reach across the middle, rounded corners
    p = root + fwd * reach * v
    edge_x = (root + fwd * reach).x
    z_edge = ROOT_FRONT.z - math.tan(PITCH) * DEPTH - BEND * edge_x * edge_x
    p.z = root.z + (z_edge - root.z) * v + lift
    return p

verts, faces = [], []
for i in range(NU + 1):
    u = -1 + 2 * i / NU
    for j in range(NV + 1):
        verts.append(bill_point(u, j / NV))
for i in range(NU):
    for j in range(NV):
        k = i * (NV + 1) + j
        faces.append((k, k + 1, k + NV + 2, k + NV + 1))  # normals up
brim = build("Cap brim", verts, faces)
weld(brim)
solidify(brim, THICK, 0.0)
bev = brim.modifiers.new("round", "BEVEL")
bev.width, bev.segments, bev.limit_method = 0.0014, 3, "ANGLE"
with bpy.context.temp_override(object=brim, active_object=brim):
    bpy.ops.object.modifier_apply(modifier=bev.name)

# Six rows of stitching parallel to the bill's edge, 3 mm apart, as sewn
for r in range(1, 7):
    off = 0.0032 * r
    pts = []
    for i in range(121):
        u = -0.985 + 1.97 * i / 120
        reach = DEPTH * max(1 - abs(u) ** 2.4, 0.0) ** 0.5
        if reach < off + 0.006:
            continue
        pts.append(bill_point(u, 1 - off / reach, THICK / 2 + 0.00015))
    if len(pts) > 3:
        seams.append(curve(f"Cap brim stitch {r}", pts, 0.00035))

# Stitched eyelets, one per panel, near the top
def eyelet(name, a, th):
    c = point(a, th, 0.0003)
    n = (c - C).normalized()
    t1 = n.cross(Vector((0, 0, 1))).normalized()
    t2 = n.cross(t1)
    bm_ = bmesh.new()
    R_, r_, M, N = 0.0024, 0.0007, 20, 8
    ring = [[bm_.verts.new(c + (t1 * math.cos(TAU_ * i / M) + t2 * math.sin(TAU_ * i / M)) * (R_ + r_ * math.cos(TAU_ * j / N))
                           + n * r_ * math.sin(TAU_ * j / N)) for j in range(N)] for i in range(M)]
    for i in range(M):
        for j in range(N):
            bm_.faces.new((ring[i][j], ring[(i + 1) % M][j], ring[(i + 1) % M][(j + 1) % N], ring[i][(j + 1) % N]))
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces)
    me_ = bpy.data.meshes.new(name); bm_.to_mesh(me_); bm_.free()
    for p_ in me_.polygons:
        p_.use_smooth = True
    o_ = bpy.data.objects.new(name, me_); scene.collection.objects.link(o_)
    return o_

TAU_ = 2 * math.pi
eyelets = [eyelet(f"Cap eyelet {k}", math.pi / 6 + k * math.pi / 3, theta_at(math.pi / 6 + k * math.pi / 3, rim_z(math.pi / 6 + k * math.pi / 3)) * 0.42)
           for k in range(6)]

# Logo decal on the front panel, above the brim
logo_img = bpy.data.images.load(LOGO)
LOGO_W, LOGO_ASPECT = 0.084, logo_img.size[0] / logo_img.size[1]
LOGO_H, LOGO_Z = LOGO_W / LOGO_ASPECT, band_z(0) + 0.027
verts, faces, uvs = [], [], []
NU, NV = 40, 10
for j in range(NV + 1):
    for i in range(NU + 1):
        s, t = i / NU, j / NV
        z = LOGO_Z + (t - 0.5) * LOGO_H
        th = theta_at(0, z)
        rho = surf(0, th) * math.sin(th)
        a = (s - 0.5) * LOGO_W / rho  # seen from the front, +X (positive a) is on the viewer's right
        verts.append(point(a, theta_at(a, z), 0.0016))  # clears the centre seam underneath
        uvs.append((s, t))
for j in range(NV):
    for i in range(NU):
        k = j * (NU + 1) + i
        faces.append((k, k + 1, k + NU + 2, k + NU + 1))
decal = build("Cap logo", verts, faces)
uv = decal.data.uv_layers.new(name="UVMap")
for loop in decal.data.loops:
    uv.data[loop.index].uv = uvs[loop.vertex_index]

cap = [crown, button, strap, brim, decal] + eyelets + seams
for o in cap:
    o["zones"] = ""
    if o.type == "CURVE":
        continue
    attach(o, "head")
for o in seams:  # curves: parent keeping the world transform
    o.parent = rig["head"]
    o.matrix_parent_inverse = Matrix.Translation(-pivots["head"])

# ---------------------------------------------------------------- materials

def principled(name, color, rough, sheen=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    if sheen:
        b.inputs["Sheen Weight"].default_value = sheen
    return m, b

bone_mat, _ = principled("Bone", (0.70, 0.64, 0.52), 0.55)
fabric, _ = principled("Cap fabric", (0.571, 0.0, 0.0033), 0.8, 0.15)  # Venetian Red #C7000B
stitch, _ = principled("Cap stitch", (0.40, 0.0, 0.002), 0.9)
logo_mat, lb = principled("Cap logo", (1, 1, 1), 0.6, 0.3)
tex = logo_mat.node_tree.nodes.new("ShaderNodeTexImage")
tex.image = logo_img
tex.interpolation = "Cubic"
logo_mat.node_tree.links.new(tex.outputs["Alpha"], lb.inputs["Alpha"])
logo_mat.surface_render_method = "DITHERED"

for o in bones:
    o.data.materials.clear(); o.data.materials.append(bone_mat)
for o in (crown, button, strap, brim):
    o.data.materials.clear(); o.data.materials.append(fabric)
for o in seams + eyelets:
    o.data.materials.append(stitch)
decal.data.materials.append(logo_mat)

# ---------------------------------------------------------------- calm pose

def pose(part, deg):
    rig[part].rotation_euler = Euler([math.radians(d) for d in deg], "XYZ")

pose("lumbar", (0, 1.5, 0))
pose("chest", (1, -1, 1))
pose("neck", (3, 2, 3))
pose("head", (5, 5, 5))          # slight nod and tilt, as the office skeleton hangs
for s, k in (("r", -1), ("l", 1)):
    pose(f"upper_arm.{s}", (-3, k * 9, k * 4))   # arms in towards the thighs, a touch forward
    pose(f"forearm.{s}", (-5, 0, k * -4))        # soft elbows, forearms turned in a little
    pose(f"hand.{s}", (-2, k * -3, 0))
pose("thigh.l", (-1.5, -1, 0))                   # weight on the right leg, left knee relaxed
pose("shin.l", (4, 0, 0))
pose("foot.l", (-2.5, 0, 3))

bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# ---------------------------------------------------------------- previews

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y = 900, 1350
scene.view_settings.view_transform = "Standard"  # AgX washes the brand red out to salmon
scene.world = bpy.data.worlds.new("w")
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.6, 0.62, 0.65, 1)
bg.inputs[1].default_value = 0.3

def light(name, kind, energy, size, loc):
    d = bpy.data.lights.new(name, kind); d.energy = energy
    if kind == "AREA":
        d.size = size
    o = bpy.data.objects.new(name, d); scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 0.9)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

light("key", "AREA", 200, 1.5, (-1.6, -2.2, 2.4))
light("fill", "AREA", 50, 2.0, (2.2, -1.5, 1.2))
light("rim", "AREA", 160, 1.0, (0.8, 2.5, 2.2))

cam_data = bpy.data.cameras.new("cam"); cam_data.lens = 70
cam = bpy.data.objects.new("cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam

def shoot(label, target, yaw, dist, elev=0.0, res=(900, 1350)):
    a = math.radians(yaw)
    cam.location = Vector(target) + Vector((math.sin(a), -math.cos(a), elev)) * dist
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = f"{OUT}-{label}.png"
    bpy.ops.render.render(write_still=True)

body = (0, 0, 0.86)
shoot("front", body, 0, 4.2)
shoot("34", body, 35, 4.2)
shoot("back", body, 180, 4.2)
head = (0, 0.02, 1.6)
shoot("head-34", head, 30, 0.85, 0.1, (1000, 1000))
shoot("head-side", head, 90, 0.85, 0.05, (1000, 1000))
shoot("head-back", head, 150, 0.85, 0.15, (1000, 1000))

# Zone map: each bone in its home zone's colour
ZONE_COLORS = {"trauma": (0.8, 0.08, 0.02), "hip": (0.05, 0.2, 0.8), "knee": (0.1, 0.55, 0.05),
               "shoulder": (0.5, 0.08, 0.6), "spine": (0.85, 0.65, 0.02), "foot-ankle": (0.02, 0.5, 0.6)}
zmats = {z: principled(f"zone {z}", c, 0.5)[0] for z, c in ZONE_COLORS.items()}
for o in bones:
    home = o["zones"].split(",")[0]
    if home:
        o.data.materials[0] = zmats[home]
shoot("zones-front", body, 0, 4.2)
shoot("zones-back", body, 180, 4.2)

tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bones)
print(f"REPORT bones={len(bones)} tris={tris}")
for z in ZONE_COLORS.keys() | {"sports"}:
    print("REPORT zone", z, sorted(o.name for o in bones if z in o["zones"].split(",")))
print("REPORT unzoned", len([o for o in bones if not o["zones"]]))
