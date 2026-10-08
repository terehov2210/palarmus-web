"""Suture anchors S6-S11, one size each, from tools/screws.py (+ sutures as tubes).

Sizes: `Каталог_Palarmus_Спортивна_травма_2026_NEW.pdf` p. 2-3. The catalogue gives diameter x
length only: core diameters, pitches and drives are read off the renders
`source/Спортивна травма/{LokTalk, ParaTak, SpeedLoc Peek, Xtralok Peek 5.5 x15, Xrtralok Peek 8.0×19,
XtraLoc  Bio 4,75 и 5,5, Suturelok}.png`. Inserters and handles are not modelled.

  LocTak    Ti, 5.0 x 16 (also 3.5 x 12): cutting flutes at the tip, fine thread ring at the top
  ParaTak   Ti, 5.0 x 16 (also 3.5 x 13): tall single thread to a sharp point
  SpeedLoc  PEEK 5.5 x 19 / Bio 5.5 x 19 (also 4.5 x 19): sharp self-tapping cone, dense thread
  XtraLoc   knotless: PEEK 5.5 x 15, PEEK 8.0 x 19, Bio 5.5 x 19 (also 4.75 x 19): rounded thread,
            Ti forked eyelet ahead of the tip carrying the suture loop
  SutureLoc all-suture, 2.8 x 18 (also 1.8 x 14): braided sleeve folded over the inserter fork

Millimetres. Anchor axis Z, tip at z = 0, top at z = length (XtraLoc eyelet below z = 0).
"""
import math
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
from screws import Screw, Thread, Notch, round_end   # noqa: E402
from profiles import hex_socket_r                    # noqa: E402

hexs = lambda af: (lambda p: hex_socket_r(p, af))    # noqa: E731

LOD = {"lod0": (48, 0.4, 10), "lod1": (24, 1.0, 6)}
SUTURE_LOD = {"lod0": dict(seg=8, n=1.0), "lod1": dict(seg=6, n=0.5)}
SUTURE_R = 0.3                                       # USP 2 braided suture, ~0.6 mm


