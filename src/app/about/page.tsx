import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { advantageIcons } from "@/components/sections/advantages";
import { Consultation } from "@/components/sections/consultation";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { PageHeader } from "@/components/ui/page-header";
import { Section, SectionHeader } from "@/components/ui/section";
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
      <PageHeader
        id="about-title"
        trail={[{ label: "Головна", href: "/" }, { label: "Про компанію" }]}
        eyebrow="Про компанію"
        title={
          <>
            Світові технології <strong>ортопедії</strong> — доступні в Україні
          </>
        }
      />

      {/* Brand and mission as a pair of cards: the story on the left, the
          mission set the way the brandbook sets it — wordmark over the brand
          line — on the right. */}
      <Section labelledBy="about-brand-title" className="pt-0 lg:pt-0">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
          <Reveal className="flex flex-col gap-5 rounded-card bg-surface p-8 ring-1 ring-inset ring-hairline lg:p-12">
            <h2 id="about-brand-title" className="text-h2 text-fg">
              Про бренд
            </h2>
            <p className="max-w-[60ch] text-lede text-pretty text-fg-secondary">{site.about}</p>
          </Reveal>

          <Reveal
            delay={80}
            className="relative isolate flex flex-col justify-between gap-10 overflow-hidden rounded-card bg-surface p-8 ring-1 ring-inset ring-hairline lg:p-12"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -end-20 -top-24 -z-10 h-72 w-96 rounded-full bg-[radial-gradient(closest-side,rgb(199_0_11/0.14),transparent)] blur-2xl"
            />
            <div className="flex flex-col items-start gap-4">
              <Logo variant="wordmark" className="h-8 w-auto text-fg sm:h-9" />
              <p className="flex items-center gap-2 text-label uppercase text-fg-muted">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-solid" />
                {site.slogan}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-h3 text-fg">Місія</h2>
              <p className="text-body text-pretty text-fg-secondary">{site.mission}</p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section labelledBy="about-how-title" className="pt-0 lg:pt-0">
        <SectionHeader
          titleId="about-how-title"
          title="Як ми працюємо"
          description="Разом із виробниками систем, а не замість них: від підбору набору до навчання команди."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((advantage, i) => {
            const Icon = advantageIcons[advantage.icon];
            return (
              <Reveal
                as="li"
                key={advantage.title}
                delay={(i % 4) * 60}
                className="flex flex-col gap-4 rounded-card bg-surface p-7 ring-1 ring-inset ring-hairline"
              >
                <span className="mb-4 grid size-12 place-items-center rounded-inner bg-accent-tint text-fg-accent">
                  <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
                </span>
                <h3 className="text-h3 text-fg">{advantage.title}</h3>
                <p className="text-body-sm text-pretty text-fg-secondary">{advantage.body}</p>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      <Section labelledBy="about-scope-title" className="pt-0 lg:pt-0">
        <SectionHeader
          titleId="about-scope-title"
          title="Напрями та виробники"
          action={
            <ButtonLink href="/catalog" variant="secondary">
              До каталогу
            </ButtonLink>
          }
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
          <Reveal as="ul" className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/catalog/${category.slug}`}
                  className="group flex min-h-16 items-center gap-4 rounded-inner bg-surface px-5 py-3 text-body font-medium text-fg ring-1 ring-inset ring-hairline transition-[background-color,box-shadow] duration-fast ease-out-quint hover:bg-base hover:shadow-card"
                >
                  <span className="shrink-0 rounded-pill bg-fg/[0.05] px-2 py-0.5 text-label text-fg-muted tabular-nums">
                    {category.index}
                  </span>
                  <span className="flex-1 text-pretty">{category.title}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                    className="shrink-0 text-fg-muted transition-[color,translate] duration-fast ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg-accent"
                  />
                </Link>
              </li>
            ))}
          </Reveal>
          <Reveal as="ul" delay={80} className="flex flex-col gap-2">
            {partners.map((partner) => (
              <li
                key={partner.name}
                className="flex flex-col gap-1 rounded-inner bg-surface px-6 py-5 ring-1 ring-inset ring-hairline"
              >
                <span className="font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-fg">
                  {partner.name}
                </span>
                <span className="text-body-sm text-fg-muted">{partner.note}</span>
              </li>
            ))}
          </Reveal>
        </div>
      </Section>

      <Consultation />
    </>
  );
}
