import { previewSlugs } from "@/content/models-3d-preview";

/**
 * The 3D model showcase at /3d-models.
 *
 * Every model is built from the manufacturer's catalogue dimensions (see
 * `implants-3d/` next to this repo): one size from each range, the one named in
 * `size`. The GLBs are meshopt-compressed and load one at a time, when picked.
 *
 * `product` links a model to its catalogue entry where the shop sells that exact
 * construction. Parts that are sold only inside a set (the TITAN lag screw) or
 * not listed at all leave it null, and the page offers a consultation instead.
 */

import { moreModels } from "@/content/models-3d-more";

export type MaterialId =
  | "ti-polished"
  | "ti-satin"
  | "ti-plasma"
  | "ti-trabecular"
  | "ceramic"
  | "cocr"
  | "beadblast"
  | "polyethylene"
  | "ti-gold"
  | "ti-blue"
  | "ti-magenta"
  | "peek"
  | "bioabsorbable"
  | "suture"
  | "ti-dark"
  | "ti-green"
  | "plastic"
  | "housing";

/** Name and a swatch that suggests the finish. The swatches are drawn on the
    fixed-dark stage colours, so they read the same in both themes. */
export const materials: Record<MaterialId, { label: string; swatch: string }> = {
  "ti-polished": { label: "Полірований титан", swatch: "linear-gradient(135deg,#f4f4f4,#9a9ea4 55%,#e8e8e8)" },
  "ti-satin": { label: "Сатинований титан", swatch: "linear-gradient(135deg,#d4d6d9,#a7aaae)" },
  "ti-plasma": { label: "Плазмове титанове напилення", swatch: "radial-gradient(circle at 30% 30%,#b9bbbe,#8d9094)" },
  "ti-trabecular": { label: "Трабекулярний титан", swatch: "repeating-radial-gradient(circle at 40% 40%,#9da0a4 0 2px,#c9cbce 2px 4px)" },
  ceramic: { label: "Кераміка", swatch: "radial-gradient(circle at 35% 30%,#ffffff,#e9dfe8)" },
  cocr: { label: "Полірований кобальт-хром", swatch: "linear-gradient(135deg,#fafafa,#8c9096 55%,#dcdcdc)" },
  beadblast: { label: "Піскоструминна обробка", swatch: "linear-gradient(135deg,#b8babd,#9a9c9f)" },
  polyethylene: { label: "Поліетилен XPE", swatch: "radial-gradient(circle at 35% 30%,#ffffff,#e6e7ea)" },
  "ti-gold": { label: "Анодований титан, золотий", swatch: "linear-gradient(135deg,#f1d98a,#b8923a)" },
  "ti-blue": { label: "Анодований титан, синій", swatch: "linear-gradient(135deg,#7fa7e6,#2b5bb0)" },
  "ti-magenta": { label: "Анодований титан, пурпурний", swatch: "linear-gradient(135deg,#e690c8,#a43b85)" },
  peek: { label: "PEEK", swatch: "radial-gradient(circle at 35% 30%,#efe3cc,#cdb791)" },
  bioabsorbable: { label: "Біорезорбуючий полімер", swatch: "radial-gradient(circle at 35% 30%,#f6f3ea,#d9d2c0)" },
  suture: { label: "Шовна нитка з маркером", swatch: "repeating-linear-gradient(45deg,#ffffff 0 3px,#2d5fbf 3px 5px)" },
  "ti-dark": { label: "Анодований титан, темний", swatch: "linear-gradient(135deg,#55585e,#1d1f22)" },
  "ti-green": { label: "Анодований титан, зелений", swatch: "linear-gradient(135deg,#a8dc8a,#4f9a3a)" },
  plastic: { label: "Медичний пластик", swatch: "linear-gradient(135deg,#9a6be0,#e46fae)" },
  housing: { label: "Анодований алюміній", swatch: "linear-gradient(135deg,#6b6a55,#1d1d1f)" },
};

