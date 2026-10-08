"""Shared PBR material library for all implant models.

Every map is generated in the frequency domain, so it tiles seamlessly. Each material is a folder
with tileable maps plus factors in materials.json; models scale their UVs to millimetres and use
`tile_mm` to set the repeat, so texel density is the same on every implant.

  ti_plasma_spray  vacuum plasma-sprayed porous titanium (DeltaWay, Apex TPS, Revistem):
                   light, matte, granular. Grain shading comes mostly from albedo/AO, which stay
                   stable under mipmapping; the normal map is low-passed and its lost slope
                   variance is folded into roughness, so the surface does not glitter at distance.
  ti_polished      mirror-polished titanium alloy (necks, tapers, shoulders): roughness ~0.14
                   with faint smudges and hairline scratches, so reflections read as real metal
                   instead of a perfect CG mirror.
  ti_satin         ground / satin titanium (distal stems, nails): fine lines along V (the part's
                   long axis), roughness ~0.3.

Run:  python make_materials.py      -> materials/<name>/{basecolor,orm,normal}.png
"""
import json
import numpy as np
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).parent
rng = np.random.default_rng(11)


class Tile:
    def __init__(self, n):
        self.n = n
        fy = np.fft.fftfreq(n)[:, None]
        fx = np.fft.fftfreq(n)[None, :]
        self.fx, self.fy = fx, fy
        self.f = np.sqrt(fx * fx + fy * fy)

    def noise(self, size_px, width=0.45, aniso=1.0):
        """Periodic band-pass noise, dominant feature `size_px` across U; aniso>1 makes features
        `aniso` times longer along V (frequencies along V are scaled up, so few survive)."""
        f = np.sqrt(self.fx**2 + (self.fy * aniso) ** 2)
        g = np.exp(-((np.log(f + 1e-9) - np.log(1.0 / size_px)) ** 2) / (2 * width**2))
        g[0, 0] = 0
        out = np.fft.ifft2(np.fft.fft2(rng.standard_normal((self.n, self.n))) * g).real
        return (out - out.mean()) / out.std()

    def blur(self, img, px):
        return np.fft.ifft2(np.fft.fft2(img) * np.exp(-2 * (np.pi * self.f * px) ** 2)).real

    def normal_from_height(self, h_mm, mm_per_px, strength=1.0):
        dx = (np.roll(h_mm, -1, 1) - np.roll(h_mm, 1, 1)) / (2 * mm_per_px) * strength
        dy = (np.roll(h_mm, -1, 0) - np.roll(h_mm, 1, 0)) / (2 * mm_per_px) * strength
        # image row 0 is the top (V = 1 in glTF), so +V is -row: flip dy for OpenGL-style +Y
        nx, ny, nz = -dx, dy, np.ones_like(dx)
        ln = np.sqrt(nx**2 + ny**2 + nz**2)
        return np.stack([nx / ln, ny / ln, nz / ln], -1) * 0.5 + 0.5, np.sqrt(dx**2 + dy**2)


def norm01(a):
    return (a - a.min()) / (a.max() - a.min())


def save(folder, name, arr):
    folder.mkdir(parents=True, exist_ok=True)
    arr = np.clip(arr, 0, 1)
    if arr.ndim == 2:
        arr = np.repeat(arr[..., None], 3, -1)
    Image.fromarray((arr * 255 + 0.5).astype(np.uint8)).save(folder / f"{name}.png")


library = {}

# ---- ti_plasma_spray ---------------------------------------------------------------------
N, TILE = 512, 4.0
T = Tile(N)
mmpx = TILE / N
# Molten-titanium droplets: thousands of overlapping domes of varied radius, max-combined on a
# periodic canvas (that is how a sprayed layer builds up), so the gaps between them are the pores.
h = np.zeros((N, N))
yy, xx = np.mgrid[0:N, 0:N]
for _ in range(5200):
    rad = rng.choice([4, 6, 8, 11, 15], p=[0.30, 0.30, 0.22, 0.13, 0.05]) * rng.uniform(0.8, 1.2)
    cx, cy = rng.uniform(0, N, 2)
    top = rng.uniform(0.2, 1.0)
    r0 = int(rad) + 1
    xs = (np.arange(int(cx) - r0, int(cx) + r0 + 1)) % N
    ys = (np.arange(int(cy) - r0, int(cy) + r0 + 1)) % N
    dx = (np.arange(int(cx) - r0, int(cx) + r0 + 1) - cx)[None, :]
    dy = (np.arange(int(cy) - r0, int(cy) + r0 + 1) - cy)[:, None]
    dome = top + 0.9 * rad / 15 * np.sqrt(np.clip(1 - (dx**2 + dy**2) / rad**2, 0, 1)) - 9 * (dx**2 + dy**2 > rad**2)
    h[np.ix_(ys, xs)] = np.maximum(h[np.ix_(ys, xs)], dome)
