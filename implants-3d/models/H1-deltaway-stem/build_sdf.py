"""DeltaWay femoral stem 4# as signed distance fields -> high-res reference meshes.

Outputs (build/):
  polished_hi.ply  proximal bare metal (shoulder, neck up to the turned collar)
  satin_hi.ply     distal bare metal
  coat_hi.ply      porous coating slab, deliberately 2 mm longer than the band at both ends:
                   Blender cuts it to the exact band planes, so the coating edge is a clean loop
  fields.npz       metal / coat fields, for projecting the remeshed surfaces and for normals
The 12/14 trunnion and collar are not here: they are a lathe in Blender (exact, ~1k quads).
"""
import sys
import numpy as np
from skimage import measure
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from stem_params import *  # noqa: E402,F401

OUT = Path(__file__).parent / "build"
OUT.mkdir(exist_ok=True)

VOX = 0.2
lo = np.array([-17.0, -10.0, -2.0])
hi = np.array([46.0, 10.0, 150.0])
xs, ys, zs = (np.arange(lo[i], hi[i] + VOX, VOX, dtype=np.float32) for i in range(3))
X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
P = np.stack([X, Y, Z], -1)
print("grid", X.shape, f"{X.size/1e6:.1f}M voxels")


def normalize(F):
    """First-order SDF: F / |grad F|. Accurate near the surface, which is all the CSG here needs."""
    gx, gy, gz = np.gradient(F, VOX)
    return F / (np.sqrt(gx * gx + gy * gy + gz * gz) + 1e-6)


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def superellipse(u, v, a, b, n):
    return (np.abs(u / a) ** n + np.abs(v / b) ** n) ** (1.0 / n) - 1.0


# ---- body: loft of superellipse sections along Z --------------------------------------
x_lat, x_med, t, n = body_profile(Z)
cx, a, b = (x_lat + x_med) / 2, (x_med - x_lat) / 2, t / 2
r_tip = D / 2
cap = np.sqrt(np.clip(1 - ((r_tip - np.clip(Z, None, r_tip)) / r_tip) ** 2, 1e-4, 1))  # bullet nose
F = superellipse(X - cx, Y, a * cap, b * cap, n)
F = np.where(Z < 0, np.maximum(F, -Z), F)
body = normalize(F)
del F, x_lat, x_med, t, n, cx, a, b, cap

slope = np.tan(np.radians(16))
shoulder = (Z - (A - (X - X_LAT_TOP) * slope)) / np.sqrt(1 + slope**2)
body = smax(body, shoulder, 1.5)

# ---- neck: flattened section growing into the body, ends flat under the turned collar ----
s, r = neck_frame(P)
q = P - HEAD - s[..., None] * NECK_DIR
p_in = q[..., 0] * NECK_DIR[2] - q[..., 2] * NECK_DIR[0]   # in the CCD plane, superior +
u = np.clip((S_NECK_END - s) / 26.0, 0, 1)
neck = superellipse(p_in, Y, 5.4 + 4.2 * u**1.4, 4.5 + 2.0 * u**1.4, 2.6)
neck = np.maximum(normalize(neck), s - S_NECK_END)
neck = np.maximum(neck, (S_NECK_END - 38.0) - s)
del q, p_in, u, s, r

metal = smin(body, neck, 7.0)
del body, neck

# ---- features --------------------------------------------------------------------------
# inserter hole in the lateral shoulder, along the stem axis
hole = np.maximum(np.sqrt((X - HOLE_X) ** 2 + Y**2) - HOLE_R, (HOLE_TOP - HOLE_DEPTH) - Z)
metal = smax(metal, -hole, 0.8)   # soft machined edge on the hole

# decompression grooves on the anterior and posterior faces; they run on up into the coating
# as the short slit seen on the renders
xl, xm, tz, _ = body_profile(Z)
gc = (xl + xm) / 2 + 0.6


def grooves(z0, z1, radius, depth_offset):
    zone = np.clip((Z - z0) / 8, 0, 1) * np.clip((z1 - Z) / 8, 0, 1)
    g = np.full(X.shape, np.inf, dtype=np.float32)
    for sign in (1, -1):
        g = np.minimum(g, np.sqrt((X - gc) ** 2 + (Y - sign * (tz / 2 + depth_offset)) ** 2) - (radius * zone + 1e-3))
    return g


metal = smax(metal, -grooves(18, 92, 0.95, 0.0), 0.5)

# ---- coating slab (2 mm past the band both ends; Blender trims it to the band) -----------
band = band_distance(P)
coat = np.maximum(metal - COAT, band - 2.0)
coat = smax(coat, -grooves(60, 96, 1.25, COAT), 0.5)
coat = smax(coat, -hole, 0.4)
del xl, xm, tz, gc

# bare metal hollowed out more than 1.2 mm inside the band: those faces are under the coating
metal_cut = np.maximum(metal, -(band + 1.2))


def write_ply(path, v, f):
    with open(path, "wb") as fh:
        fh.write(
            f"ply\nformat binary_little_endian 1.0\nelement vertex {len(v)}\n"
            "property float x\nproperty float y\nproperty float z\n"
            f"element face {len(f)}\nproperty list uchar int vertex_indices\nend_header\n".encode()
        )
        fh.write(v.astype("<f4").tobytes())
        rec = np.empty(len(f), dtype=[("n", "u1"), ("i", "<i4", 3)])
        rec["n"] = 3
        rec["i"] = f
        fh.write(rec.tobytes())


def mesh(field, name):
    v, f, _, _ = measure.marching_cubes(field, 0.0, spacing=(VOX, VOX, VOX))
    v += lo   # skimage already winds faces outward for a negative-inside field
    write_ply(OUT / f"{name}.ply", v, f)
    print(f"  {name}: {len(v)/1e6:.2f}M verts, {len(f)/1e6:.2f}M tris")


print("marching cubes...")
split = 80.0   # a plane through the hollow: separates proximal and distal metal without new faces
mesh(np.where(Z > split, metal_cut, 1.0), "polished_hi")
mesh(np.where(Z <= split, metal_cut, 1.0), "satin_hi")
mesh(coat, "coat_hi")
np.savez(OUT / "fields.npz", lo=lo, vox=np.float32(VOX),
         metal=metal.astype(np.float16), coat=coat.astype(np.float16))
print("done")
