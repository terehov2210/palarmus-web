import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { ButtonLink } from "@/components/ui/button";
import { primaryNav, site } from "@/content/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-base/85 backdrop-blur-xl">
      <div className="container-page flex h-18 items-center gap-6">
        <Link
          href="/"
          className="shrink-0 rounded-control"
          aria-label={`${site.name} — головна сторінка`}
        >
          <Image
            src="/brand/logo.png"
            alt={site.name}
            width={148}
            height={37}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav aria-label="Основна навігація" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative inline-flex min-h-10 items-center rounded-control px-3 text-body-sm font-medium text-fg-secondary transition-[color] duration-fast ease-out-quint after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-accent-line after:transition-[scale] after:duration-fast after:ease-out-quint hover:text-fg hover:after:scale-x-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <a
            href={site.phone.href}
            className="hidden min-h-10 items-center gap-2 rounded-control px-3 text-body-sm font-semibold text-fg transition-[color] duration-fast ease-out-quint hover:text-fg-accent md:inline-flex"
          >
            <Phone aria-hidden="true" size={16} strokeWidth={2} />
            {site.phone.label}
          </a>

          {/* Visibility lives on a wrapper: `hidden` on the link itself would
              lose to the `inline-flex` in the button's own base classes.

              Secondary on purpose — the sticky header must never put a second
              filled action on screen beside the one a section already owns. */}
          <span className="hidden sm:block">
            <ButtonLink href="#consultation" variant="secondary">
              Отримати консультацію
            </ButtonLink>
          </span>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
