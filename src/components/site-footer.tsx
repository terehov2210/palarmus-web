import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { InstagramGlyph } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";

import { footerNav, site } from "@/content/site";

const columns = [footerNav.catalog, footerNav.company];

/**
 * On the page ground like everything else, divided from it by a hairline.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-base">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.3fr_1fr_1fr] lg:gap-16 lg:py-20">
        <div className="flex flex-col gap-6">
          <Link
            href="/"
            aria-label={`${site.name} — головна сторінка`}
            className="block w-fit rounded-control"
          >
            <Logo className="h-10 w-auto text-fg" />
          </Link>
          <p className="flex items-center gap-2 text-label uppercase text-fg-muted">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-solid" />
            {site.slogan}
          </p>
          <p className="max-w-[42ch] text-body-sm text-pretty text-fg-secondary">
            Постачаємо імпланти та медичні рішення для травматології й
            ортопедії по всій Україні.
          </p>

          <ul className="flex flex-col gap-2 text-body-sm">
            <li>
              <a
                href={site.phone.href}
                className="inline-flex min-h-9 items-center gap-3 font-semibold text-fg transition-[color] duration-fast ease-out-quint hover:text-fg-accent"
              >
                <Phone aria-hidden="true" size={16} strokeWidth={2} />
                {site.phone.label}
              </a>
            </li>
            <li>
              <a
                href={site.email.href}
                className="inline-flex min-h-9 items-center gap-3 text-fg-secondary transition-[color] duration-fast ease-out-quint hover:text-fg"
              >
                <Mail aria-hidden="true" size={16} strokeWidth={1.5} />
                {site.email.label}
              </a>
            </li>
            <li className="flex items-start gap-3 py-1 text-fg-secondary">
              <MapPin
                aria-hidden="true"
                size={16}
                strokeWidth={1.5}
                className="mt-1 shrink-0"
              />
              {site.address.label}
            </li>
          </ul>

          <a
            href={site.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center gap-3 rounded-pill bg-raised px-5 text-body-sm text-fg ring-1 ring-inset ring-hairline transition-[background-color,box-shadow,scale] duration-fast ease-out-quint active:scale-[0.97] hover:ring-hairline-strong"
          >
            <InstagramGlyph size={16} strokeWidth={1.5} />
            Instagram — {site.instagram.label}
          </a>
        </div>

        {columns.map((column) => (
          <nav key={column.heading} aria-labelledby={`footer-${column.heading}`}>
            <h2
              id={`footer-${column.heading}`}
              className="text-label font-sans uppercase text-fg-muted"
            >
              {column.heading}
            </h2>
            <ul className="mt-5 flex flex-col gap-1">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-9 items-center text-body-sm text-fg-secondary transition-[color] duration-fast ease-out-quint hover:text-fg"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-hairline">
        <div className="container-page flex flex-col gap-4 py-6 text-caption text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Усі права захищені.
          </p>
          <p>
            Оплата: Visa, Mastercard, безготівковий розрахунок для клінік
          </p>
        </div>

        {/* Attribution for the hero's 3D skeleton. CC BY-SA 4.0 asks for the
            author, the source, the licence and a note that the work was
            changed, in any reasonable place for the medium; a site-wide
            credits line qualifies. The textures and the studio HDRI are CC0
            (ambientCG, Poly Haven) and need none, but naming them costs a line
            and is the courtesy both ask for. */}
        <div className="container-page pb-6 text-caption text-fg-muted">
          <p className="text-pretty">
            3D-модель скелета на головній створена на основі{" "}
            <a
              href="https://www.z-anatomy.com/"
              rel="noopener"
              className="whitespace-nowrap underline underline-offset-2 transition-[color] duration-fast ease-out-quint hover:text-fg"
            >
              Z-Anatomy
            </a>{" "}
            (змінено: поза, кепка, імпланти), ліцензія{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/deed.uk"
              rel="noopener license"
              className="whitespace-nowrap underline underline-offset-2 transition-[color] duration-fast ease-out-quint hover:text-fg"
            >
              CC BY-SA 4.0
            </a>
            . Текстури —{" "}
            <a
              href="https://ambientcg.com/"
              rel="noopener"
              className="whitespace-nowrap underline underline-offset-2 transition-[color] duration-fast ease-out-quint hover:text-fg"
            >
              ambientCG
            </a>
            , студійне освітлення —{" "}
            <a
              href="https://polyhaven.com/"
              rel="noopener"
              className="whitespace-nowrap underline underline-offset-2 transition-[color] duration-fast ease-out-quint hover:text-fg"
            >
              Poly Haven
            </a>{" "}
            (CC0).
          </p>
        </div>
      </div>

    </footer>
  );
}
