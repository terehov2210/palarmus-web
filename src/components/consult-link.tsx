"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";

const TARGET = "consultation";

/**
 * «Отримати консультацію» from anywhere. Only some pages carry the form, so a
 * bare `#consultation` went nowhere on the catalogue, 3D models and training.
 *
 * The href is a real page that always has the form (`/contacts`), so the link
 * works without JavaScript and with Cmd/Ctrl/middle-click. When the current page
 * has its own form — the product page's is already prefilled with the product —
 * a plain click scrolls to that one instead and hands it focus.
 */
export function ConsultLink({
  onClick,
  defer = 0,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  /**
   * Milliseconds to wait before scrolling. The mobile menu needs it: its
   * scroll lock restores the old position as it closes, which would undo a
   * scroll made while it was still open.
   */
  defer?: number;
}) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const section = document.getElementById(TARGET);
    if (!section) return;
    event.preventDefault();
    window.history.replaceState(null, "", `#${TARGET}`);
    const go = () => {
      section.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      // The first field, so a keyboard user lands where the scroll did.
      section.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
    };
    if (defer > 0) window.setTimeout(go, defer);
    else go();
  };

  return <Link href={`/contacts#${TARGET}`} onClick={handle} {...props} />;
}
