import type { Metadata } from "next";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { Consultation } from "@/components/sections/consultation";
import { InstagramGlyph } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
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

/**
 * Each channel is one card and, where it has an address, one link: the whole
 * card is the target, so a phone number is a thumb-sized tap, not a line of
 * text to aim at.
 */
export default function ContactsPage() {
  return (
    <>
      <PageHeader
        id="contacts-title"
        trail={[{ label: "Головна", href: "/" }, { label: "Контакти" }]}
        eyebrow="Контакти"
        title={
          <>
            Зв’яжіться <strong>з нами</strong>
          </>
        }
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {channels.map(({ icon: Icon, label, value, href, note }, i) => {
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-control bg-accent-tint text-fg-accent">
                    <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
                  </span>
                  {href ? (
                    <ArrowUpRight
                      aria-hidden="true"
                      size={18}
                      strokeWidth={2}
                      className="text-fg-muted transition-[color,translate] duration-fast ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg-accent"
                    />
                  ) : null}
                </div>
                <div className="mt-8 flex flex-col gap-2">
                  <p className="text-label uppercase text-fg-muted">{label}</p>
                  <p className="text-h3 text-pretty break-words text-fg">{value}</p>
                  <p className="text-body-sm text-pretty text-fg-secondary">{note}</p>
                </div>
              </>
            );
            const card =
              "group flex h-full flex-col rounded-card bg-surface p-6 ring-1 ring-inset ring-hairline transition-[box-shadow,translate] duration-medium ease-out-quint";
            return (
              <Reveal as="li" key={label} delay={i * 60} className="h-full">
                {href ? (
                  <a href={href} className={`${card} hover:-translate-y-1 hover:shadow-card-hover`}>
                    {body}
                  </a>
                ) : (
                  <div className={card}>{body}</div>
                )}
              </Reveal>
            );
          })}
        </ul>

        <a
          href={site.instagram.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-fit items-center gap-3 rounded-pill bg-surface px-5 text-body-sm text-fg ring-1 ring-inset ring-hairline transition-[background-color,box-shadow,scale] duration-fast ease-out-quint active:scale-[0.97] hover:bg-base hover:shadow-card"
        >
          <InstagramGlyph size={16} strokeWidth={1.5} />
          Instagram — {site.instagram.label}
        </a>
      </PageHeader>

      <Consultation />
    </>
  );
}
