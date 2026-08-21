/**
 * Catalogue categories. Titles, groupings and art are taken from the live
 * palarmus.com.ua build; `slug` is the URL segment the previous build already
 * used, so no link changes.
 *
 * Individual products live in `products.ts`.
 */

export type Category = {
  index: string;
  slug: string;
  title: string;
  /** One line, used on cards. */
  summary: string;
  /** Longer intro, used as the lede on the category page. */
  blurb: string;
  image: string;
  /** Empty string marks the art as decorative for assistive technology. */
  imageAlt: string;
};

export const categories: Category[] = [
  {
    index: "01",
    slug: "traumatology",
    title: "Імпланти для травматології",
    summary: "Стержні, гвинти та пластини для остеосинтезу.",
    blurb:
      "Інтрамедулярні стержні для стегнової, великогомілкової та плечової кістки, поліаксіальні блокуючі пластини з анатомічним контуром і повна гвинтова номенклатура — кортикальні, спонгіозні, канюльовані компресійні.",
    image: "/categories/traumatology.webp",
    imageAlt: "",
  },
  {
    index: "02",
    slug: "joints",
    title: "Імпланти для заміни суглобів",
    summary: "Ендопротези кульшового та колінного суглобів.",
    blurb:
      "Первинне та ревізійне ендопротезування кульшового суглоба з парами тертя кераміка-поліетилен і метал-поліетилен, безцементні чашки з трабекулярного титану, тотальні та одновиросткові системи для коліна.",
    image: "/categories/joints.webp",
    imageAlt: "",
  },
  {
    index: "03",
    slug: "spinal",
    title: "Спінальна хірургія",
    summary: "Системи транспедикулярної фіксації та кейджі.",
    blurb:
      "Транспедикулярна фіксація та міжтілові кейджі. Позиції цього напряму ми підбираємо під конкретний випадок разом із виробником — напишіть, що потрібно, і ми узгодимо комплектацію та строк.",
    image: "/categories/spinal.webp",
    imageAlt: "",
  },
  {
    index: "04",
    slug: "sports-medicine",
    title: "Спортивна медицина",
    summary: "Якірна фіксація для артроскопії плеча й коліна.",
    blurb:
      "Шовні якорі всіх типів — титанові, полімерні PEEK, біорезорбовані та повністю нитковані, — системи кортикальної фіксації з кнопковим механізмом, інтерференційні гвинти й інструмент для відновлення меніска.",
    image: "/categories/sports.webp",
    imageAlt: "",
  },
  {
    index: "05",
    slug: "equipment",
    title: "Обладнання",
    summary: "Інструменти й набори для операційної.",
    blurb:
      "Силовий інструмент і системи для операційної: акумуляторні дрилі з набором насадок для ортопедії, травматології та мікрохірургії.",
    image: "/categories/equipment.webp",
    imageAlt: "",
  },
  {
    index: "06",
    slug: "hyaluronic-acid",
    title: "Гіалуронова кислота",
    summary: "Біоактивні внутрішньосуглобові ін’єкції.",
    blurb:
      "Крос-лінковані гідрогелі гіалуронату натрію для внутрішньосуглобового введення при гонартрозі та інших дегенеративних ураженнях суглобів.",
    image: "/categories/hyaluronic.webp",
    imageAlt: "",
  },
];

export const findCategory = (slug: string) =>
  categories.find((c) => c.slug === slug);