/** The showcase filter: finer than the catalogue's categories, so ~100 models stay findable. */
export const GROUPS = [
  { id: "joints", label: "Суглоби" },
  { id: "nails", label: "Стрижні" },
  { id: "plates", label: "Пластини" },
  { id: "screws", label: "Гвинти" },
  { id: "sports", label: "Спортивна медицина" },
  { id: "instruments", label: "Інструменти та шовні" },
  { id: "equipment", label: "Обладнання" },
] as const;
export type GroupId = (typeof GROUPS)[number]["id"];

export type Model3D = {
  slug: string;
  /** Catalogue category slug, so the filter reuses the catalogue's own names. */
  category: "joints" | "traumatology" | "sports-medicine" | "equipment";
  /** Showcase filter group; defaults from the category (see `groupOf`). */
  group?: GroupId;
  name: string;
  /** Card title: fits two lines at the narrowest grid column. */
  short: string;
  maker: string;
  where: string;
  why: string;
  spec: [string, string][];
  materials: MaterialId[];
  /** `/catalog/{category}/{product}` when the shop sells this construction. */
  product: string | null;
  /**
   * Pose in degrees (XYZ Euler) applied before framing, and the axis the model
   * turns about on its own. Long, thin parts lie across the frame and roll
   * about their own length ("x"); everything else turns on the spot ("y").
   */
  pose: [number, number, number];
  spin: "x" | "y";
};

export const modelUrl = (m: Pick<Model3D, "slug">) => `/models/showcase/${m.slug}.glb`;
export const modelThumb = (m: Pick<Model3D, "slug">) => `/showcase/${m.slug}.webp`;
/** The light LOD1 preview, for the models big enough to need one. */
export const previewUrl = (m: Pick<Model3D, "slug">) =>
  previewSlugs.has(m.slug) ? `/models/showcase/${m.slug}.lod1.glb` : null;

