"""General screw generator for blender_kit.swept (pure Python, importable anywhere).

A screw is a core polyline (s, r) from the tip (s = 0) to the top (s = length), threads laid
on it as radial offsets, and features that cut it per azimuth. Every column of the sweep is
the same list of sample positions, so the columns join into one structured surface; the
thread at azimuth phi is the same profile shifted by the helix, which makes a true helix.

  Thread    zone [s0, s1], crest height, pitch (constant or varying linearly over the zone,
            for compression screws), crest form, number of leads, run-in / run-out
  Flat      chordal cut: self-tapping flutes at the tip, anti-rotation flats, set-screw grooves
  Channel   cylindrical groove along the shaft (a second screw nests in it)
  Blades    helical blades of a PFNA-type neck blade
  top       hex / star socket, a slot across the top, cannulation

Crest forms are smoothstep bumps with a short flat top: the sample grid does not move with
the helix, and a crest without a flat would be cut at a different height on every column
(a ripple along the crest that shows in reflections).
"""
import math
from dataclasses import dataclass, field
import numpy as np


def smooth(e0, e1, x):
    if e1 == e0:
        return 1.0 if x >= e1 else 0.0
    t = min(max((x - e0) / (e1 - e0), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def _bump(u, r0, r1, f0, f1):
    return smooth(r0, r1, u) * (1 - smooth(f0, f1, u))


# u in [0, 1) runs one pitch towards the head. The load flank (steep) faces the head.
CRESTS = {
    "cortical":   lambda u: _bump(u, 0.02, 0.34, 0.44, 0.66),
    "cancellous": lambda u: _bump(u, 0.02, 0.34, 0.40, 0.50),
    "fine":       lambda u: _bump(u, 0.04, 0.44, 0.54, 0.94),
    "bio":        lambda u: (0.5 + 0.5 * math.cos(2 * math.pi * (u - 0.5))) ** 0.55,
}


def ang(a):
    """Wrap an angle to (-pi, pi]."""
    return (a + math.pi) % (2 * math.pi) - math.pi


@dataclass
class Thread:
    s0: float
    s1: float
    height: float                  # crest above the core
    pitch: object                  # float, or (pitch at s0, pitch at s1)
    form: str = "cortical"
    leads: int = 1
    run_in: float = 1.0            # height ramps up over this length after s0 ...
    run_out: float = 1.0           # ... and down before s1
    phase: float = 0.0             # turns
    fractions: list = None         # sample positions within a pitch (default: per_pitch uniform);
                                   # height 0 + fractions: a helix-locked grid for Blades

    def p(self, s):
        if isinstance(self.pitch, (int, float)):
            return float(self.pitch)
        p0, p1 = self.pitch
        return p0 + (p1 - p0) * min(max((s - self.s0) / (self.s1 - self.s0), 0.0), 1.0)

    def turns(self, s):
        """Pitches from s0 to s (integral of ds / pitch)."""
        if isinstance(self.pitch, (int, float)):
            return (s - self.s0) / self.pitch
        p0, p1 = self.pitch
        if abs(p1 - p0) < 1e-9:
            return (s - self.s0) / p0
        k = (p1 - p0) / (self.s1 - self.s0)
        return math.log(max(self.p(s), 1e-6) / p0) / k

    def offset(self, phi, s):
        if s < self.s0 or s > self.s1:
            return 0.0
        h = self.height * smooth(self.s0, self.s0 + self.run_in, s) * (1 - smooth(self.s1 - self.run_out, self.s1, s))
        if h <= 0:
            return 0.0
        u = (self.turns(s) - self.leads * phi / (2 * math.pi) - self.phase) % 1.0
        return h * CRESTS[self.form](u)


@dataclass
class Flat:
    """Chordal cut at distance d from the axis, normal at phi0 (+ count-fold symmetric copies),
    active on [s0, s1] with smooth runouts of `ramp` mm (s0 < 0: open at the tip)."""
    phi0: float
    d: float
    s0: float
    s1: float
    ramp: float = 1.0
    count: int = 1
    r_out: float = 10.0            # radius the cut runs out to over the ramps
    edge_r: float = 0.0            # constant shaft radius here: adds crisp edge columns

    def __call__(self, phi, s, r):
        a = (1.0 if self.s0 < 0 else smooth(self.s0, self.s0 + self.ramp, s)) * (1 - smooth(self.s1 - self.ramp, self.s1, s))
        if a <= 0:
            return r
        d = self.d + (self.r_out + 0.5 - self.d) * (1 - a)
        for k in range(self.count):
            c = math.cos(ang(phi - self.phi0 - 2 * math.pi * k / self.count))
            if c > 1e-6:
                r = min(r, d / c)
        return r

    def edges(self):
        if not self.edge_r or self.d >= self.edge_r:
            return []
        h = math.acos(self.d / self.edge_r)
        return [self.phi0 + 2 * math.pi * k / self.count + sg * h for k in range(self.count) for sg in (-1, 1)]


@dataclass
class Notch:
    """Self-tapping flute: a notch with radial walls at phi0 +- half_w (count-fold), floor at
    radius rf, open at the tip; the floor rises to r_out over `ramp` before s1. The walls get
    a pair of columns each, so the cutting edges are straight and crisp."""
    phi0: float
    half_w: float
    rf: float
    s1: float
    ramp: float = 1.5
    count: int = 1
    r_out: float = 10.0

    def __call__(self, phi, s, r):
        if s >= self.s1:
            return r
        inside = any(abs(ang(phi - self.phi0 - 2 * math.pi * k / self.count)) < self.half_w
                     for k in range(self.count))
        if not inside:
            return r
        t = smooth(self.s1 - self.ramp, self.s1, s)
        return min(r, self.rf + (self.r_out - self.rf) * math.sin(t * math.pi / 2))

    def edges(self):
        return []

    def walls(self):
        return [self.phi0 + 2 * math.pi * k / self.count + sg * self.half_w
                for k in range(self.count) for sg in (-1, 1)]


@dataclass
class Channel:
    """Cylindrical groove of radius rg parallel to the axis, centre at distance c, azimuth phi0."""
    phi0: float
    c: float
    rg: float
    s0: float = -1.0
    s1: float = 1e9
    edge_r: float = 0.0

    def __call__(self, phi, s, r):
        if s < self.s0 or s > self.s1:
            return r
        d = ang(phi - self.phi0)
        q = self.rg ** 2 - (self.c * math.sin(d)) ** 2
        if q <= 0 or math.cos(d) <= 0:
            return r
        return min(r, max(self.c * math.cos(d) - math.sqrt(q), 0.3))

    def edges(self):
        if not self.edge_r:
            return []
        # law of cosines: where the groove circle crosses the shaft circle
        cd = (self.c ** 2 + self.edge_r ** 2 - self.rg ** 2) / (2 * self.c * self.edge_r)
        if abs(cd) >= 1:
            return []
        h = math.acos(cd)
        return [self.phi0 - h, self.phi0 + h]


@dataclass
class Blades:
    """n helical blades: between them the surface drops to the core radius rc. Active up to s1,
    the grooves run out over `ramp`. twist = turns over [0, s1]."""
    n: int
    half_w: float                  # half-width of a blade (rad)
    rc: float
    s1: float
    twist: float
    ramp: float = 4.0
    edge: float = 0.12             # rad, softness of the blade walls
    phi0: float = 0.0

    def __call__(self, phi, s, r):
        a = 1 - smooth(self.s1, self.s1 + self.ramp, s)
        if a <= 0 or r <= self.rc:
            return r
        th = self.phi0 + 2 * math.pi * self.twist * s / self.s1
        d = min(abs(ang(phi - th - 2 * math.pi * k / self.n)) for k in range(self.n))
        out = 1 - smooth(self.half_w, self.half_w + self.edge, d)       # 1 on a blade
        return r - (1 - out) * (r - self.rc) * a

    def edges(self):
        return []

    def grid(self, s0, s1):
        """A height-0 Thread whose helix follows the blades: add it to Screw.threads so the
        grid lines run along the blade walls (crisp edges instead of a staircase).
        One 'pitch' = the axial distance between neighbouring blades at a fixed azimuth;
        fraction 0 = blade centre, samples bunched on the walls."""
        p = self.s1 / (self.twist * self.n)
        hw = self.half_w * self.n / (2 * math.pi)          # half-widths in pitch fractions
        ew = self.edge * self.n / (2 * math.pi)
        half = list(np.linspace(0, hw, 6)) + list(np.linspace(hw, hw + ew, 6)[1:])             + list(np.linspace(hw + ew, 0.5, 3)[1:])
        fr = sorted({round(f % 1.0, 6) for h in half for f in (h, -h)})
        return Thread(s0, s1, 0.0, p, leads=self.n, fractions=fr,
                      phase=-s0 / p - self.n * self.phi0 / (2 * math.pi))


@dataclass
class Screw:
    core: list                     # (s, r) knots, tip -> top; core[0] = (0, tip face radius)
    mat: str
    threads: list = field(default_factory=list)
    mods: list = field(default_factory=list)
    socket: object = None          # phi -> socket radius
    socket_depth: float = 3.0
    cannula: float = 0.0
    slot: tuple = None             # (width, depth, phi0): slot across the top, through the axis
    dense: list = field(default_factory=list)   # (s0, s1, ds): finer sampling for features
    uv_radius: float = None

    @property
    def length(self):
        return self.core[-1][0]


# ---- core polyline helpers ----------------------------------------------------------------
def under(p0, p1, n=8):
    """Convex head underside from the shaft p0 (leaves radially) to the rim p1 (arrives axially)."""
    (s0, r0), (s1, r1) = p0, p1
    t = np.linspace(0, math.pi / 2, n + 1)[1:]
    return [(s1 - (s1 - s0) * math.cos(a), r0 + (r1 - r0) * math.sin(a)) for a in t]


def dome(p0, p1, n=8):
    """Convex top from the rim p0 (leaves axially) to the flat top p1 (arrives radially)."""
    (s0, r0), (s1, r1) = p0, p1
    t = np.linspace(0, math.pi / 2, n + 1)[1:]
    return [(s0 + (s1 - s0) * math.sin(a), r1 + (r0 - r1) * math.cos(a)) for a in t]


def round_end(p0, p1, n=6):
    """Rounded edge between a face across the axis (p0) and a side (p1), or the reverse."""
    return under(p0, p1, n) if p1[1] > p0[1] else dome(p0, p1, n)


# ---- sampling -----------------------------------------------------------------------------
# Each column is a list of (lam, s, r). lam orders the points along the profile and pairs them
# across columns (blender_kit.swept_zip): equal lam -> a quad. Outside thread zones every column
# has the same samples (lam = segment band + index). Inside a zone the samples are locked to
# the helix: at azimuth phi they sit at thread turns k/n + leads*phi/2pi, so lam = k/n and the
# grid lines run along the thread instead of cutting across it (no staircase in reflections).
BAND = 1e4


def _split_at(core, cuts):
    out = [core[0]]
    for (s0, r0), (s1, r1) in zip(core, core[1:]):
        if s1 > s0:
            for c in sorted(cuts):
                if s0 < c < s1:
                    out.append((c, r0 + (r1 - r0) * (c - s0) / (s1 - s0)))
        out.append((s1, r1))
    return out


def _densify(core, spacing):
    out = [core[0]]
    for (s0, r0), (s1, r1) in zip(core, core[1:]):
        L = math.hypot(s1 - s0, r1 - r0)
        if L < 1e-9:
            continue
        n = max(1, math.ceil(L / spacing(0.5 * (s0 + s1))))
        for k in range(1, n + 1):
            t = k / n
            out.append((s0 + (s1 - s0) * t, r0 + (r1 - r0) * t))
    return out


def plan(sc, ds_plain, per_pitch):
    """Split the core into fixed segments and helical zones (shared by all columns)."""
    zones = sorted(sc.threads, key=lambda t: t.s0)
    cuts = [z for t in zones for z in (t.s0, t.s1)] + [z for d in sc.dense for z in d[:2]]
    core = _split_at(list(sc.core), cuts)

    def spacing(s):
        ps = [d[2] * 10 / per_pitch for d in sc.dense if d[0] <= s <= d[1]]
        return min(ps + [ds_plain])

    pts = _densify(core, spacing)
    cs = np.array([p[0] for p in core])
    cr = np.array([p[1] for p in core])
    segs, cur, zi = [], [], 0
    for s, r in pts:
        while zi < len(zones) and s > zones[zi].s0 + 1e-9:
            t = zones[zi]
            # core radius inside the zone by interpolation of the knots (monotone s there)
            m = (cs >= t.s0 - 1e-9) & (cs <= t.s1 + 1e-9)
            segs.append(("fixed", cur))
            segs.append(("zone", t, cs[m], cr[m]))
            cur = []
            zi += 1
        if not any(t.s0 + 1e-9 < s < t.s1 - 1e-9 for t in zones):
            cur.append((s, r))
    segs.append(("fixed", cur))
    return segs, per_pitch


def _zone_points(t, zs, zr, phi, n):
    shift = t.leads * phi / (2 * math.pi) + t.phase
    end = t.turns(t.s1)
    fr = sorted(f % 1.0 for f in t.fractions) if t.fractions else [k / n for k in range(n)]
    p0 = t.p(t.s0)
    const = isinstance(t.pitch, (int, float)) or abs(t.p(t.s1) - p0) < 1e-9
    kk = 0.0 if const else (t.p(t.s1) - p0) / (t.s1 - t.s0)
    out = []
    m = math.floor(-shift) - 1
    while True:
        for f in fr:
            lam = m + f
            g = lam + shift                    # turns from s0
            if g >= end - 1e-6:
                return out
            if g > 1e-6:
                s = t.s0 + g * p0 if const else t.s0 + (p0 * math.exp(kk * g) - p0) / kk
                out.append((lam, s, float(np.interp(s, zs, zr))))
        m += 1


def _rim(sc, segs):
    """Largest radius of the core within the slot depth: where the slot walls leave the side."""
    L, d = sc.length, (sc.slot[1] if sc.slot else 0.0)
    return max(r for seg in segs if seg[0] == "fixed" for s, r in seg[1] if s >= L - d - 1e-9)


def column(sc, phi, pl):
    """[(lam, s, r)] closed profile at azimuth phi, material on the right (see blender_kit.lathe)."""
    segs, n = pl
    L = sc.length
    rc = sc.cannula
    ch = 0.2
    r_top = segs[-1][1][-1][1]
    r_rim = _rim(sc, segs)
    inner = sc.socket(phi) if sc.socket else rc
    rb, slot_d = None, 0.0
    if sc.slot:
        w, slot_d, p0 = sc.slot
        sn = abs(math.sin(phi - p0))
        rb = w / 2 / sn if sn > 1e-9 else 1e9
    full_slot = rb is not None and rb >= r_rim

    raw = [(0.0, (0.0, rc + 0.15) if rc else (0.0, 0.0))]
    for b, seg in enumerate(segs):
        band = (b + 1) * BAND
        if seg[0] == "fixed":
            raw += [(band + i, p) for i, p in enumerate(seg[1])]
        else:
            raw += [(band + 0.5 * BAND + lam, (s, r)) for lam, s, r in _zone_points(seg[1], seg[2], seg[3], phi, n)]
    pts = []
    for lam, (s, r) in raw:
        rr = r + sum(t.offset(phi, s) for t in sc.threads)
        for m in sc.mods:
            rr = m(phi, s, rr)
        if full_slot:
            s = min(s, L - slot_d)
        pts.append((lam, s, rr))

    top = []
    level = L
    if sc.slot:
        if full_slot:
            a = b = (L - slot_d, r_top)
            level = L - slot_d
        elif rb <= inner + ch:
            a = b = (L, inner + ch)
        else:
            rr = min(rb, r_top)                 # between the chamfer and the rim: wall on the chamfer
            a, b = (L, rr), (L - slot_d, rr)
            level = L - slot_d
        top += [a, b]
    if sc.socket:
        dep = level - sc.socket_depth
        top += [(level, inner + ch), (level - ch, inner), (dep, inner)]
        if rc:
            top += [(dep, rc + 0.2), (dep - 0.2, rc)]
        else:
            top += [(dep - 0.58 * inner, 0.0)]           # drill-point cone at the bottom
    elif rc:
        top += [(level, rc + 0.15), (level - 0.15, rc)]
    else:
        top += [(level, 0.0)]
    if rc:
        top += [(0.2, rc), (0.0, rc + 0.15)]             # closes on the first point
    band = (len(segs) + 1) * BAND
    pts += [(band + i, s, r) for i, (s, r) in enumerate(top)]
    return pts


def columns(sc, n_cols, ds_plain, per_pitch):
    """[(phi, [(lam, s, r)])] for blender_kit.swept_zip: n_cols around plus extra columns on
    crisp edges (one on a crease, two on a step), and the closing column at 2pi (same points
    as phi = 0, with lam advanced one lead so the seam pairs along the helix)."""
    pl = plan(sc, ds_plain, per_pitch)
    r_top = _rim(sc, pl[0])
    kinks = [e for m in sc.mods for e in m.edges()]       # creases: one column on the crease
    walls = [e for m in sc.mods if hasattr(m, "walls") for e in m.walls()]   # steps: two columns, a wall between
    if sc.slot:
        w, _, p0 = sc.slot
        inner_max = max(sc.socket(p) for p in np.linspace(0, 2 * math.pi, 36)) if sc.socket else sc.cannula
        for r in (r_top, inner_max + 0.2):
            if w / 2 < r:
                h = math.asin(w / 2 / r)
                walls += [p0 + h, p0 + math.pi - h, p0 + math.pi + h, p0 - h]
    norm = lambda es: sorted({round(e % (2 * math.pi), 6) for e in es if 1e-3 < e % (2 * math.pi) < 2 * math.pi - 1e-3})
    kinks, walls = norm(kinks), norm(walls)
    step = 2 * math.pi / n_cols
    phis = [p for p in np.linspace(0, 2 * math.pi, n_cols, endpoint=False)
            if p == 0 or all(abs(ang(p - e)) > 0.3 * step for e in kinks + walls)]
    eps = 1e-4
    phis = sorted(phis + kinks + [e - eps for e in walls] + [e + eps for e in walls]) + [2 * math.pi]
    return [(float(p), column(sc, float(p), pl)) for p in phis]