h = norm01(np.maximum(h, np.percentile(h, 3)) + 0.04 * T.noise(3, 0.4))
cav = h - T.blur(h, 7)                      # local concavity: gaps between splats
h_mm = T.blur(h, 1.4) * 0.16                # low-passed relief for the normal map
normal, slope = T.normal_from_height(h_mm, mmpx, strength=0.8)
ao = np.clip(0.86 + 1.6 * cav, 0.55, 1.0)
albedo = np.clip(0.72 + 0.9 * cav + 0.03 * T.noise(60), 0.5, 0.86)
# slope the normal map no longer carries (sub-texel detail) -> extra roughness
lost = np.abs(slope - T.blur(slope, 3))
rough = np.clip(0.66 + 0.25 * norm01(lost) - 0.6 * cav, 0.55, 0.9)
metal = np.full_like(h, 0.8)
d = ROOT / "ti_plasma_spray"
save(d, "basecolor", np.stack([albedo * 0.985, albedo * 0.99, albedo], -1))
save(d, "orm", np.stack([ao, rough, metal], -1))
save(d, "normal", normal)
library["ti_plasma_spray"] = dict(
    tile_mm=TILE, maps=["basecolor", "orm", "normal"], normal_scale=1.0, occlusion=True,
    note="Light matte grey; tuned in the site's lighting (viewer/). Metalness 0.8 stands in for "
         "the multiple scattering in the pores that a real-time BRDF lacks.")

# ---- ti_polished -------------------------------------------------------------------------
N, TILE = 512, 30.0
T = Tile(N)
mmpx = TILE / N
smudge = T.blur(T.noise(120, 0.6), 8)
scratches = np.zeros((N, N))
for _ in range(45):                        # hairlines, random directions, wrap around the tile
    ang = rng.uniform(0, np.pi)
    length = rng.uniform(40, 260)
    x0, y0 = rng.uniform(0, N, 2)
    tt = np.linspace(0, length, int(length * 2))
    xs = (x0 + np.cos(ang) * tt).astype(int) % N
    ys = (y0 + np.sin(ang) * tt).astype(int) % N
    scratches[ys, xs] = np.maximum(scratches[ys, xs], rng.uniform(0.2, 0.7))
scratches = np.clip(T.blur(scratches, 0.5) * 2.0, 0, 1)
rough = np.clip(0.14 + 0.03 * smudge + 0.05 * scratches, 0.1, 0.24)
normal, _ = T.normal_from_height(-scratches * 0.0015, mmpx)
d = ROOT / "ti_polished"
save(d, "orm", np.stack([np.ones_like(rough), rough, np.ones_like(rough)], -1))
save(d, "normal", normal)
library["ti_polished"] = dict(
    tile_mm=TILE, maps=["orm", "normal"], base_color=[0.86, 0.86, 0.87], normal_scale=0.6,
    note="Mirror polish with smudges and hairline scratches.")

# ---- ti_satin ----------------------------------------------------------------------------
N, TILE = 512, 10.0
T = Tile(N)
mmpx = TILE / N
lines = T.noise(4, 0.5, aniso=30) + 0.5 * T.noise(10, 0.5, aniso=20)   # long along V
lines = lines / lines.std()
rough = np.clip(0.30 + 0.035 * lines + 0.008 * T.noise(120), 0.22, 0.4)
normal, _ = T.normal_from_height(lines * 0.0012, mmpx)
d = ROOT / "ti_satin"
save(d, "orm", np.stack([np.ones_like(rough), rough, np.ones_like(rough)], -1))
save(d, "normal", normal)
library["ti_satin"] = dict(
    tile_mm=TILE, maps=["orm", "normal"], base_color=[0.70, 0.70, 0.72], normal_scale=1.0,
    note="Ground finish; lines run along V, so UVs must put V along the part's long axis.")

# ---- cocr_polished ------------------------------------------------------------------------
# cobalt-chrome femoral heads: brighter and more perfect than the titanium polish
N, TILE = 256, 30.0
T = Tile(N)
smudge = T.blur(T.noise(60, 0.6), 4)
rough = np.clip(0.06 + 0.015 * smudge, 0.04, 0.1)
d = ROOT / "cocr_polished"
save(d, "orm", np.stack([np.ones_like(rough), rough, np.ones_like(rough)], -1))
library["cocr_polished"] = dict(
    tile_mm=TILE, maps=["orm"], base_color=[0.93, 0.93, 0.94],
    note="CoCrMo bearing surfaces (Metallica heads).")

