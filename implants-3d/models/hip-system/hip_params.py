"""Bearing components that go with the DeltaWay 4# stem: Apex TPS cup 52, Apex XPE liner 32/52,
DeltaOne ceramic and Metallica CoCr heads 32 (12/14). Shared by build_sdf.py and build_blender.py.

Sizes from `Каталог_Palarmus_Ендопротези_суглобів_2026_NEW.pdf` and `Вертлюжна система Apex.pdf`:
cups 38-62 mm in 2 mm steps, liners 22x38 ... 36x62, heads 22/28/32/36. A 52 mm cup with a
32 mm head is the middle of the range and matches a 4# stem. Detail geometry (seat taper, 12
anti-rotation notches, 3 screw holes + apex hole, 10 deg hooded rim) from the renders and the
Apex brochure page 2.

Local frame of cup / liner / head: millimetres, origin at the bearing centre, +Z towards the
dome pole (cup opening faces -Z). Azimuth 0 = +X; the liner's hood is on +Y.
"""
import math
import numpy as np

# ---- cup --------------------------------------------------------------------------------
CUP_R = 26.0            # outer radius over the coating (size 52)
CUP_COAT = 0.5
CUP_METAL_R = CUP_R - CUP_COAT
RIM_BAND_R = 25.85      # polished equator band, 0.15 mm under the coating
RIM_BAND_H = 2.2        # coating starts this far above the rim face
SEAT_R0, SEAT_R1, SEAT_H = 22.6, 22.3, 5.0   # liner seat taper: radius at rim -> at SEAT_H
INNER_R = 22.0          # inner dome radius
NOTCHES = 12
NOTCH_W, NOTCH_DEPTH, NOTCH_H = 4.0, 1.2, 2.5
SCREW_HOLES = [(40.0, 0.0), (46.0, 52.0), (46.0, -52.0)]   # (polar deg from the pole, azimuth deg)
SCREW_R, SCREW_SINK_R = 3.25, 4.6                         # bore, countersink at the inner surface
APEX_R = 3.0                                              # apex hole for the hole plug
DOME_CUT_Z = SEAT_H + 0.6                                 # SDF dome / turned part boundary

# ---- liner ------------------------------------------------------------------------------
HEAD_R = 16.0
LINER_IN_R = HEAD_R + 0.05
LINER_FACE_Z = -1.2      # face plane on the flat side (proud of the cup rim)
HOOD_DEG = 10.0          # elevated rim on +Y
TAB_W, TAB_H = 3.8, 2.4

# ---- heads (12/14 bore, matches stem_params.LATHE_PROFILE) --------------------------------
# neck coordinate s along the head axis, 0 at the centre; stem taper r = 7.0 at s=-11 -> 6.2 at s=4.2
HEAD_BASE_S = -11.6
BORE_TOP_S = 6.5


def bore_r(s):
    return 7.0 - (s + 11.0) * (0.8 / 15.2) + 0.01   # 10 um clearance on the 12/14 taper


def head_profile(fillet=0.8):
    """(s, r) profile of a 32 mm head, walked with the material on the right-hand side:
    bore end -> bore (12/14) -> entry chamfer -> base -> rounded base edge -> sphere -> pole."""
    rf = fillet
    cs = HEAD_BASE_S + rf                                     # fillet centre, tangent to base
    cr = math.sqrt((HEAD_R - rf) ** 2 - cs**2)                # ... and to the sphere
    pts = [
        (BORE_TOP_S, 0.0),
        (BORE_TOP_S, 5.6),
        (BORE_TOP_S - 0.5, bore_r(BORE_TOP_S - 0.5)),     # relief at the bore end
        (HEAD_BASE_S + 0.8, bore_r(HEAD_BASE_S + 0.8)),
        (HEAD_BASE_S, bore_r(HEAD_BASE_S + 0.8) + 0.8),   # 0.8 mm entry chamfer
    ]
    t_end = math.atan2(cr, cs)
    pts += [(cs + rf * math.cos(t), cr + rf * math.sin(t)) for t in np.linspace(math.pi, t_end, 6)]
    pts += [(HEAD_R * math.cos(t), HEAD_R * math.sin(t)) for t in np.linspace(t_end, 0, 44)[1:]]
    pts[-1] = (HEAD_R, 0.0)
    return pts


