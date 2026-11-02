/**
 * The training library («Навчання»), per the client's brief «ТЗ Блоку Навчання».
 *
 * Three levels: the library's home, a page per medical direction, a page per
 * material. Only material that really exists is listed: every title and
 * description below was written from the file itself (the PDF pages, the video
 * frames), with no claims of benefit or outcome the file does not make.
 *
 * Files live in `public/education/library/`. The client supplied them; whether
 * a PDF may be offered for download is theirs to confirm, so `download` is off
 * until they say so (the browser's viewer still shows the document).
 */

export type MaterialType = "technique" | "video" | "pdf" | "basics";

export const materialTypes: { id: MaterialType; label: string }[] = [
  { id: "technique", label: "Хірургічна техніка" },
  { id: "video", label: "Відеодемонстрація" },
  { id: "pdf", label: "Інструкція / PDF" },
  { id: "basics", label: "Базові знання" },
];

export const typeLabel = (t: MaterialType) => materialTypes.find((m) => m.id === t)!.label;

export type Direction = {
  slug: string;
  title: string;
  /** The card line, from the brief. */
  summary: string;
  /** The longer line under the direction page's heading. */
  lede: string;
  image: string;
  imageAlt: string;
};

export const directions: Direction[] = [
  {
    slug: "osteosynthesis",
    title: "Остеосинтез",
    summary: "Техніки фіксації переломів, пластини, гвинти, інтрамедулярні стержні.",
    lede: "Матеріали з фіксації переломів: пластини, гвинти, інтрамедулярні стержні та системи кортикальної фіксації.",
    image: "/education/plate.webp",
    imageAlt: "Пластина з гвинтами на кістці",
  },
  {
    slug: "hip",
    title: "Ендопротезування кульшового суглоба",
    summary: "Первинне та ревізійне ендопротезування, компоненти й системи.",
    lede: "Хірургічні техніки й описи систем для первинного та ревізійного ендопротезування кульшового суглоба: стегнові ніжки, ацетабулярні чашки, вкладиші та головки.",
    image: "/education/hip.webp",
    imageAlt: "Ендопротез кульшового суглоба в кістці",
  },
  {
    slug: "knee",
    title: "Ендопротезування колінного суглоба",
    summary: "Системи ендопротезування, компоненти та техніки.",
    lede: "Системи ендопротезування колінного суглоба, їхні компоненти та хірургічні техніки.",
    image: "/education/knee.webp",
    imageAlt: "Ендопротез колінного суглоба",
  },
  {
    slug: "arthroscopy",
    title: "Артроскопія",
    summary: "Реконструктивні процедури, фіксація зв'язок, шовні анкери та артроскопічні інструменти.",
    lede: "Реконструктивні артроскопічні процедури, фіксація зв'язок, шовні анкери й інструменти.",
    image: "/education/anchor.webp",
    imageAlt: "Шовний анкер у кістці",
  },
  {
    slug: "equipment",
    title: "Хірургічне обладнання та інструменти",
    summary: "Дрилі, пилки, шейверні системи та ендоскопічне обладнання.",
    lede: "Акумуляторні дрилі й пилки, шейверні системи та ендоскопічне обладнання: огляд інструментів і комплектації.",
    image: "/categories/equipment.webp",
    imageAlt: "Хірургічний акумуляторний інструмент",
  },
];

export const findDirection = (slug: string) => directions.find((d) => d.slug === slug);

export type Material = {
  slug: string;
  type: MaterialType;
  /** Null for general material that belongs to no single direction. */
  direction: string | null;
  title: string;
  summary: string;
  /** Who made or supplied it. */
  source: string;
  language: string;
  cover: string;
  /** What to show on the material page. */
  media:
    | { kind: "pdf"; file: string; pages: number; download: boolean }
    | { kind: "video"; file: string; seconds: number; portrait: boolean }
    | { kind: "article"; href: string };
  /** Catalogue products (slugs) the material is about. */
  products: string[];
  /** Other materials to offer beside this one. */
  related: string[];
};

const LIB = "/education/library";

