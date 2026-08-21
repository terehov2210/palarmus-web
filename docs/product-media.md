# Product photography

8 of the 23 catalogue products have a photograph the site can use. The other 15
render a labelled tile that says the photo is outstanding. This is a decision,
not an oversight, and it is the one thing to fix before the catalogue is
promoted.

## Why the shop's own renders were not reused

The live shop at `palarmus.com.ua/pokuptsyam/shop/` has a render for every
product, and 29 of them are already in
[`illustration-kit/implants/`](../illustration-kit/implants/). All of them are
lit on **pure black**. That is fine on the shop's own dark tiles and wrong on a
near-white page.

Keying the black out was tried and rejected. These renders are grey titanium on
black, so a luminance key cannot separate subject from ground:

- the darker metal in the middle of a component keys out along with the
  background, punching holes through the object — the Mirai femoral component
  lost its whole intercondylar notch;
- edges come back stair-stepped, because the anti-aliased boundary between grey
  metal and black is exactly the range the key has to guess at;
- a dark grey shaft on a near-white page loses the soft shadow that separated it
  from the background, so thin implants like the nails read as flat outlines.

A cut-out that damages the product is worse than no photograph, so the
placeholder ships instead.

## The three ways out, best first

1. **Ask the manufacturers for renders on white or with alpha.** These are 3D
   renders, so re-exporting on a white ground or with a transparent background
   is a render setting, not a reshoot. This is the cheapest fix and gives the
   best result.
2. **Photograph the stock.** Standard product photography on a white sweep. Also
   fixes the shop, which currently shows black tiles on a white page.
3. **Commit to a dark product tile.** Keep the renders as they are and give
   product media its own dark panel, the way the two hero illustrations already
   sit on deep blue. Consistent and needs no new assets, but it makes the
   catalogue read heavier than the rest of the site, and the eight existing
   white-background photographs would have to be redone to match.

## Which products already have one

| Product | File |
| --- | --- |
| Проксимальний стержень | `public/products/proximal-rod.webp` |
| RingButton™ | `public/products/ringbutton.webp` |
| ParaTak™ | `public/products/paratak.webp` |
| LocTak™ | `public/products/loctak.webp` |
| SutureLoc™ | `public/products/sutureloc.webp` |
| XtraLoc™ PEEK | `public/products/xtraloc.webp` |
| SpeedLoc™ | `public/products/speedloc.png` |
| TrHCROSS 2,0% | `public/products/trhcross.webp` |

Those eight are also what the homepage strip shows, so the one grid where the
image carries the meaning never falls back to a placeholder.

## Adding one

Drop the file in `public/products/` and set `image` on that entry in
`src/content/products.ts`. Nothing else changes: the card, the detail page and
the homepage selection all read that one field.
