"""Parametric orthopaedic hardware for implants.py: screws with real threads and drive recesses,
plates with countersunk holes contoured to the bone, swept stems and nails, lathed cups and
liners, polyaxial tulips, braided grafts.

Every builder returns a bmesh in a local frame: +Z is the implant's axis (for a screw, from the
tip towards the head; the head's underside sits at z = 0). `frame(origin, z, x)` makes the matrix
that places it. Dimensions are metres and follow the common catalogue sizes (3.5 mm cortical,
4.0 mm cancellous, 5.0 mm locking, 6.5 mm pedicle...).
"""
import math
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

TAU = 2 * math.pi


def frame(origin, z, x=None):
    """Matrix whose Z axis is `z` and X axis is `x` made orthogonal to it."""
    z = Vector(tuple(z)).normalized()
    x = Vector(tuple(x)) if x is not None else (Vector((1, 0, 0)) if abs(z.x) < 0.9 else Vector((0, 1, 0)))
    x = (x - z * x.dot(z)).normalized()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = Vector(tuple(origin))
    return m


def finish_bm(bm, weld=1e-6):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


# ---------------------------------------------------------------- lathe

def lathe(profile, seg):
    """Surface of revolution about Z. `profile` rows are (r, z) where r is a number or r(theta).
    A row with r == 0 closes the surface to a point."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = []
        for i in range(seg):
            th = TAU * i / seg
            rr = r(th) if callable(r) else r
            ring.append(bm.verts.new((rr * math.cos(th), rr * math.sin(th), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    return finish_bm(bm)


# ---------------------------------------------------------------- screws

def thread_profile(phase):
    """Buttress-like thread section over one pitch: 0 at the root, 1 at the crest."""
    p = phase % 1.0
    if p < 0.18:
        return p / 0.18
    if p < 0.32:
        return 1.0
    if p < 0.62:
        return 1.0 - (p - 0.32) / 0.30
    return 0.0


def screw(length, major, minor, pitch, head_d=0.0, head_h=0.0, thread_len=None, recess="hex",
          tip="blunt", seg=12, rows_per_pitch=3, cannulated=0.0, underside="sphere"):
    """Bone screw, tip at z = -length, head underside at z = 0 (headless when head_d == 0).

    `recess`: "hex" or "star" drive socket in the head (or in the back of a headless screw).
    `thread_len`: threaded length from the tip; the rest is a smooth shank a hair under the major
    diameter, as on partially threaded cancellous lag screws."""
    R, r = major / 2, minor / 2
    thread_len = length if thread_len is None else thread_len
    prof = []
    # -- head (or the flat back of a headless screw), top down
    top = head_h if head_d else 0.0
    rec_r = (head_d * 0.28) if head_d else R * 0.45
    rec_depth = (head_h * 0.6) if head_d else min(length * 0.25, 0.004)

    def socket(th):
        if recess == "star":  # hexalobular
            return rec_r * (0.82 + 0.18 * math.cos(6 * th))
        k = math.cos(math.pi / 6) / math.cos(((th + math.pi / 6) % (math.pi / 3)) - math.pi / 6)
        return rec_r * k

    prof.append((0.0, top - rec_depth))
    prof.append((lambda th: socket(th) * 0.55, top - rec_depth))
    prof.append((socket, top - rec_depth * 0.8))
    prof.append((socket, top))
    if head_d:
        H = head_d / 2
        # low dome from the socket rim out to the head's edge
        for t in np.linspace(0.15, 1.0, 5):
            rr = rec_r + (H * 0.92 - rec_r) * t
            prof.append((rr, top - head_h * 0.25 * t * t))
        prof.append((H, top - head_h * 0.35))
        prof.append((H, top - head_h * 0.65))
        # underside: spherical (seats in a countersink) or flat
        if underside == "sphere":  # seats in a countersunk hole
            for t in np.linspace(0.25, 1.0, 4):
                prof.append((H - (H - R) * t, head_h * 0.35 * math.sqrt(max(1 - t * t, 0.0))))
        else:
            prof.append((R * 1.02, 0.0))
        z = 0.0
    else:
        prof.append((R * 0.94, top))
        z = top - 0.0004
    # -- smooth shank
    shank_end = -(length - thread_len)
    if shank_end < z - 1e-5:
        prof.append((R * 0.96, z - 0.0003))
        prof.append((R * 0.96, shank_end))
        z = shank_end
    # -- thread, a helix: radius depends on angle and height
    n = max(int((z + length) / pitch * rows_per_pitch), 4)
    tip_len = pitch * (1.6 if tip == "blunt" else 2.4)
    for k in range(n + 1):
        zz = z - (z + length) * k / n
        from_tip = zz + length
        fade = min(1.0, from_tip / tip_len) if from_tip < tip_len else 1.0
        core = r * (0.55 + 0.45 * fade) if tip != "blunt" else r * (0.85 + 0.15 * fade)
        crest = core + (R - r) * fade
        prof.append((lambda th, zz=zz, core=core, crest=crest:
                     core + (crest - core) * thread_profile(zz / pitch + th / TAU), zz))
    if cannulated:
        prof.append((cannulated, -length))
        prof.append((cannulated, -length + 0.002))
    else:
        prof.append((r * (0.5 if tip == "blunt" else 0.15), -length - 0.0004))
        prof.append((0.0, -length - 0.0006))
    return lathe(prof, seg)


# ---------------------------------------------------------------- sweeps

def transport_frames(path, ref):
    """Rotation-minimising frames along a polyline: (T, N, B) per point, N starting near `ref`."""
    P = [Vector(tuple(p)) for p in path]
    T = []
    for i in range(len(P)):
        a, b = P[max(i - 1, 0)], P[min(i + 1, len(P) - 1)]
        T.append((b - a).normalized())
    N0 = Vector(tuple(ref))
    N0 = (N0 - T[0] * N0.dot(T[0])).normalized()
    frames = [(T[0], N0, T[0].cross(N0))]
    for i in range(1, len(P)):
        t0, n0, _ = frames[-1]
        t1 = T[i]
        axis = t0.cross(t1)
        if axis.length > 1e-9:
            ang = t0.angle(t1)
            n1 = Matrix.Rotation(ang, 3, axis.normalized()) @ n0
        else:
            n1 = n0.copy()
        n1 = (n1 - t1 * n1.dot(t1)).normalized()
        frames.append((t1, n1, t1.cross(n1)))
    return P, frames


def sweep(path, section, ref=(1, 0, 0), caps=True):
    """Extrude closed 2D sections along a path. `section(i, t)` returns [(u, v), ...] in the plane
    (N, B) at point i (t in 0..1 along the path); every section must have the same point count."""
    P, frames = transport_frames(path, ref)
    bm = bmesh.new()
    rings = []
    for i, (p, (t, n, b)) in enumerate(zip(P, frames)):
        pts = section(i, i / (len(P) - 1))
        rings.append([bm.verts.new(p + n * u + b * v) for u, v in pts])
    m = len(rings[0])
    for a, c in zip(rings, rings[1:]):
        for k in range(m):
            j = (k + 1) % m
            bm.faces.new((a[k], a[j], c[j], c[k]))
    if caps:
        for ring, p in ((rings[0], P[0]), (rings[-1], P[-1])):
            ctr = bm.verts.new(sum((v.co for v in ring), Vector()) / m)
            for k in range(m):
                bm.faces.new((ring[k], ring[(k + 1) % m], ctr))
    return finish_bm(bm)


def superellipse(a, b, n=4.0, count=24):
    """Rounded rectangle with half-widths a, b; n = 2 is an ellipse, higher is squarer."""
    out = []
    for k in range(count):
        th = TAU * k / count
        c, s = math.cos(th), math.sin(th)
        out.append((a * math.copysign(abs(c) ** (2 / n), c), b * math.copysign(abs(s) ** (2 / n), s)))
    return out


def circle(r, count=16):
    return [(r * math.cos(TAU * k / count), r * math.sin(TAU * k / count)) for k in range(count)]


def resample(path, step):
    """Polyline resampled to roughly equal steps (Catmull-Rom through the input points)."""
    P = [np.asarray(p, float) for p in path]
    if len(P) < 3:
        a, b = P[0], P[-1]
        n = max(int(np.linalg.norm(b - a) / step), 1)
        return [a + (b - a) * k / n for k in range(n + 1)]
    ext = [2 * P[0] - P[1]] + P + [2 * P[-1] - P[-2]]
    dense = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for t in np.linspace(0, 1, 12, endpoint=False):
            t2, t3 = t * t, t * t * t
            dense.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    dense.append(P[-1])
    seg = np.linalg.norm(np.diff(dense, axis=0), axis=1)
    s = np.r_[0, np.cumsum(seg)]
    n = max(int(s[-1] / step), 2)
    out = []
    for q in np.linspace(0, s[-1], n + 1):
        i = min(np.searchsorted(s, q), len(dense) - 1)
        i0 = max(i - 1, 0)
        f = 0 if s[i] == s[i0] else (q - s[i0]) / (s[i] - s[i0])
        out.append(dense[i0] + (dense[i] - dense[i0]) * f)
    return out


def rod(path, r, count=16, step=0.003, ref=(1, 0, 0)):
    P = resample(path, step)
    return sweep(P, lambda i, t: circle(r, count), ref)


def braid(path, r, strands=4, twist=0.022, count=8, step=0.0015):
    """Tendon graft: strands wound round the path, one full twist every `twist` metres."""
    P = resample(path, step)
    L = sum(np.linalg.norm(np.subtract(P[i + 1], P[i])) for i in range(len(P) - 1))
    _, frames = transport_frames(P, (0, 0, 1))
    bm = bmesh.new()
    me_tmp = []
    for k in range(strands):
        pts, s = [], 0.0
        for i, (p, (t, n, b)) in enumerate(zip(P, frames)):
            if i:
                s += np.linalg.norm(np.subtract(P[i], P[i - 1]))
            a = TAU * (k / strands + s / twist)
            pts.append(Vector(tuple(p)) + (n * math.cos(a) + b * math.sin(a)) * r * 0.55)
        me_tmp.append(sweep(pts, lambda i, t: circle(r * 0.5, count), (0, 0, 1)))
    return merge(me_tmp)


def merge(bms):
    import bpy
    out = bmesh.new()
    for b in bms:
        me = bpy.data.meshes.new("tmp")
        b.to_mesh(me)
        b.free()
        out.from_mesh(me)
        bpy.data.meshes.remove(me)
    return out


def transform(bm, m):
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    if m.determinant() < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return bm


# ---------------------------------------------------------------- plates

def plate(line, side, length_holes, width, thick, gap=0.0006, wrap=0.0, end_round=True,
          width_fn=None, rt_scale=1.55, samples_per_mm=1.0):
    """A bone plate laid on `line` (points on the bone surface, ordered along the plate), facing
    `side` (outward normal, one vector or one per point).

    `length_holes`: [(s, hole_r)] with s the arc length (m) of each hole's centre from the start;
    hole_r the through-hole radius at the bone side. Holes are countersunk: `rt_scale` times wider
    at the top. `wrap` bends the plate round the bone: the edges drop by wrap * w^2.
    Returns (bm, seats) where seats are [(point, inward_axis)] at the hole centres, top surface."""
    P = [np.asarray(p, float) for p in line]
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    S = np.r_[0, np.cumsum(seg)]
    L = S[-1]
    sides = [np.asarray(side, float)] * len(P) if np.ndim(side) == 1 else [np.asarray(s_, float) for s_ in side]

    def frame_at(s):
        i = int(np.clip(np.searchsorted(S, s) - 1, 0, len(P) - 2))
        f = (s - S[i]) / max(S[i + 1] - S[i], 1e-9)
        p = P[i] + (P[i + 1] - P[i]) * f
        t = (P[i + 1] - P[i]) / max(np.linalg.norm(P[i + 1] - P[i]), 1e-9)
        n = sides[i] * (1 - f) + sides[i + 1] * f
        n = n - t * (n @ t)
        n /= np.linalg.norm(n)
        a = np.cross(n, t)
        return p, t, n, a

    hw = (lambda s: (width_fn(s) if width_fn else width) / 2)
    # 2D outline: right edge, far end cap, left edge back, near end cap
    step = 1.0 / (samples_per_mm * 1000)
    ss = np.linspace(0, L, max(int(L / step), 8))
    outline = []
    cap = 10

    def end_cap(s_c, sign):
        h = hw(s_c)
        pts = []
        for k in range(1, cap):
            a = math.pi * k / cap
            pts.append((s_c + sign * h * math.sin(a), h * math.cos(a) * (1 if sign > 0 else -1)))
        return pts

    s0, s1 = hw(0), L - hw(L)
    right = [(s, -hw(s)) for s in ss if s0 <= s <= s1]
    left = [(s, hw(s)) for s in ss[::-1] if s0 <= s <= s1]
    far = [(s1 + hw(s1) * math.sin(math.pi * k / cap), -hw(s1) * math.cos(math.pi * k / cap)) for k in range(1, cap)]
    near = [(s0 - hw(s0) * math.sin(math.pi * k / cap), hw(s0) * math.cos(math.pi * k / cap)) for k in range(1, cap)]
    outline = right + far + left + near

    HN = 18
    holes_b, holes_t = [], []
    for s, hr in length_holes:
        holes_b.append([(s + hr * math.cos(TAU * k / HN), hr * math.sin(TAU * k / HN)) for k in range(HN)])
        rt = hr * rt_scale
        holes_t.append([(s + rt * math.cos(TAU * k / HN), rt * math.sin(TAU * k / HN)) for k in range(HN)])

    def place(s, w, h):
        p, t, n, a = frame_at(s)
        return Vector(tuple(p + a * w + n * (gap + h - wrap * w * w)))

    bm = bmesh.new()

    def face_layer(loops, h, flip):
        flat = [pt for loop in loops for pt in loop]
        verts = [bm.verts.new(place(s, w, h)) for s, w in flat]
        tris = tessellate_polygon([[Vector((s, w, 0)) for s, w in loop] for loop in loops])
        for tri in tris:
            vs = [verts[i] for i in tri]
            if flip:
                vs = vs[::-1]
            try:
                bm.faces.new(vs)
            except ValueError:
                pass
        # verts per loop, for walls
        out, k = [], 0
        for loop in loops:
            out.append(verts[k:k + len(loop)])
            k += len(loop)
        return out

    bottom = face_layer([outline] + holes_b, 0.0, True)
    top = face_layer([outline] + holes_t, thick, False)

    def wall(lo, hi, reverse=False):
        m = len(lo)
        for k in range(m):
            j = (k + 1) % m
            q = (lo[k], lo[j], hi[j], hi[k])
            bm.faces.new(q[::-1] if reverse else q)

    wall(bottom[0], top[0])
    for hb, ht in zip(bottom[1:], top[1:]):
        wall(hb, ht, reverse=True)
    finish_bm(bm)

    seats = []
    for s, hr in length_holes:
        p, t, n, a = frame_at(s)
        seats.append((Vector(tuple(p + n * (gap + thick * 0.55))), Vector(tuple(-n))))
    return bm, seats


# ---------------------------------------------------------------- small parts

def annulus_sector(r_in, r_out, a0, a1, z0, z1, n=10):
    """Prism over a ring sector (a0..a1 radians) between heights z0 and z1."""
    bm = bmesh.new()
    angs = np.linspace(a0, a1, n)
    ring = [(r_out * math.cos(a), r_out * math.sin(a)) for a in angs] + [(r_in * math.cos(a), r_in * math.sin(a)) for a in angs[::-1]]
    lo = [bm.verts.new((x, y, z0)) for x, y in ring]
    hi = [bm.verts.new((x, y, z1)) for x, y in ring]
    m = len(ring)
    bmesh.ops.contextual_create(bm, geom=lo)
    bmesh.ops.contextual_create(bm, geom=hi)
    for k in range(m):
        j = (k + 1) % m
        bm.faces.new((lo[k], lo[j], hi[j], hi[k]))
    return finish_bm(bm)


def tulip(rod_r, outer_r=0.0055, height=0.013, seg=28):
    """Polyaxial pedicle-screw head: a cup that grips the screw's spherical head, two ears
    either side of a U-slot for the rod, and the set screw on top. Rod axis along X at z = rod_r + base."""
    base = 0.0045
    inner = rod_r * 1.05
    parts = [lathe([(0.0, -0.0035), (outer_r * 0.7, -0.0035), (outer_r, -0.001), (outer_r, base), (inner, base),
                    (inner, base - 0.0008), (0.0, base - 0.0008)], seg)]
    half_slot = math.asin(min(inner / outer_r, 0.99))
    for c in (0.0, math.pi):  # ears centred on +Y and -Y, slot along X
        parts.append(annulus_sector(inner, outer_r, c + math.pi / 2 - (math.pi / 2 - half_slot), c + math.pi / 2 + (math.pi / 2 - half_slot),
                                    base, base + height - 0.0035))
    # set screw, sitting on the rod
    zs = base + 2 * rod_r
    parts.append(lathe([(0.0, zs + 0.0008), (inner * 0.45, zs + 0.0008), (inner * 0.45, zs + 0.0016),
                        (lambda th: inner * (0.96 + 0.04 * math.cos(20 * th)), zs + 0.0016),
                        (lambda th: inner * (0.96 + 0.04 * math.cos(20 * th)), zs + 0.0045), (0.0, zs + 0.0045)], 20))
    return merge(parts)
