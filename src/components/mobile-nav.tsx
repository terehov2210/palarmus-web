"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { Mail, MapPin, Menu, Phone, X } from "lucide-react";

import { primaryNav, site } from "@/content/site";

/**
 * Native `<dialog>` on purpose. `showModal()` traps focus, makes the rest of
 * the page inert, closes on Escape and returns focus to the trigger — all
 * behaviour a custom overlay has to rebuild and usually gets wrong.
 */
export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => dialogRef.current?.showModal(), []);
  const close = useCallback(() => dialogRef.current?.close(), []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Відкрити меню"
        className="inline-flex size-11 items-center justify-center rounded-control text-fg transition-[background-color] duration-fast ease-out-quint hover:bg-raised lg:hidden"
      >
        <Menu aria-hidden="true" size={22} strokeWidth={2} />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Меню сайту"
        className="m-0 h-full max-h-none w-full max-w-none overscroll-contain bg-base text-fg backdrop:bg-base/70 backdrop:backdrop-blur-sm"
      >
        <div className="container-page flex h-full flex-col gap-8 py-5">
          <div className="flex h-8 items-center justify-between">
            <p className="text-label uppercase text-fg-muted">Меню</p>
            <button
              type="button"
              onClick={close}
              aria-label="Закрити меню"
              className="-me-2 inline-flex size-11 items-center justify-center rounded-control text-fg transition-[background-color] duration-fast ease-out-quint hover:bg-raised"
            >
              <X aria-hidden="true" size={22} strokeWidth={2} />
            </button>
          </div>

          <nav aria-label="Основна навігація" className="flex-1">
            <ul className="flex flex-col">
              {primaryNav.map((item) => (
                <li key={item.href} className="border-b border-hairline">
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex min-h-14 items-center text-h2 font-bold tracking-tight text-fg"
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
              href="#consultation"
              onClick={close}
              className="inline-flex min-h-13 items-center justify-center rounded-control bg-accent-solid px-7 text-body font-semibold text-on-accent transition-[background-color,scale] duration-fast ease-out-quint active:scale-[0.96] hover:bg-accent-solid-hover"
            >
              Отримати консультацію
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
