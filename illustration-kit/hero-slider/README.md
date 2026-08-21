# Hero slider — delivered

All four slides are in `public/brand/` and the slider is live. This file is kept
as the record of what was asked for and the constraints it was built to, so a
fifth direction can be added to the same spec.

Delivered art is mirrored in `deliverables/`, byte-identical to `public/`.

Checked on arrival: all three at 1600x1200, deep blue grounds matching slide 1
to within a couple of RGB points at the corners (they crossfade, so drift would
read as a flicker), subject right of centre in the desktop crop, and each one
still readable in the 5:4 mobile crop.

```
hero-slider/
  README.md
  reference/   slide 1 as shipped, plus each subject as already drawn
  implants/    device renders from the live shop
```

## Adding a fifth needs no code

`src/content/hero-slides.ts` lists the slides;
`src/components/sections/hero.tsx` drops any whose file is missing from
`public/`, and with fewer than two left the hero renders a plain static image
with no controls. So a new direction is a row in that file plus a file at the
matching path — and a slide whose art has not arrived yet simply does not
appear, rather than showing a placeholder.

| Slide | File | Direction |
| --- | --- | --- |
| 1 | `public/brand/hero.webp` | Травматологія |
| 2 | `public/brand/hero-joints.webp` | Заміна суглобів |
| 3 | `public/brand/hero-spinal.webp` | Спінальна хірургія |
| 4 | `public/brand/hero-sports.webp` | Спортивна медицина |

## Format, identical for all of them

| | |
| --- | --- |
| Size | **1600 × 1200** (4:3) |
| Ground | **deep blue**, same as slide 1: `#0457ad` centre falling to `#042976` at the edge |
| Bone | `#ccb699` warm ivory, cortical grain, trabecular interior on cut faces |
| Implant | `#767c83` brushed titanium, soft specular, no chrome mirror |
| Soft tissue | `#86a2bc` low-opacity silhouette that reads as skin and muscle without hiding bone |

`reference/slide-1-traumatology-EXISTING.webp` is the target. Match its
lighting, its density and its ground exactly — these four sit next to each
other in a crossfade, so any drift in ground colour or key light will read as a
flicker when the slide changes.

## The composition rule that matters most

The hero crops the art to the **right 54% of the viewport** and anchors it with
`object-position: right`. On a 1440px screen that is a portrait-ish window
roughly 780 × 830.

So: **put the subject right of centre and let the left third go quiet.** The
left edge fades into the page under a gradient, and the copy column sits over
that fade. Slide 1 already does this — the femur sits right of centre with the
hip at the top right. Centre the subject and it will be cropped in half.

Vertical framing matters too: the window is taller than it is wide, so a wide
horizontal subject will be cropped at the sides. Compose tall.

## What to draw

### Slide 2 — `hero-joints.webp`

**Ендопротез кульшового суглоба, чашка Apex™ 3D TF (трабекулярний титан).**
Hip in coronal cutaway: stem seated in the femoral canal, ceramic head,
polyethylene liner, trabecular titanium cup in the acetabulum. The pelvis gives
this one a natural tall composition.

- Device: `implants/joints_hip-endoprosthesis-apex-3dtf.webp`
- Same subject as already drawn:
  `reference/subject-joints-as-drawn-for-education.webp` — that one is an
  exploded view on a light ground; the hero wants it **seated**, on deep blue.

### Slide 3 — `hero-spinal.webp`

**Lumbar segment: pedicle screws with a connecting rod, one interbody cage in
the disc space.**

- **No device render, and that is deliberate.** The Спінальна хірургія category
  on palarmus.com.ua is empty — there is no SKU to draw. Keep this hardware
  generic and unbranded.
- Same subject as already drawn:
  `reference/subject-spinal-as-drawn-for-education.webp` — includes an axial
  inset. **Drop the inset for the hero**; it is a teaching device and reads as
  clutter at hero scale. One clean sagittal view of two or three vertebrae.

### Slide 4 — `hero-sports.webp`

**Shoulder: suture anchors in the glenoid rim with the thread running to the
labrum.** ParaTak™ and LocTak™ titanium anchors.

- Devices: `implants/sports_paratak-titanium-anchor.webp`,
  `implants/sports_loctak-titanium-anchor.webp`, and
  `implants/sports_loctak-thread-macro.webp` for thread pitch.
- Same subject as already drawn:
  `reference/subject-sports-as-drawn-for-education.webp` — that is a tight
  macro of one anchor in cortical bone. The hero wants it **pulled back** far
  enough to read as a shoulder, so the reader knows which joint they are
  looking at.

## Notes

- **The renders in `implants/` are lit on black.** Use them for geometry,
  thread pitch and proportion only, never for ground or lighting.
- **Colour-coded parts are presentation, not product.** The anchors have purple
  and green driver handles; the implants themselves are titanium.
- **Deliver WebP**, quality ~85. The site re-encodes to AVIF at `quality={82}`
  and serves the crop it needs, so do not pre-shrink these.
- **Anatomical review before publishing.** Screw trajectory, entry point and
  component seating want checking by a surgeon, not sign-off on how they look.
  Slides 2 and 4 show real named devices, so a wrong seating angle is a claim
  about a product.

## Optional, if the set should grow

The remaining two directions are weaker hero subjects and are not in the
rotation: `Обладнання` is an instrument tray with no anatomy, and
`Гіалуронова кислота` is a syringe at a joint space. Both work as catalogue
banners, which they already are. Add them only if the slider should mirror the
catalogue one-for-one — and note that six slides at 5.5s each is over half a
minute for a full cycle, which no one watches.
