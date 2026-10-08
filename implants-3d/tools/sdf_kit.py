"""SDF toolkit for implant models (system Python: numpy + scikit-image).

A model's build_sdf.py describes each surface as a signed distance field on a voxel grid,
then writes one reference mesh per material plus the fields Blender needs for snapping and
normals. Convention: millimetres, negative inside.
"""
import numpy as np
from pathlib import Path
from skimage import measure


class Grid:
    def __init__(self, lo, hi, vox=0.2):
        self.lo = np.asarray(lo, dtype=np.float64)
        self.hi = np.asarray(hi, dtype=np.float64)
        self.vox = vox
        axes = [np.arange(self.lo[i], self.hi[i] + vox, vox, dtype=np.float32) for i in range(3)]
        self.X, self.Y, self.Z = np.meshgrid(*axes, indexing="ij")
        self.P = np.stack([self.X, self.Y, self.Z], -1)
        print("grid", self.X.shape, f"{self.X.size / 1e6:.1f}M voxels")

    def normalize(self, F):
        """First-order SDF: F / |grad F|. Accurate near the surface, which is all CSG needs."""
        gx, gy, gz = np.gradient(F, self.vox)
        return F / (np.sqrt(gx * gx + gy * gy + gz * gz) + 1e-6)

    def mesh(self, field, path):
        v, f, _, _ = measure.marching_cubes(field, 0.0, spacing=(self.vox,) * 3)
        v += self.lo   # skimage winds faces outward for a negative-inside field
        write_ply(path, v, f)
        print(f"  {Path(path).name}: {len(v) / 1e6:.2f}M verts, {len(f) / 1e6:.2f}M tris")

    def save_fields(self, path, **fields):
        np.savez(path, lo=self.lo, vox=np.float32(self.vox),
                 **{k: v.astype(np.float16) for k, v in fields.items()})


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def superellipse(u, v, a, b, n):
    return (np.abs(u / a) ** n + np.abs(v / b) ** n) ** (1.0 / n) - 1.0


def sphere(P, c, r):
    return np.linalg.norm(P - np.asarray(c, dtype=np.float32), axis=-1) - r


def cylinder(P, a, d, r, s0=-np.inf, s1=np.inf):
    """Capped cylinder: axis through a along unit d, radius r, between s0 and s1 along d."""
    d = np.asarray(d, dtype=np.float32)
    q = P - np.asarray(a, dtype=np.float32)
    s = q @ d
    rad = np.linalg.norm(q - s[..., None] * d, axis=-1) - r
    return np.maximum(rad, np.maximum(s0 - s, s - s1))


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
