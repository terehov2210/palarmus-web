/**
 * ⚠️  PLACEHOLDER CONTENT — REPLACE BEFORE LAUNCH
 * ==============================================================
 * The live palarmus.com.ua build claims "надійні бренди з міжнародними
 * сертифікатами якості" but never names a standard, a registration or a
 * document. Everything in this file is therefore *structure*, written so the
 * real records drop straight in — not verified fact.
 *
 * Before this page goes public, each entry below has to be replaced with a
 * document Palarmus actually holds, and `documentUrl` pointed at the scan.
 * Entries with `documentUrl: null` render as "Документ надається за запитом"
 * rather than as a link, so the page never offers a file that does not exist.
 *
 * Same applies to `stats` and `testimonials`: real numbers, real people, or
 * cut the section.
 */

export type Certificate = {
  code: string;
  title: string;
  issuer: string;
  scope: string;
  /** Path to the scan in /public, or null while it is unavailable. */
  documentUrl: string | null;
};

export const certificates: Certificate[] = [
  {
    code: "ISO 13485",
    title: "Система управління якістю медичних виробів",
    issuer: "Акредитований орган сертифікації", // TODO: назва органу
    scope:
      "Виробництво та дистрибуція імплантів для травматології й ортопедії.",
    documentUrl: null,
  },
  {
    code: "CE / MDR 2017/745",
    title: "Маркування відповідності Європейського Союзу",
    issuer: "Нотифікований орган ЄС", // TODO: назва та номер органу
    scope:
      "Клас IIb — імпланти для остеосинтезу та ендопротези суглобів.",
    documentUrl: null,
  },
  {
    code: "Держреєстрація",
    title: "Внесення до реєстру медичних виробів України",
    issuer: "Держлікслужба України", // TODO: номер запису в реєстрі
    scope: "Дозвіл на введення в обіг на території України.",
    documentUrl: null,
  },
  {
    code: "ISO 9001",
    title: "Система управління якістю",
    issuer: "Акредитований орган сертифікації", // TODO: назва органу
    scope: "Логістика, зберігання та супровід постачань.",
    documentUrl: null,
  },
];

export type Stat = {
  value: string;
  label: string;
};

/** ⚠️ PLACEHOLDER — no figures are published on the current site. */
export const stats: Stat[] = [
  { value: "24", label: "міста з представником" },
  { value: "6", label: "напрямів у каталозі" },
  { value: "120+", label: "позицій на складі" },
  { value: "48 год", label: "типова доставка в клініку" },
];

export type Advantage = {
  icon: "truck" | "graduation" | "layers" | "shield";
  title: string;
  body: string;
};

/** Taken verbatim from the live site's advantages block. */
export const advantages: Advantage[] = [
  {
    icon: "truck",
    title: "Швидка доставка",
    body: "Представники у кожному місті України — імплант доїжджає до операційної в межах доби.",
  },
  {
    icon: "graduation",
    title: "Навчання",
    body: "Навчання лікарів в Україні та за кордоном разом із виробниками систем.",
  },
  {
    icon: "layers",
    title: "Унікальні імпланти",
    body: "Широкий вибір та інновації для ортопедії й травматології, яких немає в інших постачальників.",
  },
  {
    icon: "shield",
    title: "Сертифікований товар",
    body: "Надійні бренди з міжнародними сертифікатами якості та повним комплектом документів.",
  },
];

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  city: string;
};

/**
 * ⚠️ PLACEHOLDER — written to exercise the layout at realistic length.
 * Do not publish. Collect real, attributed quotes with written consent from
 * each doctor before this section goes live.
 */
export const testimonials: Testimonial[] = [
  {
    quote:
      "Стержні для інтрамедулярного остеосинтезу приходять повним набором із інструментом. За півтора року жодної ревізії через імплант — для нашого відділення це головний аргумент.",
    author: "Ім’я лікаря", // TODO: реальне ім’я + письмова згода
    role: "Травматолог-ортопед",
    city: "Одеса",
  },
  {
    quote:
      "Замовляли якірну фіксацію для артроскопії плеча в п’ятницю, у вівторок вже оперували. Представник був на зв’язку весь час і привіз додатковий розмір на операцію.",
    author: "Ім’я лікаря", // TODO: реальне ім’я + письмова згода
    role: "Хірург, спортивна медицина",
    city: "Львів",
  },
  {
    quote:
      "Окремо відзначу навчання: перед першою серією імплантацій команда провела воркшоп із інженером виробника. Питань до техніки після цього не залишилося.",
    author: "Ім’я лікаря", // TODO: реальне ім’я + письмова згода
    role: "Завідувач відділення травматології",
    city: "Київ",
  },
  {
    quote:
      "Документи на кожну партію надають без нагадувань — сертифікат, декларація, номер серії. Для тендерної закупівлі це економить нам тижні.",
    author: "Ім’я лікаря", // TODO: реальне ім’я + письмова згода
    role: "Керівник закупівель клініки",
    city: "Дніпро",
  },
  {
    quote:
      "Гіалуронова кислота TrHCROSS тримає ефект довше за те, чим ми користувалися раніше. Пацієнти з гонартрозом другого ступеня повертаються рідше.",
    author: "Ім’я лікаря", // TODO: реальне ім’я + письмова згода
    role: "Ортопед",
    city: "Харків",
  },
  {
    quote:
      "Ендопротези отримали з повним інструментальним набором і шаблонами. Планування пройшло без сюрпризів, операція — у графіку.",
    author: "Ім’я лікаря", // TODO: реальне ім’я + письмова згода
    role: "Ортопед-протезист",
    city: "Вінниця",
  },
];

export type Partner = {
  name: string;
  note: string;
};

/** Both names appear on the live "Про компанію" page. */
export const partners: Partner[] = [
  { name: "iKey Medical", note: "Імпланти для остеосинтезу" },
  { name: "Oliga", note: "Стержні за технологією Dunitech" },
  { name: "iMed", note: "Гіалуронова кислота TrHCROSS" },
  // TODO: додати решту виробників, з якими підписано дистрибуцію.
];