HEAD_SHARP = {1, 2, 3, 4}   # bore end, relief, chamfer, base edges (the fillet is tangent)


# ---- structured (swept) profiles ---------------------------------------------------------
def azimuth_columns(n, features, half_width_at, inside, outside):
    """Columns for blender_kit.swept: n uniform azimuths, plus a doubled column at both edges of
    every feature (notch/tab) so its side walls are crisp. `features`: centre azimuths (rad);
    `half_width_at`: angular half-width; inside()/outside(): the two profiles."""
    events = []
    for k in range(n):
        phi = 2 * math.pi * k / n
        within = any(abs((phi - c + math.pi) % (2 * math.pi) - math.pi) < half_width_at - 1e-6 for c in features)
        events.append((phi, 1, inside() if within else outside()))
    for c in features:
        lo, hi = (c - half_width_at) % (2 * math.pi), (c + half_width_at) % (2 * math.pi)
        events += [(lo, 0, outside()), (lo, 2, inside()), (hi, 0, inside()), (hi, 2, outside())]
    events.sort(key=lambda e: (e[0], e[1]))
    return [(phi, prof) for phi, _, prof in events]


def seat_radius(z, offset=0.0):
    return SEAT_R0 + (SEAT_R1 - SEAT_R0) * min(max(z / SEAT_H, 0.0), 1.0) + offset


def cup_turned_columns(n):
    """Turned part of the cup: dome strip -> ledge -> liner seat (with notches) -> rim face ->
    polished equator band (ends 0.4 mm under the coating edge). Metal on the right."""
    # the turned part climbs 0.6 mm up the dome sphere, past the SDF's ledge rounding; the SDF
    # dome is trimmed at the same plane (DOME_CUT_Z), so the two meet on one circle
    z1 = DOME_CUT_Z
    r_dome = lambda z: math.sqrt(INNER_R**2 - z * z)   # noqa: E731
    head = [(z1, r_dome(z1)), (SEAT_H, r_dome(SEAT_H)), (SEAT_H, SEAT_R1)]
    no = SEAT_R0 + NOTCH_DEPTH
    rb = RIM_BAND_R
    tail = [(0.0, rb - 0.4), (0.12, rb - 0.12), (0.4, rb), (RIM_BAND_H + 0.4, rb)]

    def outside():
        return head + [
                (NOTCH_H, seat_radius(NOTCH_H)), (NOTCH_H, seat_radius(NOTCH_H)),
                (0.4, seat_radius(0.4)), (0.12, SEAT_R0 + 0.12), (0.0, SEAT_R0 + 0.4)] + tail

    def inside():
        return head + [
                (NOTCH_H, seat_radius(NOTCH_H)), (NOTCH_H, no),
                (0.6, no), (0.3, no), (0.0, no)] + tail

    half = (NOTCH_W / 2) / (SEAT_R0 + NOTCH_DEPTH / 2)
    # azimuths here are the cup's local ones; the notch centres sit between uniform samples
    return azimuth_columns(n, [2 * math.pi * k / NOTCHES for k in range(NOTCHES)], half, inside, outside)


def liner_face_z(r, phi):
    """Face height: flat at LINER_FACE_Z, dropping 10 deg on the +Y (hood) side, softly blended."""
    y = r * math.sin(phi)
    t = math.tan(math.radians(HOOD_DEG))
    return LINER_FACE_Z - t * (y + math.sqrt(y * y + 16.0)) / 2


def entry_round(zb, rb, face_z, width=1.2, n=4):
    """Rounded bearing entry: a quadratic Bezier from the bearing's end (zb, rb), excluded,
    to the face `width` further out, cornered at the face height over rb. Spreading the
    ~90 deg turn over n segments keeps every bend well under the 35 deg normal-split angle;
    with two points the bends sat right at it and the split flickered along the hood."""
    p0, c, p2 = np.array([zb, rb]), np.array([face_z(rb), rb]), np.array([face_z(rb + width), rb + width])
    return [tuple((1 - t) ** 2 * p0 + 2 * t * (1 - t) * c + t * t * p2) for t in np.linspace(0, 1, n + 1)[1:]]


