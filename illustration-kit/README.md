# Illustration kit — Palarmus Implants

Everything needed to generate the site's illustrations. Self-contained: you do
not need the website or any other file in this repo.

```
illustration-kit/
  README.md                  <- this file, the whole brief
  style-reference/           <- the one image that defines the look
  implants/                  <- product photography, filenames map to slots
```

## The hero slider is a separate, smaller ask

`hero-slider/` asks for **3 more renders** — slides 2, 3 and 4 of the homepage
hero. All three subjects were already drawn for the training section, so it is a
re-render on a deep blue ground at a 4:3 crop, not new artwork. That folder is
self-contained too; start there if the hero is the priority.

## What you are making

21 illustrations of orthopaedic implants **in situ** — the device seated in the
anatomy it treats. Not product shots on a background: the product shots in
`implants/` are your *reference for the device geometry*, and the output is the
device shown inside bone.

14 are required, 7 are optional and marked so.

## The look

`style-reference/style-reference-femoral-nail.png` is the target. Match it.

| Element | Value |
| --- | --- |
| Ground, centre | `#0457ad` |
| Ground, edge | `#042976` (radial falloff, subject lit from the centre) |
| Bone | `#ccb699` warm ivory, visible cortical grain, trabecular interior on cut faces |
| Implant | `#767c83` brushed titanium, soft specular, **not** a chrome mirror |
| Soft tissue | `#86a2bc` at low opacity, a silhouette that reads as skin and muscle without hiding bone |

Photoreal 3D medical illustration. Bone is sectioned where it helps show the
implant inside it. Soft tissue is a translucent envelope, never opaque.

### Two grounds

The site is a light page, so only the **two hero slots** (A01, B08) use the deep
blue ground above. Everything else keeps the same bone, metal and tissue on a
**near-white ground**: `#fcfdfe` centre falling off to a faint `#e7f1ff`. Same
lighting, same materials, different backdrop.

### Composition rule for the seven wide banners

A01 through A07 carry a caption and a number over the **bottom-left** of the
image. Keep the subject in the **right 55%** and leave the left 45% quiet. If
you fill the frame edge to edge, type lands on anatomy.

## The slots

`Device` names the real product. Filenames in `implants/` are prefixed with the
slot they serve, so `a02-b10_*` is the reference for both A02 and B10.

### Required — homepage (7)

| Slot | Output file | Size | Ground | Device | Scene |
| --- | --- | --- | --- | --- | --- |
| A01 | `brand/hero.webp` | 1600×1200 | deep | **NAVY A/R інтрамедулярний стегновий стрижень** | Proximal femur in cutaway, nail down the canal, lag screw into the head, distal locking. This is the reference image itself. |
| A02 | `categories/traumatology.webp` | 1600×700 | light | **Поліаксіальна дистальна медіальна блокуюча пластина великогомілкової кістки 3.5** | Distal tibia, plate contoured to the medial surface, locking screws crossing the fracture. Cortex sectioned so screw purchase reads. |
| A03 | `categories/joints.webp` | 1600×700 | light | **Ендопротез кульшового суглобу, чаша Apex™ 3D TF (трабекулярний титан)** | Hip in coronal cutaway: stem in the femoral canal, ceramic head, polyethylene liner, trabecular titanium cup in the acetabulum. |
| A04 | `categories/spinal.webp` | 1600×700 | light | *no product yet — see note below* | Lumbar segment, pedicle screws with a connecting rod, one interbody cage in the disc space. Keep the hardware generic. |
| A05 | `categories/sports.webp` | 1600×700 | light | **ParaTak™** and **LocTak™** титанові якорі | Shoulder, anchors set in the glenoid rim, suture running to the labrum. |
| A06 | `categories/equipment.webp` | 1600×700 | light | **Міні-багатофункціональний портативний пристрій** | **No anatomy.** Battery drill with its attachments laid out on a sterile field, same metal and lighting as the implants. |
| A07 | `categories/hyaluronic.webp` | 1600×700 | light | **TrHCROSS 2,0%** | Knee sectioned at the joint space: cartilage surfaces, synovial gap, needle entering. Fluid is translucent, not a coloured dye. |

### Required — training section (7)