def catmull_rom(ctrl, n, closed=False):
    c = np.asarray(ctrl, dtype=float)
    c = np.vstack([c[-1:], c, c[:2]]) if closed else np.vstack([2 * c[0] - c[1], c, 2 * c[-1] - c[-2]])
    segs = len(c) - 3
    out = []
    for i in range(segs):
        p0, p1, p2, p3 = c[i:i + 4]
        for t in np.linspace(0, 1, max(2, n // segs), endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    if not closed:
        out.append(c[-2])
    return np.array(out)


def top_tails(z0, z1, spread=1.0):
    """Two suture tails leaving the drive socket of an eyelet anchor (eyelet at z0, top z1)."""
    out = []
    for sg, mat, w in ((-1, "suture_white", 0.4), (1, "suture_tracer", -0.5)):
        ctrl = [(sg * 0.45, 0.0, z0), (sg * 0.45, 0.0, z1 - 0.5), (sg * 0.7, 0.05, z1 + 1.5),
                (sg * 2.6 * spread, 0.4, z1 + 6.0), (sg * 4.6 * spread + w, 1.2, z1 + 15.0),
                (sg * 5.6 * spread + w, 2.2, z1 + 28.0)]
        out.append((ctrl, mat))
    return out


ANCHORS = {}

# S6 LocTak 5.0 x 16, titanium: two cutting flutes in the conical tip, a cortical thread and a
# ring of fine thread below the top that bites the cortex
ANCHORS["s6_loctak_5x16"] = dict(screw=Screw(
    core=[(0.0, 0.35), (0.5, 0.75), (3.0, 1.55), (11.4, 1.55), (11.9, 2.05), (15.7, 2.05), (16.0, 1.8)],
    mat="ti_satin",
    threads=[Thread(1.0, 11.2, 0.95, 1.7, "cortical", run_in=2.6, run_out=0.6),
             Thread(12.0, 15.6, 0.42, 0.6, "fine", leads=2, run_in=0.25, run_out=0.2)],
    mods=[Notch(0.0, 0.32, 0.8, 5.0, ramp=2.0, count=2, r_out=2.6)],
    socket=hexs(2.2), socket_depth=4.0), tails=top_tails(12.5, 16.0))

# S7 ParaTak 5.0 x 16, titanium: a tall, thin single thread running out to a sharp point
ANCHORS["s7_paratak_5x16"] = dict(screw=Screw(
    core=[(0.0, 0.12), (0.4, 0.3), (5.0, 1.25), (12.6, 1.45), (13.2, 1.95), (15.7, 1.95), (16.0, 1.75)],
    mat="ti_satin",
    threads=[Thread(0.3, 12.6, 1.1, 2.3, "cancellous", run_in=5.0, run_out=0.9)],
    socket=hexs(2.0), socket_depth=3.5), tails=top_tails(13.0, 16.0))

# S8 SpeedLoc 5.5 x 19: sharp self-tapping cone, dense thread, short neck; PEEK and Bio share it
SPEEDLOC = dict(
    core=[(0.0, 0.15), (0.5, 0.45), (4.0, 1.75), (16.6, 1.75), (17.1, 2.1), (18.7, 2.1), (19.0, 1.85)],
    threads=[Thread(0.4, 16.6, 1.0, 1.5, "cortical", run_in=3.8, run_out=0.7)],
    mods=[Notch(math.pi / 2, 0.3, 0.7, 6.0, ramp=2.5, count=2, r_out=2.9)],
    socket=hexs(2.4), socket_depth=5.0)
ANCHORS["s8_speedloc_peek_5p5x19"] = dict(screw=Screw(mat="peek", **SPEEDLOC), tails=top_tails(15.0, 19.0))
ANCHORS["s8_speedloc_bio_5p5x19"] = dict(screw=Screw(mat="bioabsorbable", **SPEEDLOC), tails=top_tails(15.0, 19.0))


# S10/S11 XtraLoc knotless: cannulated body with a rounded thread + titanium forked eyelet below
# the tip; the suture loop sits in the fork. Body / eyelet / loop are separate meshes, one node.
def xtraloc(L, r_out, mat, loop_mat, loop_len):
    rc = r_out * 0.73                                        # core radius
    can = r_out * 0.36                                       # cannula, the eyelet rod fits it
    rod_r = can - 0.08
    body = Screw(
        core=[(0.0, rc - 0.5)] + round_end((0.0, rc - 0.5), (0.6, rc), 4)
        + [(L - 0.5, rc), (L, rc - 0.35)],
        mat=mat,
        threads=[Thread(0.3, L - 0.5, r_out - rc, r_out * 0.62, "bio", run_in=1.4, run_out=0.6)],
        socket=hexs(rod_r * 2.2 + 0.4), socket_depth=4.0, cannula=can)
    inside = 3.0                                             # rod length hidden in the body
    out_len = r_out * 1.3 + 2.5
    rod = Screw(core=[(0.0, rod_r * 0.7), (0.3, rod_r)] + [(inside + out_len - 0.5, rod_r)]
                + round_end((inside + out_len - 0.5, rod_r), (inside + out_len, rod_r * 0.55), 4),
                mat="ti_satin", slot=(SUTURE_R * 2.6, 2.0, 0.0))
    # rod: built along +Z with the slotted end on top, turned 180 deg about X, slot end at -out_len
    rod_place = dict(matrix=((1, 0, 0), (0, -1, 0), (0, 0, -1)), offset=(0.0, 0.0, inside))
    zb = -out_len + 2.0 + SUTURE_R                           # strand centre at the fork bottom
    w = rod_r + SUTURE_R + 0.15
    loop = [(0.0, 0.0, zb), (w * 0.9, 0.0, zb + 0.05), (w * 1.25, 0.0, zb - 1.0), (w * 1.3, 0.0, zb - loop_len * 0.35),
            (w * 0.8, 0.0, zb - loop_len * 0.8), (0.0, 0.0, zb - loop_len), (-w * 0.8, 0.0, zb - loop_len * 0.8),
            (-w * 1.3, 0.0, zb - loop_len * 0.35), (-w * 1.25, 0.0, zb - 1.0), (-w * 0.9, 0.0, zb + 0.05)]
    return dict(screw=body, rod=rod, rod_place=rod_place, loop=(loop, loop_mat))


ANCHORS["s10_xtraloc_peek_5p5x15"] = xtraloc(15.0, 2.75, "peek", "suture_tracer", 7.0)
ANCHORS["s10_xtraloc_peek_8x19"] = xtraloc(19.0, 4.0, "peek", "suture_tracer", 9.0)
ANCHORS["s11_xtraloc_bio_5p5x19"] = xtraloc(19.0, 2.75, "bioabsorbable", "suture_white", 14.0)


# S9 SutureLoc 2.8 x 18: flat braided sleeve folded in a U over the inserter fork, the suture
# runs inside it and leaves at both ends
SLEEVE_W, SLEEVE_T, SLEEVE_LEG = 1.15, 0.55, 8.0             # half-width, half-thickness, leg
SLEEVE_CRIMP = (0.10, 1.4)                                   # bunching of the braid: amplitude, period mm


def sutureloc_paths():
    g = 1.25                                                 # leg spacing / 2 (the fork tines)
    arc = [(g * math.cos(a), 0.0, g * math.sin(a)) for a in np.linspace(math.pi, 2 * math.pi, 12)[1:-1]]
    sleeve = [(-g, 0.0, SLEEVE_LEG)] + [(-g, 0.0, z) for z in np.linspace(SLEEVE_LEG, 0.0, 16)[1:]] \
        + arc + [(g, 0.0, z) for z in np.linspace(0.0, SLEEVE_LEG, 16)]
    tails = []
    for sg, mat, w in ((-1, "suture_white", 0.3), (1, "suture_tracer", -0.4)):
        ctrl = [(sg * g, 0.0, SLEEVE_LEG - 3.0), (sg * g, 0.0, SLEEVE_LEG + 0.5), (sg * (g + 0.4), 0.2, SLEEVE_LEG + 4.0),
                (sg * (g + 2.0) + w, 0.8, SLEEVE_LEG + 14.0), (sg * (g + 3.0) + w, 1.6, SLEEVE_LEG + 28.0)]
        tails.append((ctrl, mat))
    return np.array(sleeve), tails


SUTURELOC = "s9_sutureloc_2p8x18"
