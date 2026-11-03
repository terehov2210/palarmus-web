"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNav } from "@/content/site";

/** A section counts as current on its own page and everything under it. */
export function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The header's section links. The current section carries `aria-current` and
 * the same raised pill that hover previews, so «where am I» reads at a glance
 * and to a screen reader alike.
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-0.5 rounded-pill bg-fg/[0.04] p-1 ring-1 ring-inset ring-hairline">
      {primaryNav.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className="inline-flex min-h-9 items-center rounded-pill px-4 text-body-sm font-medium text-fg-secondary transition-[background-color,color,box-shadow] duration-fast ease-out-quint hover:bg-base hover:text-fg hover:shadow-card aria-[current=page]:bg-base aria-[current=page]:text-fg aria-[current=page]:shadow-card"
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