| Slot | Output file | Size | Ground | Device | Scene |
| --- | --- | --- | --- | --- | --- |
| B08 | `education/hero.webp` | 1600×1200 | deep | **NAVY A/R стегновий стрижень** | Same scene as A01, different crop. Layered cutaway: skin silhouette, muscle hint, cortex, canal, implant. |
| B09 | `education/im-nail.webp` | 1400×1400 | light | **NAVY A/R** (femur), **NITE** (tibia), **NUNA** (humerus) | Nail full length with static and dynamic locking holes legible. One bone; the other two nails are geometry reference. |
| B10 | `education/plate.webp` | 1400×1400 | light | **Поліаксіальна дистальна медіальна блокуюча пластина великогомілкової кістки 3.5** | Plate on a metaphyseal fragment, screws at fixed angle, one screw head sectioned to show the thread locking into the plate. |
| B11 | `education/pedicle.webp` | 1400×1400 | light | *no product yet* | Two vertebrae, pedicle screws in axial and sagittal view, rod, interbody cage. Generic hardware. |
| B12 | `education/hip.webp` | 1400×1400 | light | **Ендопротез кульшового суглобу, чаша Apex™ 3D TF** | Components separated and readable by position: stem, ceramic head, liner, trabecular cup. |
| B13 | `education/knee.webp` | 1400×1400 | light | **Ендопротез колінного суглобу Mirai™ (PS)** | Femoral component, polyethylene insert, tibial tray seated on the resected bone. `implants/b13_*` has all three parts photographed separately. |
| B14 | `education/anchor.webp` | 1400×1400 | light | **ParaTak™** titanium screw anchor, with **SutureLoc™** as the all-suture contrast | Anchor set in cortical bone, suture through a tendon, tissue compressed against the footprint. |

### Optional (7)

| Slot | Output file | Size | Device | Scene |
| --- | --- | --- | --- | --- |
| C15–C18 | `education/step-1.webp` … `step-4.webp` | 1200×900 | **NAVY A/R стегновий стрижень** | One femoral nailing in four stages: fracture, reduction and entry point, nail passed, locking. **Same camera in all four** so it reads as one operation. |
| C19 | `education/material-titanium.webp` | 1000×1000 | **ParaTak™ / LocTak™** | Macro of brushed titanium surface and thread. `implants/a05_loctak-titanium-anchor__2-thread-macro.webp` is the closest reference. |
| C20 | `education/material-peek.webp` | 1000×1000 | **XtraLoc™ PEEK** | Macro, matte off-white polymer. |
| C21 | `education/material-resorbable.webp` | 1000×1000 | **SpeedLoc™** (or **GraftFix™**) | Macro, slightly translucent. |

## Extra device references

Not tied to a slot, included because they show well and may be useful for
variants or future sections:

| File | Device | Why it is here |
| --- | --- | --- |
| `ref_calcaneal-plate-3.5` | Поліаксіальна блокуюча пластина п'яткової кістки 3.5 | Very distinctive fan shape, reads instantly in a foot. |
| `ref_herbert-headless-compression-screw` | Гвинт Герберта канюльований компресійний | Headless, buried flush — the clearest way to picture interfragmentary compression. |
| `ref_ringbutton-cortical-fixation` | RingButton™ | Titanium button plus UHMWPE suture; the mechanism is legible at a glance. |
| `ref_graftfix-resorbable-interference-screw` | GraftFix™ | Interference screw in a bone tunnel, for ligament reconstruction. |
| `ref_crescent-fix-meniscus-all-inside` | Crescent-Fix™ | All-inside meniscus repair. |
| `ref_knee-unicompartmental-cr__*` | Ендопротез одновиростковий колінного суглобу (CR) | Useful contrast against the total knee in B13. |
| `ref_rewalk-femoral-nail-kit`, `ref_rewalk-tibial-nail-kit`, `ref_titan-long-set` | Rewalk / TITAN | Alternative nail systems with their locking screws visible. |

## Notes you need before starting

- **The spinal slots have no product.** A04 and B11 show spinal hardware, but
  the Спінальна хірургія category on palarmus.com.ua is currently **empty** —
  there is no SKU to draw. Keep that hardware generic and unbranded, or ask
  before publishing those two.
- **The reference is a cephalomedullary configuration.** It shows a nail with a
  lag screw into the femoral head. NAVY A/R is described by the manufacturer
  for diaphyseal, metaphyseal and multifragmentary femoral fractures. Draw the
  geometry from `implants/a01-b08-c15_navy-ar-femoral-nail.webp`, not from the
  reference's screw path, unless a surgeon confirms that configuration.
- **The product photos are renders on black.** Use them for shape, thread
  pitch, and proportion only. Do not carry their background or their lighting
  into the output.
- **Some renders are colour-coded, not true to life.** The Herbert screw is
  magenta and several anchors have purple or green drivers — that is
  presentation colour on the driver handle, not the implant. Implants are
  titanium, PEEK is off-white, resorbables are translucent.
- **Anatomical review before publishing.** These illustrations sit in a section
  read by people learning the operation. Screw trajectory, entry point and
  component seating need checking by a surgeon, not sign-off on how they look.
- **Deliver WebP** at the sizes given, quality around 85. The site uses
  `object-cover`, so slight bleed past the safe area is fine.

## Where the files go

Output paths in the tables are relative to the site's `public/` directory. One
caveat if you have the repo: `scripts/art.py` regenerates the current
placeholder art from `art-src/`. As each illustration lands, remove that
filename from the `ANATOMY` list in that script, or the next run overwrites it.
