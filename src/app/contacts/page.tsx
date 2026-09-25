import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Reveal } from "@/components/reveal";
import { Consultation } from "@/components/sections/consultation";
import { InstagramGlyph } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/section";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Контакти",
  description: `Зв’язатися з ${site.name}: ${site.phone.label}, ${site.email.label}, ${site.address.label}.`,
  alternates: { canonical: "/contacts" },
};

const channels = [
  {
    icon: Phone,
    label: "Телефон",
    value: site.phone.label,
    href: site.phone.href,
    note: "Дзвоніть у робочий час — підкажемо з підбором і строком доставки.",
  },
  {
    icon: Mail,
    label: "Пошта",
    value: site.email.label,
    href: site.email.href,
    note: "Для запитів на документи, тендерні пропозиції та рахунки.",
  },
  {
    icon: MapPin,
    label: "Офіс",
    value: site.address.label,
    href: site.address.href,
    note: "Представники працюють у кожному місті України.",
  },
] as const;

export default function ContactsPage() {
  return (
    <>
      <section
        aria-labelledby="contacts-title"
        className="border-b border-hairline"
      >
        <div className="container-page flex flex-col gap-5 py-12 lg:py-16">
          <Breadcrumbs
            trail={[{ label: "Головна", href: "/" }, { label: "Контакти" }]}
          />
          <Reveal className="flex flex-col gap-5">
            <Eyebrow>Контакти</Eyebrow>
            <h1 id="contacts-title" className="text-display text-balance text-fg">
              Зв’яжіться <strong>з нами</strong>
            </h1>
            <span aria-hidden="true" className="brand-mark size-3" />
          </Reveal>

          <ul className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-3">
            {channels.map(({ icon: Icon, label, value, href, note }, i) => (
              <Reveal
                as="li"
                key={label}
                delay={i * 60}
                className="flex flex-col gap-3 border-t-2 border-fg pt-6"
              >
                <p className="flex items-center gap-2 text-label uppercase text-fg-muted">
                  <Icon aria-hidden="true" size={14} strokeWidth={2} />
                  {label}
                </p>
                {href ? (
                  <a
                    href={href}
                    className="w-fit text-h3 text-fg transition-[color] duration-fast ease-out-quint hover:text-fg-accent"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-h3 text-fg">{value}</p>
                )}
                <p className="text-body-sm text-pretty text-fg-secondary">
                  {note}
                </p>
              </Reveal>
            ))}
          </ul>

          <a
            href={site.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 w-fit items-center gap-3 rounded-control border border-hairline-strong px-4 text-body-sm text-fg transition-[border-color,color,scale] duration-fast ease-out-quint active:scale-[0.97] hover:border-fg"
          >
            <InstagramGlyph size={16} strokeWidth={1.5} />
            Instagram — {site.instagram.label}
          </a>
        </div>
      </section>

      <Consultation />
    </>
  );
}
