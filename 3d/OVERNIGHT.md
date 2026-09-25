# Overnight task (2026-09-25), authorised by the user: "даю разрешение на все"

The user checks the result in the morning. Work autonomously, do not ask questions;
decide and note the decision in the report at the bottom of this file.

## Goals

1. **Look.** Skeleton and implants look cheap; bone is "super white". Make it look good with
   good light:
   - Bone: warm aged-ivory, not white. Bake ambient occlusion + cavity (and slight colour
     variation: darker in joints/foramina, warmer on shafts) into a **vertex colour**
     attribute in Blender (Cycles bake to color attribute, the meshes have no UVs), export it
     in the GLB and use `vertexColors` on the site. Keep the GLB small (check size; meshopt).
   - Implants: believable titanium/steel (roughness ~0.25-0.35, slightly warm grey), screws
     could be gold-anodized titanium as real ones often are, polyethylene off-white with
     higher roughness, graft fibrous warm. Consider a subtle roughness break-up.
   - Site lighting: studio rig (see `src/components/hero-model.tsx` for what already works:
     Lightformer environment, Neutral tone mapping, warm key / cool fill), soft contact
     shadow under the figure if it is in frame, x-ray mode must still read.
   - Verify by screenshots in the browser (chrome-devtools MCP), iterate until it looks good.
2. **Move into the hero.** The skeleton replaces the hero's 3D model (`hero-art.tsx`
   currently shows `hero-model.tsx` implant specimens with a switch). Not full height:
   frame roughly half the figure (head/cap to mid-thigh, or whatever composes best in the
   hero frame), with **buttons that switch zones** (the zone list, styled like the hero's
   `ModelSwitch`/legend chips) and drag-to-rotate. Opening a zone frames that zone (knee,
   ankle are below the half-body frame: the camera moves there, that is fine).
   Remove the separate `Anatomy` section from `src/app/page.tsx` (keep the Z-Anatomy
   CC BY-SA credit visible somewhere near the hero model, e.g. a small caption).
   Keep the no-WebGL fallback working. Keep all accessibility of the current explorer.
   Check desktop and 390px mobile, `npx tsc --noEmit`, `npx eslint`, `npx next build`.
3. Do not push. Do not commit to `main`; if committing, use a branch `skeleton-hero`.

## Context

- Pipeline and commands: `3d/README.md`. Memory: skeleton-mascot-3d.
- Dev server: `npx next dev -p 3000` (start it if not running).
- gltf-transform is installed `--no-save`; reinstall if `npm i` wiped it.

## Status / report (append as you go)

- [x] look pass
- [x] hero move
- [x] verified (desktop, mobile, build)

Done 2026-09-25 ~04:30 (the user said "start now", so the scheduled runs were cancelled).

- Bone colour: `export.py` bakes Cycles AO (4 cm) into COLOR_0 and turns it into aged ivory
  with brown occlusion and low-contrast noise; implants and cap get AO as a multiplier.
  Site bone material: MeshPhysical, white x vertex colour, light clearcoat. GLB 1.08MB.
- Implant finishes (`implants.py`): bead-blasted titanium plates/stems/rods, gold-anodised
  screws, polished CoCr knee component and humeral head, ceramic femoral head, UHMWPE.
- Light: harder warm key, low cool fill, two rims from behind for the black hero ground.
- Hero: `hero-art.tsx` now shows the skeleton from cap to mid-thigh (`frame="half"`), zone
  chips along the bottom, zone card in the top corner, camera lifts the open zone above the
  chips; phone: chips and card under the frame. Z-Anatomy credit bottom-right.
  `Anatomy` section and `skeleton-explorer.tsx` removed. `hero-model.tsx` and
  `content/hero-models.ts` (the old implant specimens) are no longer used but kept.
- GLB URL is versioned (`?v=2` in `skeleton-zones.ts`): bump on re-export.
- tsc, eslint, next build pass. Nothing committed.