const baseModels: Model3D[] = [
  {
    slug: "hip-tha",
    category: "joints",
    name: "Ендопротез кульшового суглоба",
    short: "Ендопротез кульшового суглоба",
    maker: "Ніжка DeltaWay™, чашка Apex™ TPS, вкладиш Apex™ XPE, керамічна головка DeltaOne",
    where:
      "Тотальне ендопротезування кульшового суглоба: коксартроз, асептичний некроз головки стегнової кістки, перелом шийки стегна в активних пацієнтів.",
    why:
      "Обидва компоненти фіксуються без цементу: кістка вростає в пористе титанове напилення ніжки й чашки. Пара тертя кераміка–поліетилен зношується повільніше за пару метал–поліетилен, тому її обирають для молодших і активних пацієнтів.",
    spec: [
      ["Ніжка", "DeltaWay™ 4#, CCD 130°, конус 12/14"],
      ["Чашка", "Apex™ TPS, Ø52 мм"],
      ["Вкладиш", "Apex™ XPE 32×52"],
      ["Головка", "керамічна, Ø32 мм"],
    ],
    materials: ["ti-polished", "ti-plasma", "polyethylene", "ceramic"],
    product: null,
    pose: [0, 0, 0],
    spin: "y",
  },
  {
    slug: "hip-revision",
    category: "joints",
    name: "Ревізійний ендопротез з трабекулярною чашкою",
    short: "Ревізійний ендопротез, чашка 3D TF",
    maker: "Ніжка Revistem™ M, чашка Apex™ 3D TF, вкладиш Apex™ XPE, керамічна головка DeltaOne",
    where:
      "Повторне ендопротезування, коли перший імплант розхитався, а також втрата кістки в стегні й вертлюжній западині та перипротезні переломи.",
    why:
      "Довга модульна ніжка з ребрами заклинюється в нижній частині стегна, де кістка ще міцна. Чашка надрукована з трабекулярного титану: її пористість близька до губчастої кістки, тому вона стабільна навіть там, де кістки мало.",
    spec: [
      ["Ніжка", "Revistem™ M, проксимальна 20×70 + дистальна 16×190 мм"],
      ["Ребра дистальної частини", "8, висота 1,2 мм"],
      ["Чашка", "Apex™ 3D TF, Ø52 мм"],
      ["Головка", "керамічна, Ø32 мм"],
    ],
    materials: ["ti-polished", "ti-plasma", "beadblast", "ti-trabecular", "polyethylene", "ceramic"],
    product: "revision-hip-apex-3dtf",
    pose: [0, 0, 0],
    spin: "y",
  },
  {
    slug: "deltaway-stem",
    category: "joints",
    name: "Безцементна ніжка DeltaWay™",
    short: "Ніжка DeltaWay™",
    maker: "iKey Medical",
    where:
      "Первинне ендопротезування кульшового суглоба, коли кістка стегна достатньо міцна для фіксації без цементу.",
    why:
      "Клиноподібна ніжка розклинюється в каналі стегнової кістки. Верхня третина вкрита пористим напиленням, і кістка вростає саме туди: навантаження передається на верхній відділ стегна, як у здоровому суглобі.",
    spec: [
      ["Типорозмір", "4# STD"],
      ["Довжина / офсет / шийка", "137 / 38 / 32,5 мм"],
      ["Кут CCD", "130°"],
      ["Конус", "12/14"],
      ["Напилення", "пористий титан, 0,5 мм"],
    ],
    materials: ["ti-polished", "ti-plasma", "beadblast"],
    product: null,
    pose: [0, 0, 0],
    spin: "y",
  },
  {
    slug: "apex-3dtf-cup",
    category: "joints",
    name: "Чашка Apex™ 3D TF з трабекулярного титану",
    short: "Чашка Apex™ 3D TF",
    maker: "iKey Medical",
    where: "Первинне та ревізійне ендопротезування, остеопороз, дефекти вертлюжної западини.",
    why:
      "Чашку друкують на 3D-принтері: пориста структура повторює губчасту кістку і щільно зчіплюється з нею, тому чашка стабільна одразу після встановлення. Отвори під гвинти дають додаткову фіксацію, 12 пазів не дають вкладишу провертатися.",
    spec: [
      ["Діаметр", "Ø52 мм (ряд Ø48–62, крок 2 мм)"],
      ["Протиповоротні пази", "12"],
      ["Вкладиш", "Apex™ XPE, загальний для чашок Apex™"],
    ],
    materials: ["ti-trabecular", "ti-polished"],
    product: null,
    pose: [62, 0, -14],
    spin: "y",
  },
  {
    slug: "mirai-ps",
    category: "joints",
    name: "Ендопротез колінного суглоба Mirai™ PS",
    short: "Колінний ендопротез Mirai™ PS",
    maker: "iKey Medical · задньостабілізований",
    where:
      "Тотальне ендопротезування коліна при гонартрозі III–IV стадії, ревматоїдному та посттравматичному артриті.",
    why:
      "У задньостабілізованій (PS) системі виступ на вкладиші бере на себе роботу задньої хрестоподібної зв’язки, тому коліно стабільне при згинанні. Між двома металевими компонентами стоїть поліетиленовий вкладиш, по якому ковзає суглоб.",
    spec: [
      ["Склад", "стегновий компонент, PS-вкладиш, великогомілкова платформа з кілем"],
      ["Фіксація", "на кістковий цемент"],
    ],
    materials: ["cocr", "beadblast", "polyethylene"],
    product: "knee-mirai-ps",
    pose: [0, -30, 0],
    spin: "y",
  },
  {
    slug: "iu-uni-knee",
    category: "joints",
    name: "Одновиростковий ендопротез колінного суглоба iU™ (CR)",
    short: "Одновиростковий ендопротез iU™",
    maker: "iKey Medical · зі збереженням хрестоподібних зв’язок, на цемент",
    where:
      "Артроз, обмежений одним відділом коліна, найчастіше медіальним, коли зв’язки цілі, а вісь кінцівки коригується. Також остеонекроз виростка стегнової кістки.",
    why:
      "Замінюється лише зношений відділ суглоба, а здорові відділи й обидві хрестоподібні зв’язки (CR — cruciate retaining) залишаються. Розріз і втрата кістки менші, ніж при тотальному ендопротезуванні, відновлення швидше, а коліно рухається природніше.",
    spec: [
      ["Склад", "стегновий компонент, великогомілкова вставка, великогомілкова платформа"],
      ["Типорозміри", "компоненти 1#–7#, вставка 7–11 мм"],
      ["Фіксація", "на кістковий цемент; кіль на платформі, плавник і штифт на стегновому компоненті"],
    ],
    materials: ["cocr", "beadblast", "polyethylene"],
    product: "knee-unicompartmental-cr",
    pose: [0, -30, 0],
    spin: "y",
  },
  {
    slug: "navy-ar",
    group: "nails",
    category: "traumatology",
    name: "Інтрамедулярний стегновий стрижень NAVY A/R",
    short: "Стрижень NAVY A/R",
    maker: "З розкривними крилами та блокуючими гвинтами",
    where: "Діафізарні, метафізарні та багатоуламкові переломи стегнової кістки.",
    why:
      "Стрижень проходить усередині кістки і несе навантаження разом із нею, тому пацієнт раніше стає на ногу. З одного кінця його фіксують блокуючі гвинти, з іншого — два розкривні крила, що заякорюють стрижень у кістковому каналі.",
    spec: [
      ["Розмір", "Ø11 × 360 мм (ряд Ø10–12 × 300–400 мм)"],
      ["Блокуючі гвинти", "3"],
    ],
    materials: ["ti-satin", "ti-gold", "ti-blue"],
    product: "navy-ar",
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "titan-lag",
    group: "screws",
    category: "traumatology",
    name: "Шийковий гвинт TITAN з компресійним гвинтом",
    short: "Шийковий гвинт TITAN",
    maker: "Входить до комплектів TITAN",
    where:
      "Вертлюгові та міжвертлюгові переломи стегнової кістки, разом із проксимальним інтрамедулярним стрижнем.",
    why:
      "Великий гвинт проходить через шийку в головку стегна, а компресійний гвинт стягує уламки. Пази на тілі гвинта не дають головці стегна провертатися навколо нього.",
    spec: [
      ["Розмір", "10,5 × 95 мм"],
      ["Компресійний гвинт", "Ø4,7 мм"],
    ],
    materials: ["ti-dark"],
    product: "titan-long",
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "pfna-blade",
    group: "screws",
    category: "traumatology",
    name: "Спіральне лезо PFNA",
    short: "Спіральне лезо PFNA",
    maker: "Для проксимального стегнового стрижня",
    where: "Переломи проксимального відділу стегна, особливо в літніх пацієнтів з остеопорозом.",
    why:
      "Лезо не вкручують, а забивають. Чотири спіральні лопаті ущільнюють губчасту кістку навколо себе, тому в крихкій кістці лезо тримається краще за гвинт і не дає головці стегна повернутися.",
    spec: [
      ["Розмір", "10,5 × 100 мм"],
      ["Лопаті", "4, спіральні"],
    ],
    materials: ["ti-satin"],
    product: null,
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "herbert",
    group: "screws",
    category: "traumatology",
    name: "Гвинт Герберта канюльований компресійний",
    short: "Гвинт Герберта",
    maker: "Самонарізний, без головки",
    where:
      "Переломи човноподібної кістки зап’ястка, дрібних кісток кисті й стопи, головки променевої кістки, остеохондральні ушкодження.",
    why:
      "Головки немає, тому гвинт повністю занурюється в кістку і не заважає суглобу. Дві різьби мають різний крок, і при закручуванні гвинт стягує уламки між собою. Канюля дозволяє вводити його по спиці.",
    spec: [
      ["Розмір", "3,0 × 24 мм"],
      ["Канюля", "Ø1,0 мм"],
      ["Крок різьби", "1,25 мм біля кінчика, 1,0 мм біля торця"],
    ],
    materials: ["ti-magenta"],
    product: "herbert-screw",
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "headless",
    group: "screws",
    category: "traumatology",
    name: "Канюльований компресійний гвинт без головки",
    short: "Компресійний гвинт без головки",
    maker: "Самонарізний, зі змінним кроком",
    where: "Внутрішньосуглобові переломи, переломи кісточок, дрібних кісток стопи та кисті.",
    why:
      "Крок різьби плавно зменшується від кінчика до торця, тому гвинт стискає уламки по всій довжині. Без головки він не виступає над кісткою.",
    spec: [
      ["Розмір", "4,5 × 40 мм"],
      ["Крок різьби", "від 1,8 до 1,4 мм"],
    ],
    materials: ["ti-blue"],
    product: null,
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "c-wingbutton",
    category: "sports-medicine",
    name: "C-WingButton™ 2 для синдесмозу",
    short: "C-WingButton™ 2",
    maker: "iKey Medical · безвузлова система",
    where: "Розрив дистального міжгомілкового синдесмозу, зокрема разом із переломами кісточок.",
    why:
      "Нитки утримують велико- і малогомілкову кістки разом, але залишають природний мікрорух, якого немає при жорсткому гвинті. Систему зазвичай не треба видаляти повторною операцією.",
    spec: [
      ["Пластини", "12 × 3,5 × 1,5 мм та 11 × 8 × 1,5 мм"],
      ["Показано", "у встановленому стані"],
    ],
    materials: ["ti-satin", "suture"],
    product: null,
    pose: [12, -20, 0],
    spin: "y",
  },
  {
    slug: "ringbutton",
    category: "sports-medicine",
    name: "RingButton™ з фіксованою петлею",
    short: "RingButton™",
    maker: "Кортикальна фіксація трансплантата",
    where: "Пластика передньої хрестоподібної зв’язки: фіксація трансплантата на стегновій кістці.",
    why:
      "Пластина лягає на зовнішній щільний шар кістки, а трансплантат висить на петлі в кістковому тунелі. Імплант маленький, а фіксація міцна.",
    spec: [
      ["Пластина", "12 × 4 × 1,5 мм"],
      ["Петля", "20 мм"],
    ],
    materials: ["ti-satin", "suture"],
    product: "ringbutton",
    pose: [0, 0, 0],
    spin: "y",
  },
  {
    slug: "graftfix",
    category: "sports-medicine",
    name: "Інтерференційний гвинт GraftFix™",
    short: "Гвинт GraftFix™",
    maker: "Біорезорбуючий, канюльований",
    where: "Фіксація трансплантата хрестоподібної зв’язки в кістковому тунелі.",
    why:
      "Гвинт притискає трансплантат до стінки тунелю, поки той приростає до кістки. Матеріал поступово розсмоктується і заміщується кісткою, тож не заважає МРТ і повторній операції.",
    spec: [
      ["Розмір", "8 × 23 мм"],
      ["Шліц", "шестипелюстковий"],
    ],
    materials: ["bioabsorbable"],
    product: "graftfix",
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "xtraloc",
    category: "sports-medicine",
    name: "Безвузловий якір XtraLoc™ PEEK",
    short: "Якір XtraLoc™ PEEK",
    maker: "Інтерференційна фіксація, гомілковостопний суглоб",
    where:
      "Реконструктивні операції на гомілковостопному суглобі, рефіксація сухожиль і зв’язок до кістки.",
    why:
      "Хірург натягує нитку до потрібної сили і забиває якір, вузли в’язати не треба. PEEK не видно на рентгені, і він не дає артефактів на МРТ.",
    spec: [
      ["Розмір", "Ø8,0 × 19 мм"],
      ["Шовний матеріал", "шов 2#"],
    ],
    materials: ["peek", "ti-satin", "suture"],
    product: "xtraloc-peek",
    pose: [0, 0, 0],
    spin: "y",
  },
  {
    slug: "sutureloc",
    category: "sports-medicine",
    name: "Повністю шовний якір SutureLoc™",
    short: "Якір SutureLoc™",
    maker: "Без твердого тіла",
    where: "Рефіксація суглобової губи плечового та кульшового суглобів, дрібні суглоби.",
    why:
      "Якір зроблений лише з нитки, тому під нього потрібен канал усього 2,8 мм і кістки втрачається мінімум. У кістці рукав складається й розширюється, як дюбель.",
    spec: [
      ["Розмір", "2,8 × 18 мм"],
      ["Склад", "плетений рукав і нитка з маркером"],
    ],
    materials: ["suture"],
    product: "sutureloc",
    pose: [0, 0, 0],
    spin: "y",
  },
  {
    slug: "titan-long-kit",
    group: "nails",
    category: "traumatology",
    name: "Комплект TITAN довгий",
    short: "Комплект TITAN довгий",
    maker: "Стрижень, пара шийкових гвинтів TITAN, дистальні гвинти",
    where:
      "Вертлюгові й підвертлюгові переломи, що поширюються на діафіз стегна, а також патологічні переломи, коли кістку треба підтримати на всю довжину.",
    why:
      "Через отвір-вісімку в головку стегна проходять два гвинти: великий тримає головку, компресійний стягує уламки й не дає їй провертатися. Довгий стрижень повторює вигин стегна і внизу блокується двома гвинтами.",
    spec: [
      ["Стрижень", "Ø11 × 380 мм R (ряд Ø10–11 × 340–400 мм)"],
      ["Шийковий гвинт", "10,5 × 95 мм + компресійний Ø4,7 мм"],
      ["Кут", "130°"],
      ["Дистальні гвинти", "2, Ø4,9 мм"],
    ],
    materials: ["ti-dark", "ti-gold"],
    product: "titan-long",
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "titan-short-kit",
    group: "nails",
    category: "traumatology",
    name: "Комплект TITAN короткий",
    short: "Комплект TITAN короткий",
    maker: "Стрижень зі спіральним лезом і дистальним гвинтом",
    where: "Стабільні та нестабільні вертлюгові переломи стегнової кістки, переважно в літніх пацієнтів.",
    why:
      "Короткий стрижень вводять через верхівку великого вертлюга з невеликого розрізу. Спіральне лезо ущільнює губчасту кістку головки, тому тримається навіть при остеопорозі, а розщеплений кінець стрижня зменшує напругу в кістці.",
    spec: [
      ["Стрижень", "Ø10 × 200 мм (ряд Ø9,4–12 × 170–240 мм)"],
      ["Шийкове лезо", "10,5 × 100 мм"],
      ["Кут", "130°"],
      ["Дистальний гвинт", "1, Ø4,9 мм"],
    ],
    materials: ["ti-dark", "ti-gold", "ti-green"],
    product: null,
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "rewalk-femoral",
    group: "nails",
    category: "traumatology",
    name: "Стегновий стрижень Rewalk",
    short: "Стрижень Rewalk стегновий",
    maker: "Комплект з шийковим і дистальними гвинтами",
    where: "Переломи проксимального відділу й діафіза стегнової кістки.",
    why:
      "Шийковий гвинт Ø6,8 мм проходить через стрижень у головку стегна, а дистальні гвинти блокують його знизу. Конструкція несе навантаження разом із кісткою, тому пацієнт раніше стає на ногу.",
    spec: [
      ["Стрижень", "Ø10 × 380 мм R (ряд Ø9,4–11 × 320–400 мм)"],
      ["Шийковий гвинт", "Ø6,8 × 90 мм"],
      ["Дистальні гвинти", "2, Ø4,9 мм"],
    ],
    materials: ["ti-dark", "ti-gold"],
    product: "rewalk-femoral",
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "rewalk-tibial",
    group: "nails",
    category: "traumatology",
    name: "Великогомілковий стрижень Rewalk",
    short: "Стрижень Rewalk великогомілковий",
    maker: "Комплект з блокуючими гвинтами в трьох площинах",
    where: "Діафізарні та метафізарні переломи великогомілкової кістки, зокрема багатоуламкові.",
    why:
      "Вигин у верхній частині стрижня дає ввести його через точку над горбистістю великогомілкової кістки. Гвинти в різних площинах на обох кінцях утримують навіть короткі уламки біля суглобів.",
    spec: [
      ["Стрижень", "Ø10 × 340 мм (ряд Ø9–11 × 260–380 мм)"],
      ["Проксимальні гвинти", "5, у трьох напрямках"],
      ["Дистальні гвинти", "4, у двох площинах"],
    ],
    materials: ["ti-dark", "ti-gold", "ti-green"],
    product: "rewalk-tibial",
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "femur-distal-lateral-plate",
    category: "traumatology",
    name: "Дистальна латеральна стегнова блокуюча пластина 5.0",
    short: "Пластина стегнова дистальна 5.0",
    maker: "Поліаксіальна, анатомічна",
    where: "Переломи дистального відділу стегнової кістки, зокрема внутрішньосуглобові та навколо протеза колінного суглоба.",
    why:
      "Розширена голівка лягає на латеральний виросток і несе кластер блокуючих гвинтів, що утримують дрібні уламки суглобового кінця. Комбіновані отвори стовбура дають і заблокувати гвинт, і стягнути уламки компресією.",
    spec: [
      ["Розмір", "8 отворів, 213 мм (ряд 8–14 отворів)"],
      ["Гвинти", "5.0"],
    ],
    materials: ["ti-dark"],
    product: null,
    pose: [90, 0, 0],
    spin: "x",
  },
  {
    slug: "tibia-distal-medial-plate",
    category: "traumatology",
    name: "Дистальна медіальна блокуюча пластина великогомілкової кістки 3.5",
    short: "Пластина великогомілкова дистальна",
    maker: "Поліаксіальна, анатомічна",
    where: "Переломи дистального відділу великогомілкової кістки, зокрема пілону.",
    why:
      "Пластина вигнута по медіальній поверхні кістки і лягає під шкірою без попереднього згинання. Ложкоподібна голівка з кластером отворів утримує уламки над гомілковостопним суглобом.",
    spec: [
      ["Розмір", "10 отворів, 177 мм (ряд 6–14 отворів)"],
      ["Гвинти", "2.7 / 3.5"],
    ],
    materials: ["ti-dark"],
    product: "distal-medial-tibial-plate",
    pose: [90, 0, 0],
    spin: "x",
  },
  {
    slug: "radius-volar-plate",
    category: "traumatology",
    name: "Дистальна променева долонна блокуюча пластина 2.7",
    short: "Пластина променева долонна",
    maker: "Поліаксіальна, тип 1",
    where: "Переломи дистального метаепіфіза променевої кістки, найчастіший перелом верхньої кінцівки.",
    why:
      "Широка голівка з двома рядами блокуючих отворів підпирає суглобову поверхню знизу, як риштування, тож зап’ястя можна розробляти вже в перші тижні.",
    spec: [
      ["Розмір", "3 отвори стовбура, 69 мм"],
      ["Гвинти", "2.7"],
    ],
    materials: ["ti-dark"],
    product: null,
    pose: [90, 0, 0],
    spin: "x",
  },
  {
    slug: "calcaneal-plate",
    category: "traumatology",
    name: "Блокуюча пластина п’яткової кістки 3.5",
    short: "Пластина п’яткова 3.5",
    maker: "Поліаксіальна",
    where: "Переломи п’яткової кістки, у тому числі внутрішньосуглобові.",
    why:
      "Дві широкі частини з кількома отворами тримають передній і задній відділи п’яткової кістки, а вузький місток між ними лягає по її бічній стінці.",
    spec: [
      ["Розмір", "9 отворів, 60 мм"],
      ["Гвинти", "3.5"],
    ],
    materials: ["ti-dark"],
    product: "calcaneal-plate",
    pose: [90, 0, 0],
    spin: "x",
  },
  {
    slug: "mirai-stem",
    category: "joints",
    name: "Ендопротез колінного суглоба Mirai™ PS зі стемом",
    short: "Ендопротез Mirai™ PS зі стемом",
    maker: "iKey Medical",
    where:
      "Тотальне ендопротезування колінного суглоба, коли великогомілкова кістка ослаблена: остеопороз, дефекти, деформації.",
    why:
      "Подовжувальний стрижень продовжує кіль платформи вниз по каналу кістки й розподіляє навантаження на більшу ділянку. Це той самий задньостабілізований Mirai™, лише з додатковою опорою.",
    spec: [
      ["Компоненти", "стегновий, PS-вкладиш, платформа зі стемом"],
      ["Стем", "з канавками, полірований"],
    ],
    materials: ["cocr", "beadblast", "polyethylene"],
    product: null,
    pose: [0, -30, 0],
    spin: "y",
  },
  {
    slug: "augment-3dtf",
    category: "joints",
    name: "Ацетабулярний аугмент 3D TF ARS",
    short: "Аугмент 3D TF ARS",
    maker: "Тип I, трабекулярний титан",
    where: "Ревізійне ендопротезування кульшового суглоба з дефектом даху вертлюжної западини.",
    why:
      "Аугмент заповнює дефект кістки під чашкою, а його пористий трабекулярний титан проростає кісткою так само, як чашка 3D TF. Чашку з’єднують з аугментом цементом, сам аугмент кріплять гвинтами.",
    spec: [
      ["Розмір", "50/52 × 15 мм (ряд 50/52–58/60 × 10–20 мм)"],
      ["Отвори", "3 радіальні, 2 у верхній площадці"],
    ],
    materials: ["ti-trabecular", "ti-satin"],
    product: "acetabular-augment-3dtf-ars",
    pose: [0, 0, 0],
    spin: "y",
  },
  {
    slug: "wingbutton",
    category: "sports-medicine",
    name: "WingButton™ з регульованою петлею",
    short: "WingButton™",
    maker: "Регульована кортикальна фіксація",
    where: "Пластика передньої хрестоподібної зв’язки та інші реконструкції, де трансплантат фіксують у кістковому тунелі.",
    why:
      "Петлю можна підтягнути вже після проведення пластини, тому трансплантат входить у тунель на потрібну глибину без вимірювання довжини наперед.",
    spec: [
      ["Пластина", "12 × 4 × 1,5 мм, 4 отвори"],
      ["Петля", "регульована, показано 20 мм"],
    ],
    materials: ["ti-dark", "suture"],
    product: null,
    pose: [0, 0, 0],
    spin: "y",
  },
  {
    slug: "crescent-fix",
    category: "sports-medicine",
    name: "Crescent-Fix™ для шва меніска",
    short: "Crescent-Fix™",
    maker: "Система «все всередині»",
    where: "Розриви меніска в задніх відділах, які зшивають артроскопічно без додаткових розрізів.",
    why:
      "Імпланти й нитка заряджені в голку з вигином 12°. Хірург проводить її крізь меніск з артроскопічного доступу, і шов затягується всередині суглоба.",
    spec: [
      ["Голка", "вигин 12°"],
      ["Шов", "2-0"],
      ["Показано", "інструмент доставки"],
    ],
    materials: ["plastic", "ti-polished"],
    product: "crescent-fix",
    pose: [0, 0, -90],
    spin: "x",
  },
];

const CATEGORY_GROUP: Record<Model3D["category"], GroupId> = {
  joints: "joints",
  traumatology: "plates",
  "sports-medicine": "sports",
  equipment: "equipment",
};
export const groupOf = (m: Model3D): GroupId => m.group ?? CATEGORY_GROUP[m.category];

export const models3d: Model3D[] = [...baseModels, ...moreModels];

/** The 3D model of a catalogue product, if there is one (assemblies come first in the list). */
export const modelForProduct = (product: string) => models3d.find((m) => m.product === product);
