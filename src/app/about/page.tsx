import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Reveal } from "@/components/reveal";
import { Consultation } from "@/components/sections/consultation";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Eyebrow, Section, SectionHeader } from "@/components/ui/section";
import { categories } from "@/content/catalog";
import { site } from "@/content/site";
import { advantages, partners } from "@/content/trust";

export const metadata: Metadata = {
  title: "Про компанію",
  description:
    "Palarmus — молода та динамічна компанія, що виводить на український ринок сучасні рішення у травматології та ортопедії разом із провідними виробниками.",
  alternates: { canonical: "/about" },
};

/**
 * Every sentence of copy on this page is either the brandbook's own
 * (sections 1.2 and 1.3) or already on the live site. Nothing here is a
 * figure, a date or a claim that would need a document behind it.
 */
export default function AboutPage() {
  return (
    <>
      <section aria-labelledby="about-title" className="border-b border-hairline">
        <div className="container-page flex flex-col gap-5 py-12 lg:py-16">
          <Breadcrumbs
            trail={[{ label: "Головна", href: "/" }, { label: "Про компанію" }]}
          />
          <Reveal className="flex flex-col gap-5">
            <Eyebrow>Про компанію</Eyebrow>
            <h1
              id="about-title"
              className="max-w-[20ch] text-display text-balance text-fg"
            >
              Світові технології <strong>ортопедії</strong> — доступні в Україні
            </h1>
            <span aria-hidden="true" className="brand-mark size-3" />
          </Reveal>
        </div>
      </section>

      <Section labelledBy="about-brand-title">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <Reveal className="flex flex-col gap-4">
            <h2 id="about-brand-title" className="text-h2 text-fg">
              Про бренд
            </h2>
            <span aria-hidden="true" className="brand-mark size-2.5" />
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-[60ch] text-lede text-pretty text-fg-secondary">
              {site.about}
            </p>
          </Reveal>
        </div>
      </Section>

      {/* The mission, set the way the brandbook sets it: the wordmark over
          the brand line. */}
      <Section tone="surface" labelledBy="about-mission-title">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-20">
          <Reveal className="flex flex-col items-start gap-5">
            <Logo variant="wordmark" className="h-8 w-auto text-fg sm:h-10" />
            <p className="border-t border-hairline-strong pt-3 text-label uppercase text-fg-secondary">
              {site.slogan}
            </p>
          </Reveal>
          <Reveal delay={80} className="flex flex-col gap-4">
            <h2 id="about-mission-title" className="text-h2 text-fg">
              Місія
            </h2>
            <span aria-hidden="true" className="brand-mark size-2.5" />
            <p className="mt-2 max-w-[60ch] text-lede text-pretty text-fg-secondary">
              {site.mission}
            </p>
          </Reveal>
        </div>
      </Section>

      <Section labelledBy="about-how-title">
        <SectionHeader
          titleId="about-how-title"
          title="Як ми працюємо"
          description="Разом із виробниками систем, а не замість них: від підбору набору до навчання команди."
        />
        <ul className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((advantage, i) => (
            <Reveal
              as="li"
              key={advantage.title}
              delay={(i % 4) * 60}
              className="flex flex-col gap-3 border-t-2 border-fg pt-6"
            >
              <h3 className="text-h3 text-fg">{advantage.title}</h3>
              <p className="text-body-sm text-pretty text-fg-secondary">
                {advantage.body}
              </p>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section labelledBy="about-scope-title" className="border-t border-hairline">
        <SectionHeader
          titleId="about-scope-title"
          title="Напрями та виробники"
          action={
            <ButtonLink href="/catalog" variant="secondary">
              До каталогу
            </ButtonLink>
          }
        />
        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal as="ul" className="flex flex-col">
            {categories.map((category) => (
              <li key={category.slug} className="border-t border-hairline">
                <Link
                  href={`/catalog/${category.slug}`}
                  className="flex min-h-14 items-center gap-5 py-3 text-body text-fg transition-[color] duration-fast ease-out-quint hover:text-fg-accent"
                >
                  <span className="w-6 shrink-0 text-label text-fg-muted">
                    {category.index}
                  </span>
                  {category.title}
                </Link>
              </li>
            ))}
          </Reveal>
          <Reveal as="ul" delay={80} className="flex flex-col">
            {partners.map((partner) => (
              <li
                key={partner.name}
                className="flex flex-col gap-1 border-t border-hairline py-4"
              >
                <span className="text-h3 text-fg">{partner.name}</span>
                <span className="text-body-sm text-fg-muted">
                  {partner.note}
                </span>
              </li>
            ))}
          </Reveal>
        </div>
      </Section>

      <Consultation />
    </>
  );
}