# ---- ceramic_biolox ------------------------------------------------------------------------
# zirconia-toughened alumina (BIOLOX delta): the lilac-pink of the renders, glassy polish
library["ceramic_biolox"] = dict(
    tile_mm=10.0, maps=[], base_color=[0.80, 0.66, 0.78], metallic=0.0, roughness=0.07,
    note="DeltaOne ceramic heads / ceramic liners. Factors only: the surface is a flawless polish.")

# ---- uhmwpe -----------------------------------------------------------------------------
# highly cross-linked polyethylene liners: milky white, satin, faint turning rings around the axis
N, TILE = 256, 6.0
T = Tile(N)
rings = (T.noise(3, 0.5, aniso=30) + 0.4 * T.noise(8, 0.5, aniso=20)).T   # lines along U
rings = rings / rings.std()
rough = np.clip(0.42 + 0.03 * rings + 0.02 * T.noise(60), 0.34, 0.5)
normal, _ = T.normal_from_height(rings * 0.0006, TILE / N)
d = ROOT / "uhmwpe"
save(d, "orm", np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1))
save(d, "normal", normal)
library["uhmwpe"] = dict(
    tile_mm=TILE, maps=["orm", "normal"], base_color=[0.93, 0.93, 0.91], metallic=0.0,
    normal_scale=1.0, note="XPE liners. Rings run along U: UVs need U around the part's axis.")

# ---- metal_beadblast ----------------------------------------------------------------------
# bone-facing surfaces of cemented components (femoral pockets, tibial tray underside, keels):
# fine, even, matte grit-blast. Detail in roughness/albedo, a faint normal.
N, TILE = 256, 3.0
T = Tile(N)
grit = T.noise(3, 0.45) + 0.5 * T.noise(7, 0.45)
grit = grit / grit.std()
rough = np.clip(0.52 + 0.05 * grit, 0.42, 0.62)
albedo = np.clip(0.66 + 0.035 * grit, 0.55, 0.75)
normal, _ = T.normal_from_height(T.blur(grit, 0.8) * 0.004, TILE / N)
d = ROOT / "metal_beadblast"
save(d, "basecolor", np.stack([albedo, albedo, albedo * 1.01], -1))
save(d, "orm", np.stack([np.ones_like(rough), rough, np.ones_like(rough)], -1))
save(d, "normal", normal)
library["metal_beadblast"] = dict(
    tile_mm=TILE, maps=["basecolor", "orm", "normal"], normal_scale=0.8,
    note="Grit-blasted bone-facing metal (cement pockets, tray underside, keels).")

# ---- bioabsorbable ------------------------------------------------------------------------
# PLLA / beta-TCP interference screws and anchors: off-white, matte, faint mineral speckle
N, TILE = 256, 4.0
T = Tile(N)
speck = np.clip(T.noise(2.5, 0.4), 1.2, None) - 1.2
mott = T.noise(40, 0.6)
alb = np.clip(0.86 + 0.02 * mott - 0.25 * speck, 0.6, 0.92)
rough = np.clip(0.55 + 0.04 * mott, 0.45, 0.65)
normal, _ = T.normal_from_height(T.blur(T.noise(4, 0.4), 0.6) * 0.002, TILE / N)
d = ROOT / "bioabsorbable"
save(d, "basecolor", np.stack([alb, alb * 0.985, alb * 0.95], -1))
save(d, "orm", np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1))
save(d, "normal", normal)
library["bioabsorbable"] = dict(
    tile_mm=TILE, maps=["basecolor", "orm", "normal"], metallic=0.0, normal_scale=1.0,
    note="Bioresorbable screws and anchors (GraftFix, SpeedLoc Bio, XtraLoc Bio).")


# ---- braided sutures ----------------------------------------------------------------------
# One tile = one braid repeat along the strand (tile_mm) x one full turn around it. Tube UVs:
# u = turns around the strand (0..1 per turn), v = length / tile_mm. Two families of yarns
# cross diagonally; the 'tracer' variant dyes every other yarn of one family blue.
def braid(tracer):
    n = 256
    v, u = np.mgrid[0:n, 0:n] / n                      # v rows (along), u columns (around)
    yarns = 8                                          # yarns per family around the strand
    a = (u * yarns + v * 2) % 1.0                      # family A (helix one way)
    b = (u * yarns - v * 2) % 1.0                      # family B (the other way)
    over = (np.floor(u * yarns + v * 2) + np.floor(u * yarns - v * 2)) % 2   # basket weave
    prof = lambda t: np.sin(np.pi * t) ** 0.7           # noqa: E731  yarn cross-section
    ha, hb = prof(a), prof(b)
    h = np.where(over > 0, np.maximum(ha, 0.6 * hb), np.maximum(hb, 0.6 * ha))
    fil = 0.08 * np.sin(2 * np.pi * (u * yarns * 6 + v * 12))   # filaments in the yarns
    h = h + fil * h
    gy, gx = np.gradient(h * 0.15, 1.0 / n)
    nx, ny = -gx * 0.06, gy * 0.06
    ln = np.sqrt(nx**2 + ny**2 + 1)
    nrm = np.stack([nx / ln, ny / ln, 1 / ln], -1) * 0.5 + 0.5
    white = np.array([0.90, 0.90, 0.92])
    col = np.ones((n, n, 3)) * white
    if tracer:
        blue = np.array([0.24, 0.42, 0.74])
        dyed = (over > 0) & (np.floor(u * yarns + v * 2) % 2 == 0)
        col[dyed] = blue
    ao = np.clip(0.55 + 0.45 * h, 0, 1)
    col = col * (0.75 + 0.25 * h)[..., None]
    rough = np.clip(0.7 - 0.15 * h, 0.5, 0.75)
    return col, np.stack([ao, rough, np.zeros_like(rough)], -1), nrm


