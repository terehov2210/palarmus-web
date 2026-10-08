"""Osteosynthesis screws and washer (#35-41, 47, 48, 50), one size each, all from tools/screws.py.

Sizes: `Прайс-лист Palarmus (остеосинтез) (2026).pdf` p. 11 (screws, washer), p. 14 (PFNA,
TITAN/Gamma), p. 15 (Rewalk screw). The price list gives diameter x length only: core
diameters, pitches and head sizes are the usual AO values for that diameter (cortical 3.5:
core 2.4, pitch 1.25, head 6.0; cancellous 6.5: core 3.0, pitch 2.75 ...). Shapes follow the
renders `source/Фото остеосинтез/<n> ...png`; colours follow the renders as well.

Millimetres. Screw axis Z, tip at z = 0, head at z = length.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
from screws import Screw, Thread, Flat, Notch, Channel, Blades, under, dome   # noqa: E402
from profiles import hex_socket_r, star_socket_r                       # noqa: E402

PI = math.pi
hexs = lambda af: (lambda p: hex_socket_r(p, af))
star = lambda r0: (lambda p: star_socket_r(p, r0))

# LOD settings per size class: (columns, plain ds mm, samples per pitch)
SMALL = {"lod0": (48, 0.4, 10), "lod1": (24, 1.0, 6)}
LARGE = {"lod0": (64, 1.2, 10), "lod1": (32, 3.0, 6)}
BLADE = {"lod0": (96, 2.0, 10), "lod1": (48, 4.0, 6)}


def round_head(s_neck, r_neck, r_head, s_rim0, s_rim1, top, r_top):
    """Cortical / cancellous head: spherical underside, short rim band, domed top."""
    return under((s_neck, r_neck), (s_rim0, r_head), 8) + [(s_rim1, r_head)] + dome((s_rim1, r_head), (top, r_top), 8)


def tip_round(r0, s1, r1, n=5):
    return [(0.0, r0)] + under((0.0, r0), (s1, r1), n)


SCREWS = {}

# #35 polyaxial self-tapping locking screw 3.5 x 30: conical head with a double-lead fine thread
SCREWS["os35_locking_3p5x30"] = (Screw(
    core=tip_round(0.5, 0.8, 1.0) + [(2.5, 1.35), (26.0, 1.35), (26.3, 1.6), (26.6, 2.25), (29.8, 2.65), (30.0, 2.45)],
    mat="ti_anodized_gold",
    threads=[Thread(0.8, 26.0, 0.40, 1.25, "cortical", run_in=2.0, run_out=0.6),
             Thread(26.7, 29.8, 0.30, 0.8, "fine", leads=2, run_in=0.3, run_out=0.15)],
    mods=[Notch(0.0, 0.45, 0.75, 4.5, ramp=2.5, r_out=1.8)],
    socket=star(1.2), socket_depth=2.0), SMALL)

# #36 Herbert cannulated compression screw 3.0 x 24: leading thread pitch 1.25, trailing 1.0
SCREWS["os36_herbert_3x24"] = (Screw(
    core=tip_round(0.75, 0.5, 1.0) + [(2.5, 1.05), (7.6, 1.05), (8.2, 1.0), (18.2, 1.0), (18.8, 1.45), (23.8, 1.45), (24.0, 1.25)],
    mat="ti_anodized_magenta",
    threads=[Thread(0.5, 7.6, 0.45, 1.25, "cancellous", run_in=1.5, run_out=0.6),
             Thread(18.8, 23.8, 0.45, 1.0, "cancellous", run_in=0.6, run_out=0.4)],
    mods=[Notch(0.0, 0.3, 0.8, 3.5, ramp=2.0, count=3, r_out=1.6)],
    socket=hexs(1.6), socket_depth=2.5, cannula=0.5), SMALL)

# #37 self-tapping cortical screw 3.5 x 30
SCREWS["os37_cortical_3p5x30"] = (Screw(
    core=tip_round(0.6, 0.8, 1.15) + [(2.0, 1.2), (27.6, 1.2)] + round_head(27.6, 1.2, 3.0, 28.8, 29.0, 30.0, 2.0),
    mat="ti_anodized_gold",
    threads=[Thread(0.8, 27.6, 0.55, 1.25, "cortical", run_in=2.0, run_out=0.8)],
    mods=[Notch(0.0, 0.5, 0.6, 4.5, ramp=2.5, r_out=1.8)],
    socket=hexs(2.5), socket_depth=1.8), SMALL)

# #38 cancellous screw, full thread, 6.5 x 50
SCREWS["os38_cancellous_full_6p5x50"] = (Screw(
    core=[(0.0, 0.5), (0.6, 0.9), (4.5, 1.5), (46.0, 1.5), (46.4, 2.0), (46.9, 2.0)]
    + round_head(46.9, 2.0, 4.0, 48.3, 48.5, 50.0, 2.6),
    mat="ti_anodized_gold",
    threads=[Thread(0.6, 46.0, 1.75, 2.75, "cancellous", run_in=4.0, run_out=1.0)],
    mods=[Notch(0.0, 0.5, 0.9, 7.0, ramp=3.5, r_out=3.3)],
    socket=hexs(3.5), socket_depth=2.6), LARGE)

# #39 cancellous screw, partial thread, 4.0 x 40 (thread 14 mm)
SCREWS["os39_cancellous_partial_4x40"] = (Screw(
    core=[(0.0, 0.4), (0.5, 0.7), (3.0, 0.95), (13.0, 0.95), (14.2, 1.25), (37.2, 1.25)]
    + round_head(37.2, 1.25, 3.0, 38.2, 38.6, 40.0, 2.0),
    mat="ti_anodized_gold",
    threads=[Thread(0.5, 14.0, 1.05, 1.75, "cancellous", run_in=2.5, run_out=1.2)],
    mods=[Notch(0.0, 0.5, 0.55, 4.5, ramp=2.5, r_out=2.1)],
    socket=hexs(2.5), socket_depth=1.6), SMALL)

# #40 headless cannulated compression screw 4.5 x 40: tapered core, pitch 1.8 -> 1.4
SCREWS["os40_headless_4p5x40"] = (Screw(
    core=[(0.0, 1.05), (1.0, 1.55), (39.6, 1.95), (40.0, 1.75)],
    mat="ti_anodized_blue",
    threads=[Thread(1.0, 39.6, 0.55, (1.8, 1.4), "cancellous", run_in=2.0, run_out=0.4)],
    mods=[Notch(0.0, 0.3, 1.1, 4.0, ramp=2.0, count=3, r_out=2.2)],
    socket=hexs(2.5), socket_depth=3.5, cannula=0.7), SMALL)

PFNA_BLADES = Blades(4, 0.5, 2.6, 28.0, 0.33, ramp=4.0, edge=0.16)
# #47 PFNA helical neck blade 10.5 x 100: four twisted blades, flats on the shaft, cannulated
SCREWS["os47_pfna_blade_10p5x100"] = (Screw(
    core=[(0.0, 4.2), (1.2, 5.25), (34.0, 5.25), (35.0, 4.8), (38.0, 4.8), (39.5, 5.25), (99.3, 5.25), (100.0, 4.6)],
    mat="ti_satin",
    threads=[PFNA_BLADES.grid(0.0, 34.0)],
    mods=[PFNA_BLADES, Flat(PI / 2, 4.7, 58.0, 98.6, ramp=1.0, count=2, r_out=5.25, edge_r=5.25)],
    socket=lambda p: 3.0, socket_depth=6.0, cannula=1.6), BLADE)

# #48 TITAN (Gamma-type) lag screw 10.5 x 95 with the integrated compression screw in a groove
SCREWS["os48_titan_lag_10p5x95"] = (Screw(
    core=tip_round(2.6, 1.2, 3.4) + [(5.0, 3.8), (24.0, 3.8), (25.5, 4.75), (94.4, 4.75), (95.0, 4.2)],
    mat="ti_satin",
    threads=[Thread(1.2, 24.0, 1.45, 3.2, "cancellous", run_in=5.0, run_out=1.5)],
    mods=[Channel(PI / 2, 5.1, 2.45, edge_r=4.75),
          Flat(0.0, 4.3, 40.0, 88.0, ramp=3.0, count=2, r_out=4.75, edge_r=4.75),
          Notch(PI / 4, 0.35, 3.0, 8.0, ramp=4.0, count=2, r_out=5.3)],
    slot=(2.2, 4.0, 0.0), cannula=1.6), LARGE)
COMPANION = dict(offset=(0.0, 5.1, 8.0), lod={"lod0": (32, 0.4, 7), "lod1": (16, 1.0, 4)}, screw=Screw(
    core=tip_round(0.6, 0.8, 1.55) + [(3.0, 1.75), (76.0, 1.75), (76.5, 2.35), (79.6, 2.35), (80.0, 2.0)],
    mat="ti_satin",
    threads=[Thread(0.8, 76.0, 0.55, 1.5, "cortical", run_in=2.5, run_out=0.6)],
    socket=hexs(2.0), socket_depth=2.5))

# #50 Rewalk lag screw 6.8 x 90: 22 mm thread, smooth shank, collar at the top, cannulated
SCREWS["os50_rewalk_lag_6p8x90"] = (Screw(
    core=tip_round(1.6, 0.8, 2.0) + [(4.0, 2.2), (22.0, 2.2), (23.5, 2.75), (85.2, 2.75), (85.6, 3.2), (89.6, 3.2), (90.0, 2.8)],
    mat="ti_satin",
    threads=[Thread(0.8, 22.0, 1.2, 2.6, "cancellous", run_in=3.5, run_out=1.2)],
    mods=[Notch(0.0, 0.45, 1.9, 7.0, ramp=3.5, r_out=3.5)],
    socket=hexs(3.5), socket_depth=5.0, cannula=1.3), LARGE)

# #41 washer for 4.0-6.5 screws: OD 13, ID 6.6, 1.8 thick, chamfered seat for the head
WASHER = dict(name="os41_washer_13", mat="ti_anodized_gold", profile=[
    (0.0, 6.2), (0.1, 6.42), (0.3, 6.5), (1.5, 6.5), (1.7, 6.42), (1.8, 6.2),
    (1.8, 3.9), (1.2, 3.3), (0.15, 3.3), (0.0, 3.45), (0.0, 6.2)])
