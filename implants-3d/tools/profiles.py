"""Reusable (s, r) profile generators for blender_kit.swept (pure Python, importable anywhere).

screw_profile: any threaded screw as a helical sweep. Each azimuth gets the same profile with
the thread shifted by pitch * phi / 2pi, so the columns of a sweep form a true helix. Head,
drive socket and cannulation are part of the same profile, walked with the material on the
right (see blender_kit.lathe): tip -> thread -> head -> top -> socket -> axis (or cannula).
"""
import math
import numpy as np


def _smooth(e0, e1, x):
    t = min(max((x - e0) / (e1 - e0), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def hex_socket_r(phi, across_flats):
    """Radius of a hexagon socket (across flats) at azimuth phi, corners softened."""
    a = across_flats / 2
    k = (phi % (math.pi / 3)) - math.pi / 6
    return min(a / math.cos(k), a * 1.12)


def star_socket_r(phi, r0, lobe=0.18):
    return r0 * (1 + lobe * math.cos(6 * phi))


def screw_profile(phi, ds, length, major_r, root_r, pitch, *, crest="metal",
                  tip_len=3.0, tip_r=None, head=None, socket=None, socket_depth=3.0,
                  cannula_r=0.0, thread_start=0.0):
    """Closed (s, r) profile at azimuth phi. Screw axis s from the tip (0) to the top of the
    head (or shaft). head = (radius, height, shape) with shape 'round' or 'flat' or None for a
    headless screw; socket(phi) -> socket radius; cannula_r > 0 makes it cannulated."""
    tip_r = root_r * 0.6 if tip_r is None else tip_r
    shaft_top = length - (head[1] if head else 0.0)
    pts = [(0.0, cannula_r + 0.15 if cannula_r else 0.0)]
    if not cannula_r:
        pts.append((0.0, tip_r * 0.5))
    pts.append((0.25, tip_r))
    for s in np.arange(0.5, shaft_top - 0.3, ds):
        root = root_r - (root_r - tip_r) * (1 - _smooth(0.0, tip_len, s))
        h = (major_r - root_r) * _smooth(0.3, tip_len + 0.5, s) * (1.0 if s >= thread_start else 0.0)
        u = ((s - pitch * phi / (2 * math.pi)) / pitch) % 1.0
        if crest == "metal":                       # buttress-like: steep face up, ramp down
            c = max(0.0, 1 - abs(u - 0.35) / 0.35) ** 0.8
        else:                                      # wide rounded crest (bioabsorbable)
            c = (0.5 + 0.5 * math.cos(2 * math.pi * (u - 0.5))) ** 0.55
        pts.append((float(s), root + h * c))
    rs = socket(phi) if socket else None
    if head:
        hr, hh, shape = head
        pts += [(shaft_top, root_r), (shaft_top + 0.05, hr * 0.92), (shaft_top + 0.25, hr)]
        if shape == "round":
            for t in np.linspace(0.15, 1.0, 5):
                pts.append((shaft_top + 0.25 + (hh - 0.25) * math.sin(t * math.pi / 2),
                            hr - (hr - (rs or 0) - 0.6) * (1 - math.cos(t * math.pi / 2))))
        else:
            pts += [(length - 0.3, hr), (length, hr - 0.3)]
    else:
        pts += [(length - 0.3, major_r - 0.2), (length, major_r - 0.5)]
    if rs:
        pts += [(length, rs + 0.25), (length - 0.25, rs), (length - socket_depth, rs)]
        pts += [(length - socket_depth, cannula_r + 0.2), (length - socket_depth - 0.2, cannula_r)] if cannula_r \
            else [(length - socket_depth - 0.6, 0.0)]
    elif not cannula_r:
        pts += [(length, 0.0)]
    if cannula_r:
        pts += [(0.2, cannula_r), (0.0, cannula_r + 0.15)]     # closes on the first point
    return pts