def liner_columns(n, n_arc):
    """Whole liner: bearing (from its pole) -> entry round -> hooded face -> outer round ->
    seat (with tabs) -> ledge -> outer dome (to its pole). Polyethylene on the right."""
    ro = SEAT_R0 - 0.02
    r_tab = SEAT_R0 + NOTCH_DEPTH - 0.15

    def profile(phi, tab):
        zf_in = liner_face_z(LINER_IN_R + 0.5, phi)
        zb = zf_in + 1.0                                   # bearing ends 1 mm above the face
        tb = math.acos(max(-1.0, zb / LINER_IN_R))
        bearing = [(LINER_IN_R * math.cos(t), LINER_IN_R * math.sin(t)) for t in np.linspace(0, tb, n_arc)]
        rb = LINER_IN_R * math.sin(tb)
        entry = entry_round(zb, rb, lambda r: liner_face_z(r, phi))
        face = [(liner_face_z(r, phi), r) for r in np.linspace(rb + 2.0, ro - 0.6, 5)]
        zf_out = liner_face_z(ro, phi)
        rim = [(zf_out + 0.18, ro - 0.18), (zf_out + 0.6, ro), (0.0, ro)]
        if tab:
            seat = [(0.25, seat_radius(0.25, -0.02)), (0.25, r_tab), (TAB_H, r_tab), (TAB_H, seat_radius(TAB_H, -0.02))]
        else:
            seat = [(0.25, seat_radius(0.25, -0.02)), (0.25, seat_radius(0.25, -0.02)),
                    (TAB_H, seat_radius(TAB_H, -0.02)), (TAB_H, seat_radius(TAB_H, -0.02))]
        ledge = [(SEAT_H, SEAT_R1 - 0.02)]
        r_out = INNER_R - 0.02
        t0 = math.acos(SEAT_H / r_out)
        dome = [(r_out * math.cos(t), r_out * math.sin(t)) for t in np.linspace(t0, 0, n_arc)]
        return bearing + entry + face + rim + seat + ledge + dome

    half = (TAB_W / 2) / (SEAT_R0 + NOTCH_DEPTH / 2)
    events = []
    for k in range(n):
        phi = 2 * math.pi * k / n
        within = any(abs((phi - c + math.pi) % (2 * math.pi) - math.pi) < half - 1e-6
                     for c in [2 * math.pi * j / NOTCHES for j in range(NOTCHES)])
        events.append((phi, 1, profile(phi, within)))
    for j in range(NOTCHES):
        c = 2 * math.pi * j / NOTCHES
        lo, hi = (c - half) % (2 * math.pi), (c + half) % (2 * math.pi)
        events += [(lo, 0, profile(lo, False)), (lo, 2, profile(lo, True)),
                   (hi, 0, profile(hi, True)), (hi, 2, profile(hi, False))]
    events.sort(key=lambda e: (e[0], e[1]))
    return [(phi, prof) for phi, _, prof in events]


# ---- C-Hemi cemented all-polyethylene cup (H7) -----------------------------------------------
# Catalogue: outer 48-50 / 52-54 / 56-58 / 60-62 for a 32 mm head; 52 matches the TPS cup above.
# From the render: hooded face, cement grooves (rings + meridional slots) on the dome, and an
# X-ray marker wire in a groove just above the equator. Groove layout and depths are assumed.
CH_R = 26.0                 # outer radius over the lands
CH_GROOVE = 0.8             # cement groove depth
CH_FACE_Z = -1.5            # face plane on the flat side; hood drops it on +Y like the XPE liner
CH_RINGS = [(40.0, 1.2), (56.0, 1.2), (72.0, 1.4)]     # ring grooves: (polar deg, width mm)
CH_SLOTS, CH_SLOT_W, CH_SLOT_POLAR = 8, 1.6, 24.0       # meridional slots, from polar 24 deg to the equator
CH_WIRE_POLAR, CH_WIRE_R = 84.0, 0.35                   # marker wire groove (polar deg), wire radius
CH_WIRE_GROOVE_W, CH_WIRE_GROOVE_D = 1.0, 0.7


