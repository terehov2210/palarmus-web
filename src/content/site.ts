/**
 * Site-wide facts. Everything here is taken verbatim from the live
 * palarmus.com.ua build.
 */

export const site = {
  name: "Palarmus Implants",
  tagline: "Нове покоління імплантів",
  description:
    "Постачання імплантів та медичних рішень для травматології й ортопедії: стержні, гвинти, пластини для остеосинтезу, ендопротези суглобів, біоактивні ін’єкції гіалуронової кислоти.",
  phone: {
    label: "+38 (095) 2025 005",
    href: "tel:+380952025005",
  },
  email: {
    label: "palarmusimplants@gmail.com",
    href: "mailto:palarmusimplants@gmail.com",
  },
  address: {
    label: "м. Одеса, вул. Балківська 120/1",
    // TODO: replace with the Google Maps place link for the Odesa office.
    href: null as string | null,
  },
  instagram: {
    label: "implants.ua",
    href: "https://www.instagram.com/implants.ua/",
  },
  url: "https://palarmus.com.ua",
} as const;

export const primaryNav = [
  { label: "Каталог", href: "/catalog" },
  { label: "Про компанію", href: "/about" },
  { label: "Покупцям", href: "/for-buyers" },
  { label: "Блог", href: "/blog" },
  { label: "Контакти", href: "/contacts" },
] as const;

export const footerNav = {
  catalog: {
    heading: "Каталог",
    links: [
      { label: "Імпланти для травматології", href: "/catalog/traumatology" },
      { label: "Імпланти для заміни суглобів", href: "/catalog/joints" },
      { label: "Спінальна хірургія", href: "/catalog/spinal" },
      { label: "Спортивна медицина", href: "/catalog/sports-medicine" },
      { label: "Обладнання", href: "/catalog/equipment" },
      { label: "Гіалуронова кислота", href: "/catalog/hyaluronic-acid" },
    ],
  },
  company: {
    heading: "Компанія",
    links: [
      { label: "Про компанію", href: "/about" },
      { label: "Сертифікати якості", href: "/#certificates" },
      { label: "Відгуки лікарів", href: "/#reviews" },
      { label: "Блог", href: "/blog" },
      { label: "Контакти", href: "/contacts" },
    ],
  },
  account: {
    heading: "Кабінет",
    links: [
      { label: "Профіль", href: "/account" },
      { label: "Мої замовлення", href: "/account/orders" },
      { label: "Обране", href: "/account/wishlist" },
      { label: "Порівняння", href: "/compare" },
    ],
  },
} as const;