export const materials: Material[] = [
  {
    slug: "deltaway-surgical-technique",
    type: "technique",
    direction: "hip",
    title: "Хірургічна техніка: безцементна стегнова ніжка DeltaWay",
    summary:
      "Етапи встановлення ендопротеза з ніжкою DeltaWay: остеотомія шийки, підготовка стегнового каналу рашпілями, пробна збірка, встановлення ніжки, обробка западини, установка чаші, гвинтів і вкладиша.",
    source: "iKey Medical",
    language: "Українська (переклад)",
    cover: `${LIB}/deltaway-surgical-technique-uk.webp`,
    media: { kind: "pdf", file: `${LIB}/deltaway-surgical-technique-uk.pdf`, pages: 11, download: false },
    products: ["hip-metal-pe", "hip-ceramic-pe", "hip-hybrid"],
    related: ["deltaway-brochure", "apex-acetabular-system"],
  },
  {
    slug: "apex-acetabular-system",
    type: "pdf",
    direction: "hip",
    title: "Ацетабулярна система Apex 3D TF та Apex TPS",
    summary:
      "Опис безцементних чаш Apex 3D TF (трабекулярна структура, 3D-друк) та Apex TPS (плазмове напилення титану), сумісних вкладишів і головок, з кодами виробів і розмірами.",
    source: "iKey Medical",
    language: "Англійська",
    cover: `${LIB}/apex-acetabular-system-en.webp`,
    media: { kind: "pdf", file: `${LIB}/apex-acetabular-system-en.pdf`, pages: 3, download: false },
    products: ["hip-apex-3dtf", "revision-hip-apex-3dtf", "hip-metal-pe", "hip-ceramic-pe"],
    related: ["deltaway-surgical-technique", "deltaway-brochure"],
  },
  {
    slug: "deltaway-brochure",
    type: "pdf",
    direction: "hip",
    title: "Стегнова ніжка DeltaWay: опис системи",
    summary:
      "Конструкція ніжки DeltaWay: конус 12/14, шийково-діафізарний кут 130°, пористе титанове покриття проксимальної частини, таблиця типорозмірів.",
    source: "iKey Medical",
    language: "Англійська",
    cover: `${LIB}/deltaway-brochure-en.webp`,
    media: { kind: "pdf", file: `${LIB}/deltaway-brochure-en.pdf`, pages: 2, download: false },
    products: ["hip-metal-pe", "hip-ceramic-pe", "hip-hybrid"],
    related: ["deltaway-surgical-technique", "apex-acetabular-system"],
  },
  {
    slug: "c-wingbutton-brochure",
    type: "pdf",
    direction: "osteosynthesis",
    title: "C-WingButton: кортикальна фіксація при пошкодженні синдесмозу",
    summary:
      "Система кортикальної фіксації C-WingButton для застосування з латеральними пластинами дистального відділу малогомілкової кістки: компоненти, коди виробів і розміри.",
    source: "iKey Medical",
    language: "Англійська",
    cover: `${LIB}/c-wingbutton-brochure-en.webp`,
    media: { kind: "pdf", file: `${LIB}/c-wingbutton-brochure-en.pdf`, pages: 2, download: false },
    products: [],
    related: [],
  },
  {
    slug: "video-high-speed-drill",
    type: "video",
    direction: "equipment",
    title: "Високошвидкісний дриль: огляд комплектації",
    summary: "Короткий огляд високошвидкісного акумуляторного дриля та його комплектації в транспортувальному кейсі.",
    source: "Palarmus Implants",
    language: "Без звуку",
    cover: `${LIB}/video-high-speed-drill.webp`,
    media: { kind: "video", file: `${LIB}/video-high-speed-drill.mp4`, seconds: 12, portrait: true },
    products: ["high-speed-drill"],
    related: ["video-power-tools-set", "video-mini-power-tool"],
  },
  {
    slug: "video-oscillating-saw",
    type: "video",
    direction: "equipment",
    title: "Осцилююча пила: огляд комплектації",
    summary: "Короткий огляд акумуляторної осцилюючої пили, кейса та комплектації.",
    source: "Palarmus Implants",
    language: "Без звуку",
    cover: `${LIB}/video-oscillating-saw.webp`,
    media: { kind: "video", file: `${LIB}/video-oscillating-saw.mp4`, seconds: 14, portrait: true },
    products: ["oscillating-saw"],
    related: ["video-reciprocating-saw", "video-power-tools-set"],
  },
  {
    slug: "video-reciprocating-saw",
    type: "video",
    direction: "equipment",
    title: "Реципрокна пила: огляд комплектації",
    summary: "Короткий огляд акумуляторної реципрокної пили, акумулятора та кейса.",
    source: "Palarmus Implants",
    language: "Без звуку",
    cover: `${LIB}/video-reciprocating-saw.webp`,
    media: { kind: "video", file: `${LIB}/video-reciprocating-saw.mp4`, seconds: 16, portrait: true },
    products: ["reciprocating-saw"],
    related: ["video-oscillating-saw", "video-power-tools-set"],
  },
  {
    slug: "video-mini-power-tool",
    type: "video",
    direction: "equipment",
    title: "Міні мультифункціональний пристрій: огляд комплектації",
    summary: "Короткий огляд міні мультифункціонального акумуляторного пристрою, змінних насадок і кейса.",
    source: "Palarmus Implants",
    language: "Без звуку",
    cover: `${LIB}/video-mini-power-tool.webp`,
    media: { kind: "video", file: `${LIB}/video-mini-power-tool.mp4`, seconds: 16, portrait: true },
    products: ["mini-power-tool"],
    related: ["video-high-speed-drill", "video-power-tools-set"],
  },
  {
    slug: "video-power-tools-set",
    type: "video",
    direction: "equipment",
    title: "Дрилі та пили: загальний вигляд лінійки",
    summary: "Кілька акумуляторних дрилів і пил лінійки поруч, щоб порівняти їхній вигляд і розміри.",
    source: "Palarmus Implants",
    language: "Без звуку",
    cover: `${LIB}/video-power-tools-set.webp`,
    media: { kind: "video", file: `${LIB}/video-power-tools-set.mp4`, seconds: 9, portrait: true },
    products: ["high-speed-drill", "oscillating-saw", "reciprocating-saw"],
    related: ["video-high-speed-drill", "video-oscillating-saw"],
  },
  {
    slug: "implant-basics",
    type: "basics",
    direction: null,
    title: "Як влаштовані ортопедичні імпланти",
    summary:
      "Оглядова стаття: принципи фіксації, шість типів конструкцій, матеріали, анатомічні зони та глосарій термінів.",
    source: "Palarmus Implants",
    language: "Українська",
    cover: "/education/hero.webp",
    media: { kind: "article", href: "/education/basics" },
    products: [],
    related: [],
  },
];