def chemi_face_z(r, phi):
    return liner_face_z(r, phi) - LINER_FACE_Z + CH_FACE_Z


def chemi_columns(n, n_arc):
    """Whole C-Hemi cup: bearing (from its pole) -> entry round -> hooded face -> rim round ->
    skirt -> dome with ring grooves, wire groove and (in slot columns) a sunken band -> outer
    pole. Polyethylene on the right; every column has the same point count."""
    R, Rg = CH_R, CH_R - CH_GROOVE
    rings = [(math.radians(p), w / 2 / R) for p, w in CH_RINGS]
    wire = (math.radians(CH_WIRE_POLAR), CH_WIRE_GROOVE_W / 2 / R)
    slot0 = math.radians(CH_SLOT_POLAR)
    # polar stations from the equator up to the pole; groove edges are doubled stations
    events = [(t - h, 0) for t, h in rings + [wire]] + [(t + h, 1) for t, h in rings + [wire]] + [(slot0, 2)]
    uniform = [t for t in np.linspace(math.pi / 2, 0, n_arc * 2)
               if all(abs(t - e) > 0.01 for e, _ in events)]
    stations = sorted([(t, None) for t in uniform] + events, key=lambda e: -e[0])

    def outer_r(t, slot):
        if any(abs(t - c) < h for c, h in rings):
            return Rg
        if abs(t - wire[0]) < wire[1]:
            return R - CH_WIRE_GROOVE_D
        return Rg if (slot and t > slot0) else R

    def dome(slot):
        pts = []
        for t, kind in stations:
            if kind is None:
                pts.append((outer_r(t, slot) * math.cos(t), outer_r(t, slot) * math.sin(t)))
            else:   # step: radius just before and just after the edge (walking towards the pole)
                ra, rb = outer_r(t + 1e-6, slot), outer_r(t - 1e-6, slot)
                pts += [(ra * math.cos(t), ra * math.sin(t)), (rb * math.cos(t), rb * math.sin(t))]
        return pts                                         # ends on the pole (polar 0)

    def profile(phi, slot):
        zf_in = chemi_face_z(LINER_IN_R + 0.5, phi)
        zb = zf_in + 1.0
        tb = math.acos(max(-1.0, zb / LINER_IN_R))
        bearing = [(LINER_IN_R * math.cos(t), LINER_IN_R * math.sin(t)) for t in np.linspace(0, tb, n_arc)]
        rb = LINER_IN_R * math.sin(tb)
        entry = entry_round(zb, rb, lambda r: chemi_face_z(r, phi))
        face = [(chemi_face_z(r, phi), r) for r in np.linspace(rb + 2.0, R - 0.8, 5)]
        zf_out = chemi_face_z(R, phi)
        rim = [(zf_out + 0.25, R - 0.25), (zf_out + 0.8, R)]
        skirt = [(min(-0.01, zf_out + 0.8 + 0.01), R)]       # straight skirt up to the equator
        return bearing + entry + face + rim + skirt + dome(slot)

    half = (CH_SLOT_W / 2) / Rg
    centres = [2 * math.pi * (k + 0.5) / CH_SLOTS for k in range(CH_SLOTS)]
    ev = []
    for k in range(n):
        phi = 2 * math.pi * k / n
        within = any(abs((phi - c + math.pi) % (2 * math.pi) - math.pi) < half - 1e-6 for c in centres)
        ev.append((phi, 1, profile(phi, within)))
    for c in centres:
        lo, hi = (c - half) % (2 * math.pi), (c + half) % (2 * math.pi)
        ev += [(lo, 0, profile(lo, False)), (lo, 2, profile(lo, True)),
               (hi, 0, profile(hi, True)), (hi, 2, profile(hi, False))]
    ev.sort(key=lambda e: (e[0], e[1]))
    return [(phi, prof) for phi, _, prof in ev]


def chemi_wire_path(n=160):
    t = math.radians(CH_WIRE_POLAR)
    rc = CH_R - CH_WIRE_GROOVE_D + CH_WIRE_R          # wire top flush with the lands
    return [(rc * math.sin(t) * math.cos(a), rc * math.sin(t) * math.sin(a), rc * math.cos(t))
            for a in np.linspace(0, 2 * math.pi, n, endpoint=False)]
