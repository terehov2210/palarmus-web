/**
 * Site-wide facts. Everything here is taken verbatim from the live
 * palarmus.com.ua build.
 */

export const site = {
  name: "Palarmus Implants",
  tagline: "Нове покоління імплантів",
  /** The brand line, from the brandbook's mission page (section 1.3). */
  slogan: "Інновації, які лікують",
  description:
    "Постачання імплантів та медичних рішень для травматології й ортопедії: стержні, гвинти, пластини для остеосинтезу, ендопротези суглобів, біоактивні ін’єкції гіалуронової кислоти.",
  /**
   * Shorter line for the hero. `description` stays as written for metadata
   * and the OG card, where length helps; in the hero it ran to four lines and
   * was a large part of why the section overflowed the first screen. It also
   * listed the same six directions the catalogue section repeats right below.
   */
  heroLede:
    "Остеосинтез, ендопротезування та артроскопія — від виробників напряму.",
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
  /** Brandbook, section 1.2 — «Про бренд». Verbatim. */
  about:
    "Palarmus — це молода та динамічна компанія, що виводить на український ринок сучасні рішення у травматології та ортопедії. Компанія вивчає світові тенденції, співпрацює з провідними виробниками та формує портфоліо з інноваційних імплантів, щоб зробити їх доступними для українських пацієнтів та лікарів. Palarmus забезпечує Україну інноваційними медичними технологіями світового рівня.",
  /** Brandbook, section 1.3 — «Місія». Verbatim. */
  mission:
    "Місія бренду — надавати інноваційні рішення для медичної галузі, які об’єднують найкращі світові технології, практичність та бездоганну якість. Бренд втілює віру в те, що прогрес у медицині починається з доступу до правильних інструментів.",
} as const;

/**
 * Only routes that exist. «Покупцям», «Блог» and the account area are on the
 * live site's menu but have no content yet; they come back here when their
 * pages are built, rather than linking to a placeholder.
 */
export const primaryNav = [
  { label: "Каталог", href: "/catalog" },
  { label: "Навчання", href: "/education" },
  { label: "Про компанію", href: "/about" },
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
      { label: "Навчання", href: "/education" },
      { label: "Глосарій", href: "/education#glossary" },
      { label: "Консультація", href: "/#consultation" },
      { label: "Контакти", href: "/contacts" },
    ],
  },
} as const;