export const findMaterial = (slug: string) => materials.find((m) => m.slug === slug);

/** Where a material's own page lives. */
export const materialHref = (m: Material) =>
  m.media.kind === "article" ? m.media.href : `/education/${m.direction}/${m.slug}`;

export const materialsIn = (direction: string) => materials.filter((m) => m.direction === direction);

/** Picked for the library's home: one of each kind first, then the rest. */
export const popularMaterials = [
  "deltaway-surgical-technique",
  "apex-acetabular-system",
  "c-wingbutton-brochure",
  "video-high-speed-drill",
  "deltaway-brochure",
  "video-oscillating-saw",
].map((s) => findMaterial(s)!);

/** Topics of the «Базові знання» block, each an anchor in the article. */
export const basicsTopics = [
  { label: "Основні типи ортопедичних імплантів", href: "/education/basics#types" },
  { label: "Конструкції пластин, гвинтів і стержнів", href: "/education/basics#types" },
  { label: "Компоненти ендопротезів", href: "/education/basics#hip" },
  { label: "Матеріали та пари тертя", href: "/education/basics#materials" },
  { label: "Основні терміни ортопедії й травматології", href: "/education/basics#glossary" },
];

export const duration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Ukrainian plural for «матеріал»: 1 матеріал, 3 матеріали, 5 матеріалів. */
export function materialsCount(n: number) {
  const tens = n % 100;
  const ones = n % 10;
  if (tens >= 11 && tens <= 14) return `${n} матеріалів`;
  if (ones === 1) return `${n} матеріал`;
  if (ones >= 2 && ones <= 4) return `${n} матеріали`;
  return `${n} матеріалів`;
}
