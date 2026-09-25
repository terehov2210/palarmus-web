/**
 * The zones on the anatomy skeleton, and the catalogue direction each opens.
 *
 * `id` is the tag the asset carries: every mesh in `public/models/skeleton.glb`
 * has a `zones` extra (the zones a bone belongs to) or an `implant` extra (the
 * one zone a piece of hardware belongs to). They are written by
 * `3d/scripts/stage2.py` and `3d/scripts/implants.py`; renaming a zone means
 * re-exporting the model.
 *
 * `facing` is the direction, in model space (+Z is the skeleton's front, +X
 * its left side), that the construction reads best from. Opening a zone
 * turns the model until that vector points at the camera, the same convention
 * as the hero's hotspots.
 *
 * `focus` names the joint the camera closes in on when a zone has hardware in
 * more than one place: sports medicine is an ACL graft in the right knee *and*
 * cuff anchors in the left shoulder, and framing both would frame the whole
 * skeleton.
 */

/** Built by `3d/`; see `3d/README.md`. Plain data, so server code can preload it. */
// The query is a version: bump it on every re-export, or browsers keep the old
// file (an old GLB without COLOR_0 renders the bones black).
export const skeletonModelUrl = "/models/skeleton.glb?v=5";
/** The hardware, fetched in the background once the figure is up. Same versioning. */
export const skeletonImplantsUrl = "/models/skeleton-implants.glb?v=5";

export type SkeletonZone = {
  id: string;
  /** Chip and marker text. */
  label: string;
  title: string;
  /** What the model is showing, in one line; follows "На моделі:", so lower-case. */
  shown: string;
  body: string;
  href: string;
  /** Link text: which part of the catalogue the zone leads to. */
  cta: string;
  facing: [number, number, number];
  focus?: string;
};

export const skeletonZones: SkeletonZone[] = [
  {
    id: "trauma",
    label: "Травматологія",
    title: "Остеосинтез довгих кісток",
    shown: "інтрамедулярний стержень у стегні, пластина на гомілці",
    body: "Стержні, пластини й гвинти фіксують відламки, поки кістка зростається.",
    href: "/catalog/traumatology",
    cta: "Імпланти для травматології",
    facing: [-0.35, 0, 1],
  },
  {
    id: "hip",
    label: "Кульшовий суглоб",
    title: "Ендопротезування кульшового суглоба",
    shown: "ніжка, головка, чашка й поліетиленовий вкладиш",
    body: "Ендопротез замінює зруйновані головку стегнової кістки та вертлюгову западину.",
    href: "/catalog/joints",
    cta: "Імпланти для заміни суглобів",
    facing: [0.3, 0, 1],
  },
  {
    id: "knee",
    label: "Колінний суглоб",
    title: "Ендопротезування колінного суглоба",
    shown: "стегновий і тібіальний компоненти, поліетиленовий вкладиш",
    body: "Металеві компоненти покривають суглобові поверхні, вкладиш між ними бере на себе тертя.",
    href: "/catalog/joints",
    cta: "Імпланти для заміни суглобів",
    facing: [0.25, 0, 1],
  },
  {
    id: "shoulder",
    label: "Плечовий суглоб",
    title: "Ендопротезування плечового суглоба",
    shown: "ніжка з головкою та гленоїдний компонент",
    body: "Головка плечової кістки і суглобова западина лопатки замінюються парою компонентів.",
    href: "/catalog/joints",
    cta: "Імпланти для заміни суглобів",
    facing: [-0.4, 0, 1],
  },
  {
    id: "spine",
    label: "Хребет",
    title: "Транспедикулярна фіксація",
    shown: "гвинти в L3–L5 і два з’єднувальні стрижні",
    body: "Гвинти проходять через ніжки хребців, стрижні між ними стабілізують сегмент.",
    href: "/catalog/spinal",
    cta: "Спінальна хірургія",
    facing: [0.35, 0, -1],
  },
  {
    id: "sports",
    label: "Спортивна медицина",
    title: "Артроскопія коліна й плеча",
    shown: "пластика передньої хрестоподібної зв’язки, якорі в плечі",
    body: "Трансплантат зв’язки фіксується в кісткових тунелях, а якорі тримають шви на сухожиллях.",
    href: "/catalog/sports-medicine",
    cta: "Спортивна медицина",
    facing: [-0.2, 0, 1],
    focus: "shin.r",
  },
  {
    id: "foot-ankle",
    label: "Стопа й гомілковостоп",
    title: "Остеосинтез гомілковостопного суглоба",
    shown: "пластина на малогомілковій кістці, гвинти в медіальній кісточці",
    body: "Пластина й гвинти відновлюють вилку суглоба після перелому кісточок.",
    href: "/catalog/traumatology",
    cta: "Імпланти для травматології",
    facing: [1, 0, 0.35],
  },
];
