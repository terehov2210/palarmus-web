/**
 * Categories and featured products. Names, images and groupings are taken
 * from the live palarmus.com.ua build.
 */

export type Category = {
  index: string;
  title: string;
  summary: string;
  href: string;
  image: string;
  /** Empty string marks the art as decorative for assistive technology. */
  imageAlt: string;
};

export const categories: Category[] = [
  {
    index: "01",
    title: "Імпланти для травматології",
    summary: "Стержні, гвинти та пластини для остеосинтезу.",
    href: "/catalog/traumatology",
    image: "/categories/traumatology.webp",
    imageAlt: "",
  },
  {
    index: "02",
    title: "Імпланти для заміни суглобів",
    summary: "Ендопротези кульшового та колінного суглобів.",
    href: "/catalog/joints",
    image: "/categories/joints.webp",
    imageAlt: "",
  },
  {
    index: "03",
    title: "Спінальна хірургія",
    summary: "Системи транспедикулярної фіксації та кейджі.",
    href: "/catalog/spinal",
    image: "/categories/spinal.webp",
    imageAlt: "",
  },
  {
    index: "04",
    title: "Спортивна медицина",
    summary: "Якірна фіксація для артроскопії плеча й коліна.",
    href: "/catalog/sports-medicine",
    image: "/categories/sports.webp",
    imageAlt: "",
  },
  {
    index: "05",
    title: "Обладнання",
    summary: "Інструменти й набори для операційної.",
    href: "/catalog/equipment",
    image: "/categories/equipment.webp",
    imageAlt: "",
  },
  {
    index: "06",
    title: "Гіалуронова кислота",
    summary: "Біоактивні внутрішньосуглобові ін’єкції.",
    href: "/catalog/hyaluronic-acid",
    image: "/categories/hyaluronic.webp",
    imageAlt: "",
  },
];

export type Product = {
  name: string;
  category: string;
  summary: string;
  href: string;
  image: string;
  imageAlt: string;
};

export const featuredProducts: Product[] = [
  {
    name: "TrHCROSS 2,0%",
    category: "Гіалуронова кислота",
    summary: "Крос-лінкований гель для внутрішньосуглобової ін’єкції.",
    href: "/catalog/hyaluronic-acid/trhcross-2",
    image: "/products/trhcross.webp",
    imageAlt: "Шприц TrHCROSS 2,0% в упаковці",
  },
  {
    name: "Проксимальний стержень",
    category: "Травматологія",
    summary: "Інтрамедулярний остеосинтез проксимального відділу.",
    href: "/catalog/traumatology/proximal-rod",
    image: "/products/proximal-rod.webp",
    imageAlt: "Титановий проксимальний інтрамедулярний стержень",
  },
  {
    name: "RingButton™",
    category: "Спортивна медицина",
    summary: "Система кортикальної фіксації з фіксованою довжиною.",
    href: "/catalog/sports-medicine/ringbutton",
    image: "/products/ringbutton.webp",
    imageAlt: "Система кортикальної фіксації RingButton з нитками",
  },
  {
    name: "ParaTak™",
    category: "Спортивна медицина",
    summary: "Титановий шурупний якір для шва.",
    href: "/catalog/sports-medicine/paratak",
    image: "/products/paratak.webp",
    imageAlt: "Титановий якір для шва ParaTak",
  },
  {
    name: "LocTak™",
    category: "Спортивна медицина",
    summary: "Титановий якір із замковою фіксацією нитки.",
    href: "/catalog/sports-medicine/loctak",
    image: "/products/loctak.webp",
    imageAlt: "Титановий якір із замковою фіксацією LocTak",
  },
  {
    name: "SutureLoc™",
    category: "Спортивна медицина",
    summary: "Повністю нитковий якір без жорсткого тіла.",
    href: "/catalog/sports-medicine/sutureloc",
    image: "/products/sutureloc.webp",
    imageAlt: "Повністю нитковий якір SutureLoc",
  },
  {
    name: "XtraLoc™ PEEK",
    category: "Спортивна медицина",
    summary: "Полімерний якір для інтерференційної фіксації.",
    href: "/catalog/sports-medicine/xtraloc-peek",
    image: "/products/xtraloc.webp",
    imageAlt: "Полімерний інтерференційний якір XtraLoc PEEK",
  },
  {
    name: "SpeedLoc™",
    category: "Спортивна медицина",
    summary: "Біорезорбований якір для шва.",
    href: "/catalog/sports-medicine/speedloc",
    image: "/products/speedloc.png",
    imageAlt: "Біорезорбований якір для шва SpeedLoc",
  },
];
