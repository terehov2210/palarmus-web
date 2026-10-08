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
  | "suture";

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
};

export type Model3D = {
  slug: string;
  /** Catalogue category slug, so the filter reuses the catalogue's own names. */
  category: "joints" | "traumatology" | "sports-medicine";
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

export const models3d: Model3D[] = [
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
    materials: ["ti-polished", "ti-plasma", "ti-satin", "ti-trabecular", "polyethylene", "ceramic"],
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
    materials: ["ti-polished", "ti-plasma", "ti-satin"],
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
    materials: ["ti-satin"],
    product: "titan-long",
    pose: [0, 0, -90],
    spin: "x",
  },
  {
    slug: "pfna-blade",
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
];
