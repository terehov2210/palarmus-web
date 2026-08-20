import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { InstagramGlyph } from "@/components/ui/icons";

import { footerNav, site } from "@/content/site";

const columns = [footerNav.catalog, footerNav.company, footerNav.account];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-surface">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.2fr_2fr] lg:gap-16 lg:py-20">
        <div className="flex flex-col gap-6">
          <Link href="/" aria-label={`${site.name} — головна сторінка`}>
            <Image
              src="/brand/logo.png"
              alt={site.name}
              width={148}
              height={37}
              className="h-8 w-auto"
            />
          </Link>
          <p className="max-w-[42ch] text-body-sm text-pretty text-fg-secondary">
            {site.tagline}. Постачаємо імпланти та медичні рішення для
            травматології й ортопедії по всій Україні.
          </p>

          <ul className="flex flex-col gap-3 text-body-sm">
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
            className="inline-flex min-h-11 w-fit items-center gap-3 rounded-control border border-hairline-strong px-4 text-body-sm text-fg transition-[border-color,color] duration-fast ease-out-quint hover:border-control-line hover:text-fg-accent"
          >
            <InstagramGlyph size={16} strokeWidth={1.5} />
            Instagram — {site.instagram.label}
          </a>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          {columns.map((column) => (
            <nav
              key={column.heading}
              aria-labelledby={`footer-${column.heading}`}
            >
              <h2
                id={`footer-${column.heading}`}
                className="text-label uppercase text-fg-muted"
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
      </div>

      <div className="border-t border-hairline">
        <div className="container-page flex flex-col gap-4 py-6 text-caption text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. Усі права захищені.</p>
          <p>
            Оплата: Visa, Mastercard, безготівковий розрахунок для клінік
          </p>
        </div>
      </div>
    </footer>
  );
}
