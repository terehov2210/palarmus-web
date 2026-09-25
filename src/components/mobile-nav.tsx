"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Mail, MapPin, Menu, Phone, X } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { primaryNav, site } from "@/content/site";

/**
 * Base UI Dialog. It traps focus, locks the page scroll, makes the rest of the
 * page inert, closes on Escape and hands focus back to the trigger.
 *
 * Controlled rather than uncontrolled for one reason: a menu link has to close
 * the sheet as it navigates, and `Dialog.Close` is a button — rendering a link
 * through it would stamp button semantics onto an `<a>`.
 *
 * Enter is 240ms, exit 150ms, off Base UI's `data-starting-style` and
 * `data-ending-style`. Under a reduce preference the global rule in
 * globals.css drops `translate`, so it degrades to a plain fade.
 *
 * The sheet renders into a portal on the page ground, so it follows the
 * active theme.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Відкрити меню"
        className="inline-flex size-11 items-center justify-center rounded-control text-fg transition-[background-color] duration-fast ease-out-quint hover:bg-raised lg:hidden"
      >
        <Menu aria-hidden="true" size={22} strokeWidth={2} />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black/60 transition-opacity duration-enter ease-out-quint data-ending-style:opacity-0 data-ending-style:duration-exit data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Popup className="fixed bg-base text-fg inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain transition-[opacity,translate] duration-enter ease-out-quint data-ending-style:-translate-y-2 data-ending-style:opacity-0 data-ending-style:duration-exit data-starting-style:-translate-y-2 data-starting-style:opacity-0">
          <div className="container-page flex min-h-full flex-1 flex-col gap-8 py-5">
            <div className="flex h-8 items-center justify-between">
              <Dialog.Title className="sr-only">Меню сайту</Dialog.Title>
              <Logo className="h-8 w-auto text-fg" />
              <Dialog.Close
                aria-label="Закрити меню"
                className="-me-2 inline-flex size-11 items-center justify-center rounded-control text-fg transition-[background-color] duration-fast ease-out-quint hover:bg-raised"
              >
                <X aria-hidden="true" size={22} strokeWidth={2} />
              </Dialog.Close>
            </div>

            <nav aria-label="Основна навігація" className="flex-1">
              <ul className="flex flex-col">
                {primaryNav.map((item) => (
                  <li key={item.href} className="border-b border-hairline">
                    <Link
                      href={item.href}
                      onClick={close}
                      className="flex min-h-16 items-center justify-between text-h2 text-fg transition-[color] duration-fast ease-out-quint hover:text-fg-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
              <a
                href={site.phone.href}
                className="inline-flex min-h-11 items-center gap-3 text-body font-semibold text-fg"
              >
                <Phone aria-hidden="true" size={18} strokeWidth={2} />
                {site.phone.label}
              </a>
              <a
                href={site.email.href}
                className="inline-flex min-h-11 items-center gap-3 text-body text-fg-secondary"
              >
                <Mail aria-hidden="true" size={18} strokeWidth={1.5} />
                {site.email.label}
              </a>
              <p className="inline-flex items-start gap-3 text-body text-fg-secondary">
                <MapPin
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0"
                />
                {site.address.label}
              </p>
              <Link
                href="/#consultation"
                onClick={close}
                className={buttonClasses("primary", "lg", "w-full")}
              >
                Отримати консультацію
              </Link>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
