import Link from "next/link";
import { Phone } from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { primaryNav, site } from "@/content/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-base/75 backdrop-blur-2xl backdrop-saturate-150">
      <div className="container-page flex h-18 items-center gap-6">
        <Link
          href="/"
          className="block shrink-0 rounded-control"
          aria-label={`${site.name} — головна сторінка`}
        >
          <Logo className="h-9 w-auto text-fg" />
        </Link>

        <nav aria-label="Основна навігація" className="hidden lg:block">
          <ul className="flex items-center gap-0.5 rounded-pill bg-fg/[0.04] p-1 ring-1 ring-inset ring-hairline">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-9 items-center rounded-pill px-4 text-body-sm font-medium text-fg-secondary transition-[background-color,color,box-shadow] duration-fast ease-out-quint hover:bg-base hover:text-fg hover:shadow-card"
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
            className="hidden min-h-10 items-center gap-2 rounded-pill px-3 text-body-sm font-semibold text-fg transition-[color] duration-fast ease-out-quint hover:text-fg-accent md:inline-flex"
          >
            <Phone aria-hidden="true" size={16} strokeWidth={2} />
            {site.phone.label}
          </a>

          {/* Visibility lives on a wrapper: `hidden` on the link itself would
              lose to the `inline-flex` in the button's own base classes.

              Secondary on purpose — the sticky header must never put a second
              filled action on screen beside the one a section already owns. */}
          <span className="hidden sm:block">
            <ButtonLink
              href="#consultation"
              variant="secondary"
              className="bg-fg! text-(--color-base)! ring-0! hover:bg-fg-secondary!"
            >
              Отримати консультацію
            </ButtonLink>
          </span>

          <ThemeToggle />

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