for key, tracer in (("suture_white", False), ("suture_tracer", True)):
    col, orm, nrm = braid(tracer)
    d = ROOT / key
    save(d, "basecolor", col)
    save(d, "orm", orm)
    save(d, "normal", nrm)
    library[key] = dict(tile_mm=1.6, maps=["basecolor", "orm", "normal"], metallic=0.0, occlusion=True,
                        normal_scale=1.0, note="Braided UHMWPE suture; tube UVs: u = turns, v = mm / tile_mm.")

# ---- PEEK ---------------------------------------------------------------------------------
# Unfilled PEEK anchors (XtraLoc PEEK, SpeedLoc PEEK): warm tan, semi-gloss moulded surface
library["peek"] = dict(tile_mm=10.0, maps=[], base_color=[0.72, 0.55, 0.34], metallic=0.0, roughness=0.38,
                       note="PEEK suture anchors (XtraLoc PEEK, SpeedLoc PEEK). Factors only.")

# ---- anodised titanium (locking screws, colour-coded by size) -----------------------------
for key, col in (("ti_anodized_gold", [0.86, 0.68, 0.30]), ("ti_anodized_blue", [0.28, 0.42, 0.78]),
                 ("ti_anodized_magenta", [0.62, 0.30, 0.62])):
    library[key] = dict(tile_mm=10.0, maps=[], base_color=col, metallic=1.0, roughness=0.3,
                        note="Colour-anodised titanium screws. Factors only.")

# ---- ti_trabecular -----------------------------------------------------------------------
# Laser-printed trabecular titanium (Apex 3D TF): an open strut lattice with ~0.75 mm pores,
# darker and coarser than the plasma spray. Two strut networks at different depths (the
# lattice seen through its top layer); the deep one is shaded into the pores. As with the
# spray, the look lives in albedo/AO, the normal map is low-passed.
N, TILE = 512, 6.0
T = Tile(N)
mmpx = TILE / N


def struts(size_px, width):
    """Tortuous strut network: the zero set of band-pass noise is a coral-like labyrinth;
    1 on a strut (|noise| < width), falling to 0 in the pores."""
    n = T.noise(size_px, 0.35)
    return np.clip(1 - np.abs(n) / width, 0, 1) ** 0.7


top = struts(60, 1.05)                      # ~0.75 mm pores in the outer layer
deep = struts(40, 0.9)                      # finer layer seen through the pores
lumps = 0.18 * T.noise(10, 0.5)             # struts are lumpy (partially fused powder)
h = norm01(np.maximum(top * (1 + lumps), 0.55 * deep) + 0.03 * T.noise(4, 0.4))
cav = h - T.blur(h, 10)
h_mm = T.blur(h, 2.0) * 0.3
normal, slope = T.normal_from_height(h_mm, mmpx, strength=0.6)
ao = np.clip(0.35 + 0.75 * h, 0.3, 1.0)
albedo = np.clip(0.30 + 0.48 * h + 0.4 * cav + 0.02 * T.noise(60), 0.2, 0.8)
lost = np.abs(slope - T.blur(slope, 3))
rough = np.clip(0.62 + 0.2 * norm01(lost) - 0.15 * h, 0.5, 0.88)
d = ROOT / "ti_trabecular"
save(d, "basecolor", np.stack([albedo * 0.98, albedo * 0.985, albedo], -1))
save(d, "orm", np.stack([ao, rough, np.full_like(h, 0.8)], -1))
save(d, "normal", normal)
library["ti_trabecular"] = dict(
    tile_mm=TILE, maps=["basecolor", "orm", "normal"], normal_scale=1.0, occlusion=True,
    note="3D-printed trabecular titanium (Apex 3D TF, ARS augments). Darker and coarser than "
         "ti_plasma_spray; pores in albedo/AO so it stays matte under mipmapping.")

(ROOT / "materials.json").write_text(json.dumps(library, indent=2), encoding="utf-8")
print("materials:", ", ".join(library))
