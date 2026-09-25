"""Implants for every catalogue zone, fitted to the bone geometry, plus resected-bone
variants for the joint replacements. Everything is hidden by default; the site shows a zone's
implants (and swaps in its resected bones) when the zone is active.

blender -b <stage2.blend> -P implants.py -- <out.blend> <render-prefix>

Each implant is parented to the same joint empty as the bone it sits in and built directly in that
joint's local space (which is where the bone meshes live). Custom props for the glTF extras:
  implant  = zone id                      on implant parts
  resected = zone id, replaces = bone     on cut-bone variants
"""
import os, sys, math, bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hardware as hw  # noqa: E402

TAU = 2 * math.pi

args = sys.argv[sys.argv.index("--") + 1:]
BLEND, OUT = args
scene = bpy.context.scene
bpy.context.view_layer.update()
OBJ = bpy.data.objects

# ---------------------------------------------------------------- materials

def principled(name, color, rough, metal=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        m.surface_render_method = "DITHERED"
    return m

# Linear-space base colours. Real hardware reads by finish more than by hue: bead-blasted
# titanium plates and stems, gold-anodised titanium screws (how most systems colour-code them),
# mirror-polished cobalt-chrome on bearing surfaces, a ceramic head, milky UHMWPE.
TITANIUM = principled("Implant titanium", (0.62, 0.6, 0.57), 0.34, 1.0)
ANODISED = principled("Implant anodised", (0.83, 0.6, 0.26), 0.3, 1.0)
COCR = principled("Implant cobalt-chrome", (0.78, 0.78, 0.8), 0.1, 1.0)
CERAMIC = principled("Implant ceramic", (0.86, 0.8, 0.76), 0.08)
POLY = principled("Implant polyethylene", (0.8, 0.8, 0.76), 0.5)
GRAFT = principled("Implant graft", (0.8, 0.62, 0.45), 0.75)
SUTURE = principled("Implant suture", (0.04, 0.12, 0.5), 0.6)
POROUS = principled("Implant porous titanium", (0.4, 0.38, 0.35), 0.9, 1.0)   # bone-ingrowth coating
PEEK = principled("Implant PEEK", (0.6, 0.48, 0.32), 0.45)                   # anchors, interference screws

# ---------------------------------------------------------------- geometry helpers

def V(a):
    return Vector(tuple(float(x) for x in a))

def pts(*names):
    return np.array([tuple(v.co) for n in names for v in OBJ[n].data.vertices])

def axis(P):
    """Centroid and principal direction of a bone, pointing distally (down)."""
    c = P.mean(0)
    u = np.linalg.svd(P - c, full_matrices=False)[2][0]
    return c, (-u if u[2] > 0 else u)

def ortho(d, u):
    d = np.asarray(d, float) - np.dot(d, u) * u
    return d / np.linalg.norm(d)

def sphere_fit(P):
    """Least-squares sphere, refitted on inliers to shrug off the neck and trochanters."""
    for _ in range(4):
        A = np.c_[2 * P, np.ones(len(P))]
        sol = np.linalg.lstsq(A, (P ** 2).sum(1), rcond=None)[0]
        c = sol[:3]
        r = math.sqrt(sol[3] + c @ c)
        res = np.abs(np.linalg.norm(P - c, axis=1) - r)
        P = P[res < max(np.percentile(res, 60), 0.0015)]
    return c, r

def canal(P, s0, s1, n=40, deg=3):
    """Smoothed centre line of a long bone between axis params s0..s1 (slab centroids + polyfit)."""
    c, u = axis(P)
    t = (P - c) @ u
    ss = np.linspace(s0, s1, n)
    cen = np.array([P[np.abs(t - s) < 0.006].mean(0) for s in ss])
    return np.array([np.polyval(np.polyfit(ss, cen[:, k], deg), ss) for k in range(3)]).T

def span(P):
    c, u = axis(P)
    t = (P - c) @ u
    return t.min(), t.max()

def surface_line(P, side, s0, s1, n):
    """Outermost bone surface in direction `side` along the bone axis: the bed a plate sits on."""
    c, u = axis(P)
    side = ortho(side, u)
    t = (P - c) @ u
    out = []
    for s in np.linspace(s0, s1, n):
        w = 0.004
        while not (np.abs(t - s) < w).sum() > 3:  # low-poly shafts have sparse rings
            w *= 1.5
        Q = P[np.abs(t - s) < w]
        out.append(Q[np.argmax(Q @ side)])
    out = np.array(out)
    ss = np.linspace(s0, s1, n)
    smooth = np.array([np.polyval(np.polyfit(ss, out[:, k], 4), ss) for k in range(3)]).T
    return smooth, u, side

def rot_to(axis_vec):
    return Vector((0, 0, 1)).rotation_difference(V(axis_vec).normalized()).to_matrix().to_4x4()

def local(empty, p, frm=None):
    """Point p given in `frm` joint space (or world) expressed in `empty` joint space."""
    w = frm.matrix_world @ V(p) if frm else V(p)
    return empty.matrix_world.inverted() @ w

def local_dir(empty, d, frm):
    return (empty.matrix_world.to_3x3().inverted() @ (frm.matrix_world.to_3x3() @ V(d))).normalized()

# ---------------------------------------------------------------- object builders

made = []

def finish(o, parent, mat, zone, smooth=True):
    o.parent = parent
    o.matrix_parent_inverse = Matrix.Identity(4)
    o.matrix_basis = Matrix.Identity(4)
    o.data.materials.clear()
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = smooth
    o["implant"] = zone
    o["zones"] = ""
    made.append(o)
    return o

def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    return o

def emit(name, bm, parent, mat, zone, M=None, sharp=38):
    """Place a hardware bmesh (built in its own frame, see hardware.py) under a joint."""
    if M is not None:
        hw.transform(bm, M)
    o = finish(mesh_obj(name, bm), parent, mat, zone)
    # Machined parts: smooth shading, but crisp where the CAD would have an edge.
    o.data.set_sharp_from_angle(angle=math.radians(sharp))
    return o

def sphere(name, center, r, parent, mat, zone, keep=None):
    """UV sphere, optionally cut to the half-space keep=(point, normal) (kept side = along normal)."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=r)
    bmesh.ops.translate(bm, vec=V(center), verts=bm.verts)
    if keep:
        cut = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=V(keep[0]),
                                     plane_no=-V(keep[1]), clear_outer=True)
        edges = [e for e in cut["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    return emit(name, bm, parent, mat, zone)

def hull2d(P):
    P = sorted(map(tuple, P))
    def half(seq):
        h = []
        for p in seq:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (p[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (p[0] - h[-2][0]) <= 0:
                h.pop()
            h.append(p)
        return h
    lo, hi = half(P), half(P[::-1])
    return lo[:-1] + hi[:-1]

def chaikin(poly, n=3):
    """Corner-cutting: turns a convex hull into the rounded outline a machined tray has."""
    P = [np.asarray(p, float) for p in poly]
    for _ in range(n):
        Q = []
        for i in range(len(P)):
            a, b = P[i], P[(i + 1) % len(P)]
            Q += [a * 0.75 + b * 0.25, a * 0.25 + b * 0.75]
        P = Q
    return P

def shrink(poly, d):
    c = np.mean(poly, axis=0)
    return [c + (p - c) * max(1 - d / max(np.linalg.norm(p - c), 1e-9), 0.0) for p in poly]

def slab(name, outline, z0, z1, chamfer, parent, mat, zone):
    """Flat plate over a closed 2D outline with chamfered top and bottom edges."""
    rings = [(shrink(outline, chamfer), z0), (outline, z0 + chamfer), (outline, z1 - chamfer), (shrink(outline, chamfer), z1)]
    bm = bmesh.new()
    vr = [[bm.verts.new((p[0], p[1], z)) for p in ring] for ring, z in rings]
    m = len(outline)
    for a, b in zip(vr, vr[1:]):
        for k in range(m):
            j = (k + 1) % m
            bm.faces.new((a[k], a[j], b[j], b[k]))
    for ring, z in ((vr[0], z0), (vr[-1], z1)):
        c = bm.verts.new((*np.mean(outline, axis=0), z))
        for k in range(m):
            bm.faces.new((ring[k], ring[(k + 1) % m], c))
    return emit(name, hw.finish_bm(bm), parent, mat, zone)

def bone_tree(*names):
    bm = bmesh.new()
    for n in names:
        bm.from_mesh(OBJ[n].data)
    t = BVHTree.FromBMesh(bm)
    bm.free()
    return t

def bicortical(tree, head, inward, lo=0.012, hi=0.06):
    """Screw length that bites the far cortex: from the head along `inward` to where the ray
    leaves the bone again, plus a thread or so of overhang."""
    head, inward = V(head), V(inward).normalized()
    enter = tree.ray_cast(head - inward * 0.01, inward, 0.2)[0]
    if enter is None:
        return lo
    leave = tree.ray_cast(enter + inward * 0.002, inward, 0.2)[0]
    if leave is None:
        return lo
    return float(np.clip((leave - head).dot(inward) + 0.0022, lo, hi))

def cortical(length):
    """3.5 mm cortical screw, gold-anodised, spherical underside for countersunk plate holes."""
    return hw.screw(length, 0.0035, 0.0024, 0.00125, 0.006, 0.0028)

def resect(bone, point, normal, zone):
    """Copy of `bone` with everything on the `normal` side of the plane cut away."""
    src = OBJ[bone]
    bm = bmesh.new()
    bm.from_mesh(src.data)
    cut = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=V(point),
                                 plane_no=V(normal), clear_outer=True)
    edges = [e for e in cut["geom_cut"] if isinstance(e, bmesh.types.BMEdge) and e.is_valid and e.is_boundary]
    try:
        bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    except RuntimeError:
        pass
    name = bone.replace(".", " resected.", 1) if "." in bone else bone + " resected"
    o = mesh_obj(name, bm)
    o.parent = src.parent
    o.matrix_parent_inverse = Matrix.Identity(4)
    o.matrix_basis = Matrix.Identity(4)
    o.data.materials.append(src.data.materials[0])
    for p in o.data.polygons:
        p.use_smooth = True
    o["zones"] = src["zones"]
    o["resected"] = zone
    o["replaces"] = bone
    made.append(o)
    return o

# ---------------------------------------------------------------- hip: total hip replacement (left)

thigh_l, pelvis = OBJ["thigh.l"], OBJ["pelvis"]
Pp = pts("Femur proximal.l")
top = Pp[:, 2].max()
cand = Pp[(Pp[:, 2] > top - 0.05) & (Pp[:, 0] < np.percentile(Pp[:, 0], 45))]
head_c, head_r = sphere_fit(cand)
cs, us = axis(pts("Femur shaft.l"))
q = cs + us * ((head_c - cs) @ us)                  # shaft axis at the level of the head
medial = (head_c - q) / np.linalg.norm(head_c - q)
NECK_SHAFT = math.radians(130)                      # textbook angle; the mesh neck is too short to fit reliably
neck = -us * -math.cos(NECK_SHAFT) + medial * math.sin(NECK_SHAFT)  # from the neck base towards the head
coronal = np.cross(neck, us)
coronal /= np.linalg.norm(coronal)
print("REPORT hip head r", round(head_r, 4))

cut_pt = head_c - neck * (head_r + 0.006)
resect("Femur proximal.l", cut_pt, neck, "hip")
BALL = 0.016                                        # 32 mm ceramic head
sphere("Hip femoral head", head_c, BALL, thigh_l, CERAMIC, "hip")

# Stem: 12/14 trunnion in the head, an oval neck, a flared shoulder, a tapered rectangular wedge
# down the canal. Section axes: `a` medio-lateral (in the neck-shaft plane), `b` antero-posterior.
# The bend from the neck into the canal is long and gentle: a tight one pinches the wide section
# on its inside and shows as a notch. Sections are keyframed and eased, never switched.
N1 = head_c - neck * (head_r * 0.6 + 0.012)
A, B = q + us * 0.06, q + us * 0.15
bend = [((1 - t) ** 2) * N1 + 2 * (1 - t) * t * (q + us * 0.012) + t * t * A for t in np.linspace(0, 1, 16)]
spine_pts = [head_c - neck * 0.004, head_c - neck * 0.012] + bend[1:] + [A + (B - A) * t for t in np.linspace(0.1, 1, 8)]
stem_path = hw.resample(spine_pts, 0.0024)
arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(stem_path, axis=0), axis=1))]
TOTAL = arc[-1]
#        distance, half-width ML, half-width AP, squareness
STEM_KEYS = [(0.0, 0.0055, 0.0055, 2.0), (0.012, 0.0065, 0.0065, 2.0), (0.02, 0.0068, 0.0058, 2.3),
             (0.036, 0.0072, 0.006, 2.5), (0.07, 0.0128, 0.0072, 4.0), (TOTAL - 0.006, 0.0047, 0.0045, 3.0),
             (TOTAL, 0.0024, 0.0024, 2.4)]

def stem_section(i, t):
    d = arc[i]
    for (d0, a0, b0, n0), (d1, a1, b1, n1) in zip(STEM_KEYS, STEM_KEYS[1:]):
        if d <= d1:
            k = (d - d0) / max(d1 - d0, 1e-9)
            k = k * k * (3 - 2 * k)
            return hw.superellipse(a0 + (a1 - a0) * k, b0 + (b1 - b0) * k, n0 + (n1 - n0) * k, 28)
    return hw.superellipse(*STEM_KEYS[-1][1:], 28)

emit("Hip stem", hw.sweep(stem_path, stem_section, ref=np.cross(stem_path[1] - stem_path[0], coronal)), thigh_l, TITANIUM, "hip")

# Acetabular component, lathed about the cup's pole: porous-coated titanium shell, polished rim,
# polyethylene liner with a lip standing proud of the shell.
cup_c = local(pelvis, head_c, thigh_l)
opening = local_dir(pelvis, -neck, thigh_l)           # the socket opens laterally and down
pole = -opening
Ro = head_r + 0.0015
Rc = Ro - 0.0035
cupM = hw.frame(cup_c, pole)
def hemi(r, a0=0.0, a1=90.0, n=12, z_off=0.0):
    return [(r * math.sin(math.radians(a)), r * math.cos(math.radians(a)) + z_off) for a in np.linspace(a0, a1, n)]
emit("Hip cup coating", hw.lathe(hemi(Ro, 0, 86) + hemi(Ro - 0.0012, 86, 0), 48), pelvis, POROUS, "hip", cupM)
emit("Hip cup", hw.lathe(hemi(Ro - 0.001, 0, 90) + [(Ro - 0.0012, -0.0004), (Rc + 0.0006, -0.0004)] + hemi(Rc, 90, 0), 48),
     pelvis, TITANIUM, "hip", cupM)
emit("Hip liner", hw.lathe(hemi(Rc - 0.0001, 0, 90) + [(Rc + 0.0005, -0.0012), (Rc + 0.0005, -0.0019), (BALL + 0.0012, -0.0019),
                                                         (BALL + 0.0004, -0.0012)] + hemi(BALL + 0.0004, 90, 0), 48),
     pelvis, POLY, "hip", cupM)
up = V((0, 0, 1))  # the pelvis joint is barely rotated: its Z is up
for k, side in enumerate((-1, 1)):                  # two dome screws into the ilium
    d = (V(pole) + up * 0.55 + V((0, side * 0.35, 0))).normalized()
    head = V(cup_c) + d * (Rc - 0.0008)
    emit(f"Hip cup screw {k + 1}", hw.screw(0.03, 0.0065, 0.003, 0.00275, 0.0085, 0.0028, recess="hex", seg=16),
         pelvis, ANODISED, "hip", hw.frame(head, -d))

# ---------------------------------------------------------------- knee: total knee replacement (left)

shin_l = OBJ["shin.l"]
# Femoral component: a J-profile shell swept across the condyles, following the bone's own outline.
# phi = 0 points straight down, positive towards the front (-Y); the notch between the condyles is left open.
Pd = pts("Femur distal.l")
zmin = Pd[:, 2].min()
bottom = Pd[Pd[:, 2] < zmin + 0.03]
cy, cz = float(np.median(bottom[:, 1])), zmin + 0.024
xs = np.linspace(np.percentile(bottom[:, 0], 2), np.percentile(bottom[:, 0], 98), 30)
phis = np.radians(np.linspace(-112, 102, 70))
tree = bone_tree("Femur distal.l")
prof = np.full((len(phis), len(xs)), np.nan)
for j, ph in enumerate(phis):
    d = Vector((0, -math.sin(ph), -math.cos(ph)))
    for i, x in enumerate(xs):
        # shoot inwards from outside the bone: the first hit is the outer articular surface
        hit = tree.ray_cast(Vector((x, cy, cz)) + d * 0.09, -d, 0.09)
        if hit[0] is not None:
            prof[j, i] = (hit[0] - Vector((x, cy, cz))).dot(d)
for j in range(len(phis)):  # the intercondylar notch reads as a dip: leave it uncovered (back half only,
    if phis[j] > math.radians(-5):  # the trochlear groove in front is covered by the flange)
        continue
    row = prof[j]
    row[row < np.nanmedian(row) * 0.82] = np.nan
for _ in range(10):  # polished bearing surface: smooth well past the bone's facets
    pad = np.pad(prof, 1, mode="edge")
    stack = np.stack([pad[1:-1, 1:-1], pad[:-2, 1:-1], pad[2:, 1:-1], pad[1:-1, :-2], pad[1:-1, 2:]])
    prof = np.where(np.isnan(prof), np.nan, np.nanmean(stack, axis=0))
bm = bmesh.new()
grid = {}
for j, ph in enumerate(phis):
    for i, x in enumerate(xs):
        if not np.isnan(prof[j, i]):
            r = prof[j, i] + 0.0025
            grid[j, i] = bm.verts.new((x, cy - math.sin(ph) * r, cz - math.cos(ph) * r))
for j in range(len(phis) - 1):
    for i in range(len(xs) - 1):
        qd = [(j, i), (j, i + 1), (j + 1, i + 1), (j + 1, i)]
        if all(k in grid for k in qd):
            bm.faces.new([grid[k] for k in qd])
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
fem = mesh_obj("Knee femoral component", bm)
m = fem.modifiers.new("s", "SOLIDIFY"); m.thickness, m.offset, m.use_rim = 0.0028, 0.0, True
with bpy.context.temp_override(object=fem, active_object=fem):
    bpy.ops.object.modifier_apply(modifier=m.name)
finish(fem, OBJ["thigh.l"], COCR, "knee")
fem.data.set_sharp_from_angle(angle=math.radians(50))

# Tibial tray (rounded outline, chamfered), a stem with a cruciform keel, and a dished insert
Pt = pts("Tibia proximal.l")
z_cut = Pt[:, 2].max() - 0.011
ring = Pt[np.abs(Pt[:, 2] - z_cut) < 0.003][:, :2]
ctr = np.mean(hull2d(ring), axis=0)
outline = chaikin([ctr + (np.asarray(p) - ctr) * 0.95 for p in hull2d(ring)], 3)
resect("Tibia proximal.l", (0, 0, z_cut), (0, 0, 1), "knee")
slab("Knee tibial tray", outline, z_cut - 0.0035, z_cut, 0.0006, shin_l, TITANIUM, "knee")
kc = np.array((*ctr, z_cut - 0.003))
keel_path = [kc + np.array((0, 0, -s)) for s in np.linspace(0, 0.045, 24)]
emit("Knee tibial stem", hw.sweep(keel_path, lambda i, t: hw.circle(0.0068 * (1 - 0.4 * t) * (1 if t < 0.94 else 0.6), 20)),
     shin_l, TITANIUM, "knee")
for k, ref in enumerate(((1, 0, 0), (0, 1, 0))):
    blade = keel_path[:14]
    emit(f"Knee keel fin {k + 1}", hw.sweep(blade, lambda i, t, k=k: hw.superellipse((0.017 if k == 0 else 0.009) * (1 - 0.72 * t), 0.0009, 3, 12), ref),
         shin_l, TITANIUM, "knee")
# Insert: polar grid over the outline, two condylar dishes and a raised spine between them
ins = [ctr + (p - ctr) * 0.965 for p in outline]
K, Z0, H = 12, z_cut + 0.0001, 0.0105
def dish(p):
    dx = p[0] - ctr[0]
    d = 0.0
    for sx in (-0.0215, 0.0215):
        d += 0.0032 * math.exp(-(((dx - sx) / 0.016) ** 2 + ((p[1] - ctr[1] - 0.002) / 0.019) ** 2))
    return d
bm = bmesh.new()
cvert = bm.verts.new((*ctr, Z0 + H - dish(ctr)))
rings = []
for k in range(1, K + 1):
    f = k / K
    ringv = []
    for p in ins:
        xy = ctr + (p - ctr) * f
        ringv.append(bm.verts.new((*xy, Z0 + H - dish(xy) - 0.0012 * f ** 10)))
    rings.append(ringv)
m_ = len(ins)
for k in range(m_):
    bm.faces.new((cvert, rings[0][k], rings[0][(k + 1) % m_]))
for a, b in zip(rings, rings[1:]):
    for k in range(m_):
        j = (k + 1) % m_
        bm.faces.new((a[k], b[k], b[j], a[j]))
low = [bm.verts.new((*p, Z0)) for p in ins]
for k in range(m_):
    j = (k + 1) % m_
    bm.faces.new((rings[-1][k], low[k], low[j], rings[-1][j]))
cb = bm.verts.new((*ctr, Z0))
for k in range(m_):
    bm.faces.new((cb, low[(k + 1) % m_], low[k]))
emit("Knee insert", hw.finish_bm(bm), shin_l, POLY, "knee", sharp=60)

# ---------------------------------------------------------------- shoulder: anatomic total shoulder (right)

arm_r, chest = OBJ["upper_arm.r"], OBJ["chest"]
Ph = pts("Humerus proximal.r")
top = Ph[:, 2].max()
cand = Ph[(Ph[:, 2] > top - 0.045) & (Ph[:, 0] > np.percentile(Ph[:, 0], 50))]  # medial half: x towards 0
hh_c, hh_r = sphere_fit(cand)
ca, ua = axis(pts("Humerus shaft.r"))
qa = ca + ua * ((hh_c - ca) @ ua)
hmed = (hh_c - qa) / np.linalg.norm(hh_c - qa)
hneck = -ua * -math.cos(math.radians(135)) + hmed * math.sin(math.radians(135))
hcor = np.cross(hneck, ua); hcor /= np.linalg.norm(hcor)
print("REPORT humeral head r", round(hh_r, 4))
hcut = hh_c + hneck * hh_r * 0.2  # anatomical neck: the prosthetic head is a dome, not a ball
resect("Humerus proximal.r", hcut, hneck, "shoulder")
sphere("Shoulder humeral head", hh_c, hh_r, arm_r, COCR, "shoulder", keep=(hcut, hneck))
sp = [hcut - hneck * 0.001] + [((1 - t) ** 2) * hcut + 2 * (1 - t) * t * qa + t * t * (qa + ua * 0.03)
                               for t in np.linspace(0.15, 1, 8)] + [qa + ua * 0.03 + ua * s for s in np.linspace(0.01, 0.09, 6)]
sp = hw.resample(sp, 0.0018)
emit("Shoulder stem", hw.sweep(sp, lambda i, t: hw.superellipse((0.0095 - 0.0062 * t) * (1 if t < 0.95 else 0.6),
                                                                  (0.0068 - 0.0032 * t) * (1 if t < 0.95 else 0.6), 3.6 - t, 24),
                               ref=np.cross(sp[1] - sp[0], hcor)), arm_r, TITANIUM, "shoulder")
# Glenoid: a polyethylene bowl matched to the head, three ribbed pegs into the scapula
Ps = pts("Scapula.r")
hc_chest = np.array(local(chest, hh_c, arm_r))
near = Ps[np.linalg.norm(Ps - hc_chest, axis=1) < hh_r + 0.012]
g = near.mean(0)
gn = (hc_chest - g) / np.linalg.norm(hc_chest - g)
e1 = ortho((0, 0, 1), gn); e2 = np.cross(gn, e1)
Rg, Rs = 0.0125, hh_r + 0.002
sag = lambda r: Rs - math.sqrt(Rs * Rs - r * r)
bowl = [(0.0, 0.0), (Rg * 0.97, 0.0), (Rg, 0.0006), (Rg, 0.0042)] + [(r, 0.0046 - (sag(Rg) - sag(r))) for r in np.linspace(Rg * 0.97, 0, 10)]
gM = hw.frame(g - gn * 0.0008, gn, e1)
emit("Shoulder glenoid", hw.lathe(bowl, 40), chest, POLY, "shoulder", gM)
for k, (a, b) in enumerate(((0.006, 0), (-0.005, 0.005), (-0.005, -0.005))):
    peg = [(0.0, 0.0005)] + [(0.0021 if j % 2 else 0.0026, -0.0012 * j) for j in range(8)] + [(0.0012, -0.0102), (0.0, -0.0104)]
    emit(f"Shoulder glenoid peg {k + 1}", hw.lathe(peg, 16), chest, POLY, "shoulder",
         hw.frame(g - gn * 0.0008 + e1 * a + e2 * b, gn, e1))

# ---------------------------------------------------------------- spine: pedicle screws L3-L5 with rods

lumbar = OBJ["lumbar"]
ROD_R = 0.00275                                     # 5.5 mm rod
seats = {-1: [], 1: []}
for lv in ("Vertebra L3", "Vertebra L4", "Vertebra L5"):
    P = pts(lv)
    body = P[P[:, 1] < np.percentile(P[:, 1], 40)]
    bc = body.mean(0)
    for s in (-1, 1):
        entry = bc + np.array((s * 0.022, 0.036, 0.002))
        target = bc + np.array((s * 0.005, -0.008, 0.0))
        d = (target - entry) / np.linalg.norm(target - entry)
        tag = f"{lv[-2:]} {'rl'[s > 0]}"
        emit(f"Spine screw {tag}", hw.screw(0.045, 0.0065, 0.0045, 0.0028, 0.0082, 0.004, recess="star", seg=14),
             lumbar, TITANIUM, "spine", hw.frame(entry, -d))
        origin = V(entry) - V(d) * 0.0024          # the tulip's cup sits round the screw's ball head
        emit(f"Spine tulip {tag}", hw.tulip(ROD_R), lumbar, ANODISED, "spine", hw.frame(origin, -d, (0, 0, 1)))
        seats[s].append(origin - V(d) * (0.0045 + ROD_R))
for s, hs in seats.items():
    hs.sort(key=lambda p: -p.z)
    ext = [hs[0] + (hs[0] - hs[1]) * 0.28] + hs + [hs[-1] + (hs[-1] - hs[-2]) * 0.28]
    emit(f"Spine rod {'rl'[s > 0]}", hw.rod(ext, ROD_R, 20, 0.002), lumbar, COCR, "spine")

# ---------------------------------------------------------------- trauma: femoral nail and tibial plate (right)

thigh_r, shin_r = OBJ["thigh.r"], OBJ["shin.r"]
femur_r = ("Femur proximal.r", "Femur shaft.r", "Femur distal.r")
Pf = pts(*femur_r)
lo, hi = span(Pf)
L = hi - lo
nail = canal(Pf, lo + 0.02 * L, hi - 0.12 * L)
nail = np.vstack([nail[0] - (nail[1] - nail[0]) * 0.5, nail])
nail_path = hw.resample(nail, 0.006)
def nail_section(i, t):
    r = 0.0065 if t < 0.12 else (0.0065 - 0.001 * min((t - 0.12) / 0.08, 1))
    if t > 0.975:
        r *= 0.45 + 0.55 * (1 - t) / 0.025
    # three shallow longitudinal flutes, as on reamed nails
    return [((r * (1 - 0.06 * max(0.0, math.cos(3 * th)) ** 8)) * math.cos(th), (r * (1 - 0.06 * max(0.0, math.cos(3 * th)) ** 8)) * math.sin(th))
            for th in np.linspace(0, TAU, 24, endpoint=False)]
emit("Trauma femoral nail", hw.sweep(nail_path, nail_section), thigh_r, TITANIUM, "trauma")
tree = bone_tree(*femur_r)
lat = V((-1.0, 0, 0))  # lateral for the right side
for k, i in enumerate((4, 7, len(nail) - 5, len(nail) - 2)):
    c = V(nail[i])
    outer = tree.ray_cast(c + lat * 0.08, -lat, 0.1)[0] or (c + lat * 0.02)
    head = outer + lat * 0.0005
    length = bicortical(tree, head, -lat, 0.03, 0.07)
    emit(f"Trauma nail lock {k + 1}", hw.screw(length, 0.005, 0.0041, 0.0015, 0.008, 0.0034, underside="flat"),
         thigh_r, ANODISED, "trauma", hw.frame(head, lat))

tib_r = ("Tibia shaft.r", "Tibia proximal.r", "Tibia distal.r")
Pt = pts(*tib_r)
lo, hi = span(Pt)
line, u, side = surface_line(Pt, (1.0, -0.55, 0), lo + 0.3 * (hi - lo), hi - 0.22 * (hi - lo), 36)
Lp = float(np.sum(np.linalg.norm(np.diff(line, axis=0), axis=1)))
holes = [(0.0085 + k * (Lp - 0.017) / 9, 0.00185) for k in range(10)]
bm, seats_p = hw.plate(line, side, holes, 0.0125, 0.0036, gap=0.0004, wrap=14.0)
emit("Trauma tibial plate", bm, shin_r, TITANIUM, "trauma")
tree = bone_tree(*tib_r)
for k in (0, 1, 3, 5, 6, 8, 9):
    p, inward = seats_p[k]
    emit(f"Trauma plate screw {k + 1}", cortical(bicortical(tree, p, inward, 0.02, 0.05)), shin_r, ANODISED, "trauma",
         hw.frame(p, -inward))

# ---------------------------------------------------------------- foot & ankle: distal fibula plate + malleolar screws (left)

fib_l = ("Fibula distal.l", "Fibula shaft.l")
Pfib = pts(*fib_l)
lo, hi = span(Pfib)
line, u, side = surface_line(Pfib, (1.0, 0.1, 0), hi - 0.14, hi - 0.012, 30)
Lp = float(np.sum(np.linalg.norm(np.diff(line, axis=0), axis=1)))
holes = [(0.007 + k * (Lp - 0.014) / 7, 0.0017) for k in range(8)]
# One-third tubular: thin and strongly curved across its width
bm, seats_p = hw.plate(line, side, holes, 0.0096, 0.0016, gap=0.0003, wrap=40.0)
emit("Ankle fibular plate", bm, shin_l, TITANIUM, "foot-ankle")
tree = bone_tree(*fib_l)
for k in (0, 1, 2, 4, 6, 7):
    p, inward = seats_p[k]
    emit(f"Ankle plate screw {k + 1}", cortical(bicortical(tree, p, inward, 0.012, 0.03)), shin_l, ANODISED, "foot-ankle",
         hw.frame(p, -inward))
Ptd = pts("Tibia distal.l")
tip = Ptd[Ptd[:, 2] < Ptd[:, 2].min() + 0.02]
tip = tip[np.argsort(tip[:, 0])[:40]].mean(0)  # medial malleolus: lowest, most medial part
for k, dy in enumerate((-0.006, 0.006)):
    start = tip + np.array((-0.002, dy, -0.004))
    d = V((0.35, 0, 1)).normalized()
    emit(f"Ankle malleolar screw {k + 1}", hw.screw(0.04, 0.004, 0.0019, 0.00175, 0.006, 0.0028, thread_len=0.016, underside="flat"),
         shin_l, ANODISED, "foot-ankle", hw.frame(start, -d))

# ---------------------------------------------------------------- sports: ACL reconstruction (right knee) + cuff anchors (left)

Pfd = pts("Femur distal.r")
Ptp = pts("Tibia proximal.r")
fz = Pfd[:, 2].min()
notch = np.array((Pfd[:, 0].mean() - 0.007, np.percentile(Pfd[:, 1], 70), fz + 0.016))
F = np.array(local(shin_r, notch, thigh_r))
tz = Ptp[:, 2].max() - 0.008
T = np.array((Ptp[:, 0].mean() + 0.002, Ptp[:, 1].mean() - 0.006, tz))
E = T + np.array((0.014, -0.022, -0.045))            # tibial tunnel exit, anteromedial
Fx = F + np.array((-0.03, 0.004, 0.022))             # femoral tunnel exit, lateral cortex
graft = [Fx + (F - Fx) * t for t in np.linspace(0, 1, 4)] + [F + (T - F) * t for t in np.linspace(0.2, 1, 5)] \
        + [T + (E - T) * t for t in np.linspace(0.2, 0.9, 4)]
emit("Sports ACL graft", hw.braid(graft, 0.0042, count=7, step=0.002), shin_r, GRAFT, "sports", sharp=80)
d = (E - T) / np.linalg.norm(E - T)
emit("Sports interference screw", hw.screw(0.022, 0.008, 0.0066, 0.0025, 0, 0, recess="hex", seg=18, cannulated=0.0011),
     shin_r, PEEK, "sports", hw.frame(E, d))
fd = (Fx - F) / np.linalg.norm(Fx - F)
e1 = ortho((0, 1, 0), fd)
button_line = [Fx + fd * 0.0003 + e1 * s for s in np.linspace(-0.006, 0.006, 8)]
bm, _ = hw.plate(button_line, fd, [(0.0035, 0.0007), (0.0085, 0.0007)], 0.0042, 0.0014, gap=0.0, rt_scale=1.15)
emit("Sports cortical button", bm, shin_r, TITANIUM, "sports")
loop = [Fx + e1 * -0.0025 + fd * 0.0012, Fx - fd * 0.004, F + (Fx - F) * 0.3, Fx - fd * 0.004 + e1 * 0.0008, Fx + e1 * 0.0025 + fd * 0.0012]
emit("Sports ACL suture loop", hw.rod(loop, 0.00045, 6, 0.001), shin_r, SUTURE, "sports")

arm_l = OBJ["upper_arm.l"]
Phl = pts("Humerus proximal.l")
topz = Phl[:, 2].max()
gt = Phl[Phl[:, 2] > topz - 0.03]
for k, dy in enumerate((-0.01, 0.0, 0.01)):
    band = gt[np.abs(gt[:, 1] - (np.median(gt[:, 1]) + dy)) < 0.003]
    p = band[np.argmax(band[:, 0] + band[:, 2] * 0.6)]   # lateral-top: greater tuberosity
    dirn = V((-0.8, 0, -0.6)).normalized()
    back = V(p) + V((0.0004, 0, 0.0003))
    emit(f"Sports cuff anchor {k + 1}", hw.screw(0.013, 0.005, 0.0034, 0.0016, 0, 0, recess="hex", tip="self", seg=16),
         arm_l, PEEK, "sports", hw.frame(back, -dirn))
    for j, off in enumerate((-0.0012, 0.0012)):     # two limbs of suture per anchor, up into the cuff
        s0 = back - dirn * 0.0008 + V((0, off, 0))
        emit(f"Sports suture {k + 1}{'ab'[j]}", hw.rod([s0, s0 + V((-0.004, dy * 0.3 + off, 0.008)), s0 + V((-0.016, dy * 0.5 + off * 2, 0.012))],
                                                    0.00042, 6, 0.0012), arm_l, SUTURE, "sports")

# ---------------------------------------------------------------- hide by default, save

for o in made:
    o.hide_render = True
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in made if "implant" in o)
print(f"REPORT implants={len([o for o in made if 'implant' in o])} tris={tris} resected={len([o for o in made if 'resected' in o])}")

# ---------------------------------------------------------------- x-ray previews per zone

xray = principled("Bone x-ray", (0.78, 0.84, 0.92), 0.5, alpha=0.16)
xray_zone = principled("Bone x-ray zone", (0.6, 0.78, 1.0), 0.5, alpha=0.3)
bones = [o for o in OBJ if o.type == "MESH" and "zones" in o and "implant" not in o and not o.name.startswith("Cap")]
orig = {o.name: o.data.materials[0] for o in bones}
scene.render.engine = "BLENDER_EEVEE"
scene.view_settings.view_transform = "Standard"
scene.world = bpy.data.worlds.new("xray")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.1, 0.115, 0.14, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
scene.eevee.taa_render_samples = 128

def light(name, energy, size, loc):
    d = bpy.data.lights.new(name, "AREA"); d.energy, d.size = energy, size
    o = bpy.data.objects.new(name, d); scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 0.9)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

light("key", 220, 1.5, (-1.6, -2.2, 2.4))
light("fill", 80, 2.0, (2.2, -1.5, 1.2))
light("rim", 200, 1.0, (0.8, 2.5, 2.2))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = 70
scene.collection.objects.link(cam)
scene.camera = cam

def shoot(label, target, yaw, dist, elev=0.0, res=(1000, 1000)):
    a = math.radians(yaw)
    cam.location = V(target) + Vector((math.sin(a), -math.cos(a), elev)) * dist
    cam.rotation_euler = (V(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = f"{OUT}-{label}.png"
    bpy.ops.render.render(write_still=True)

def show_zone(zone):
    for o in bones:
        zs = o["zones"].split(",")
        o.data.materials[0] = xray_zone if zone and zone in zs else xray
        if "resected" in o:
            o.hide_render = o["resected"] != zone and zone != "*"
        elif zone and any(r.get("replaces") == o.name and (r["resected"] == zone or zone == "*") for r in made if "resected" in r):
            o.hide_render = True
        else:
            o.hide_render = False
    for o in made:
        if "implant" in o:
            o.hide_render = not (zone == "*" or o["implant"] == zone)

VIEWS = [("hip", "hip", "", 0), ("knee", "knee", "", 25), ("shoulder", "shoulder", "", -25), ("spine", "spine", "", 145),
         ("trauma", "trauma", "", -20), ("sports-knee", "sports", "Sports ACL|Sports interference|Sports cortical", 20),
         ("sports-shoulder", "sports", "Sports cuff|Sports suture", 70), ("foot-ankle", "foot-ankle", "", 75)]
for label, zone, only, yaw in VIEWS:
    zoom = 1.0
    show_zone(zone)
    parts = [o for o in made if o.get("implant") == zone and (not only or o.name.startswith(tuple(only.split("|"))))]
    ws = [o.matrix_world @ Vector(c) for o in parts for c in o.bound_box]
    lo = Vector([min(p[i] for p in ws) for i in range(3)]); hi = Vector([max(p[i] for p in ws) for i in range(3)])
    ext = max((hi - lo).length, 0.12)
    shoot(f"xray-{label}", (lo + hi) / 2, yaw, ext * 2.6 * zoom, 0.05)
show_zone("*")
shoot("xray-all", (0, 0, 0.86), 0, 4.2, 0, (900, 1350))
for o in bones:
    o.data.materials[0] = orig[o.name]
