# Anatomy skeleton

Source for `public/models/skeleton.glb`, the skeleton in the homepage's anatomy
section (`src/components/sections/anatomy.tsx`). Everything is rebuilt from
scripts; `source/` and `renders/` are not committed.

The anatomy is Z-Anatomy (`SkeletalSystem100.fbx`, CC BY-SA 4.0). The licence
requires the credit (author, source, licence, "changed") somewhere reasonable; it is in
the site footer (`src/components/site-footer.tsx`), and the GLB is a derivative under the
same licence.

```sh
B="C:/Program Files/Blender Foundation/Blender 5.1/blender.exe"
node 3d/scripts/logo.mjs                     # cap logo texture -> 3d/source/logo-white.png
"$B" -b -P 3d/scripts/stage2.py -- 3d/source/z-anatomy-skeletal.fbx 3d/source/logo-white.png \
     3d/source/stage2.blend 3d/renders/stage2          # bones, zones, rig, pose, cap
"$B" -b 3d/source/stage2.blend -P 3d/scripts/implants.py -- 3d/source/skeleton.blend 3d/renders/implants
"$B" -b 3d/source/skeleton.blend -P 3d/scripts/export.py -- 3d/source/skeleton-raw.glb 110000
npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer
node 3d/scripts/pack.mjs 3d/source/skeleton-raw.glb public/models/skeleton.glb
node 3d/scripts/pack.mjs 3d/source/skeleton-raw-implants.glb public/models/skeleton-implants.glb
```

Then bump `?v=` on both URLs in `src/content/skeleton-zones.ts`, or browsers keep the old files.

Two files: the figure (bones, cut bones, cap, ~0.9MB) loads with the hero; the hardware
(~0.8MB) is fetched once the figure is up and attached under the joints of the same name.
`export.py` also bakes Cycles AO into vertex colours (the bone tint lives there).
Hardware geometry (threads, drive recesses, countersunk plates, swept stems, tulips, braided
graft) is built by `3d/scripts/hardware.py`; `implants.py` decides where it goes, sizes screws
by ray-casting through the bone, and renders x-ray checks to `3d/renders/implants-xray-*.png`.

Blender needs absolute paths for the outputs.

What the site relies on, per mesh node (glTF extras):

- `zones` — comma list of zone ids a bone belongs to (`src/content/skeleton-zones.ts`)
- `implant` — the zone a piece of hardware belongs to; hidden until that zone opens
- `resected`, `replaces` — a cut-bone variant shown instead of `replaces` while its zone is open

The joint empties (`pelvis`, `chest`, `thigh.l`, …) are a rigid rig: every bone
is parented to one, so new mascot poses are rotations of empties, no skinning.
Zone framing and marker positions are computed from the implants at runtime,
so re-exporting does not mean re-measuring anything.

The implants are generic catalogue-style hardware fitted to the bone geometry, not Palarmus
products. If CAD of the real ones arrives, they replace the parts in
`implants.py` one zone at a time.

## Surface detail and studio light (site side)

The GLB carries shape, baked AO and tint only. Realism on the site comes from
`public/models/tex/`, applied at runtime by `src/components/skeleton-materials.ts`
(triplanar, in each mesh's metric space, so no UVs are needed):

| File | Channels | Source (all CC0) |
| --- | --- | --- |
| `bone.webp` | R height, G albedo mottle, B roughness | ambientCG Concrete034 (height, roughness), Plaster001 (colour) |
| `detail.webp` | R scratch roughness, G bead-blast roughness, B weave height | ambientCG Metal003, Metal012, Fabric036 |
| `studio.hdr` | 512×256 equirect | Poly Haven `studio_small_08` (1k, downscaled) |

To rebuild: download the `_1K-JPG` zips from ambientCG and the 1k HDR from Poly Haven,
percentile-normalise each map to 0..1, pack as above at 512px (WebP q88), and resize the HDR
with area filtering. CC0 needs no credit; the Z-Anatomy credit is the one the licence requires.
