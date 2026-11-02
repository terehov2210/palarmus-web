import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";

import { hasDarkVariant, ThemedImage } from "@/components/ui/themed-image";
import { MaterialCard } from "@/components/education/material-card";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section, SectionHeader } from "@/components/ui/section";
import {
  basicsTopics,
  directions,
  findMaterial,
  materialsCount,
  materialsIn,
  popularMaterials,
} from "@/content/training";

export const metadata: Metadata = {
  title: "Навчання",
  description:
    "Навчальні матеріали, хірургічні техніки та відеодемонстрації від міжнародних виробників для лікарів травматологів та ортопедів.",
  alternates: { canonical: "/education" },
};

/**
 * The library's home (brief §3): first screen with search, the five
 * directions, the materials worth opening first, the basics, and a way to ask
 * for what is missing. A library, not an advert: every card opens a real file.
 */
export default function EducationPage() {
  const basics = findMaterial("implant-basics")!;

  return (
    <>
      <PageHeader
        id="education-title"
        trail={[{ label: "Головна", href: "/" }, { label: "Навчання" }]}
        title="Професійні знання для сучасної хірургічної практики"
        lede="Навчальні матеріали, хірургічні техніки та відеодемонстрації від міжнародних виробників для лікарів травматологів та ортопедів."
        aside={
          <div className="relative aspect-4/3 overflow-hidden rounded-media shadow-card-hover media-outline">
            <Image
              src="/education/hero.webp"
              alt="Розріз стегнової кістки з інтрамедулярним стержнем та шийковим гвинтом"
              fill
              priority
              quality={82}
              sizes="(min-width: 1024px) 38rem, 92vw"
              className="object-cover"
            />
          </div>
        }
      >
        {/* A plain GET form: the search works before, and without, JavaScript. */}
        <form action="/education/materials" role="search" className="max-w-2xl">
          <label className="relative block">
            <span className="sr-only">Пошук навчальних матеріалів</span>
            <Search
              aria-hidden="true"
              size={18}
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-muted"
            />
            <input
              type="search"
              name="q"
              placeholder="Знайти процедуру, імплант або навчальний матеріал"
              className="min-h-13 w-full rounded-pill bg-surface ps-11 pe-28 text-body text-fg ring-1 ring-inset ring-hairline placeholder:text-fg-muted focus:ring-hairline-strong focus:outline-none"
            />
            <button
              type="submit"
              className="absolute top-1.5 right-1.5 bottom-1.5 rounded-pill bg-base px-4 text-body-sm font-semibold text-fg ring-1 ring-inset ring-hairline transition-[box-shadow] duration-fast ease-out-quint hover:shadow-card"
            >
              Знайти
            </button>
          </label>
        </form>
      </PageHeader>

      <Section id="directions" labelledBy="directions-title" className="pt-0 lg:pt-4">
        <SectionHeader titleId="directions-title" title="Навчання за медичними напрямами" />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directions.map((d, i) => {
            const count = materialsIn(d.slug).length;
            return (
              <Reveal as="li" key={d.slug} delay={(i % 3) * 60} className="h-full">
                <Link
                  href={`/education/${d.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline transition-[box-shadow,scale] duration-medium ease-out-quint active:scale-[0.99] hover:shadow-card-hover hover:ring-hairline-strong"
                >
                  <div className={`relative aspect-16/9 overflow-hidden rounded-inner bg-[#f2f4f5] ${hasDarkVariant(d.image) ? "dark:bg-[#0e0e10]" : ""}`}>
                    <ThemedImage
                      src={d.image}
                      alt={d.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 26rem, (min-width: 640px) 44vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 px-4 pt-5 pb-4">
                    <h3 className="text-h3 text-balance text-fg">{d.title}</h3>
                    <p className="text-body-sm text-pretty text-fg-secondary">{d.summary}</p>
                    <p className="mt-auto pt-3 text-caption text-fg-muted tabular-nums">
                      {count > 0 ? materialsCount(count) : "Матеріали готуються"}
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      <Section id="popular" labelledBy="popular-title" tone="surface">
        <SectionHeader
          titleId="popular-title"
          title="Популярні навчальні матеріали"
          action={
            <ButtonLink href="/education/materials" variant="secondary">
              Усі навчальні матеріали
            </ButtonLink>
          }
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularMaterials.map((m, i) => (
            <Reveal as="li" key={m.slug} delay={(i % 3) * 60} className="h-full">
              <MaterialCard material={m} />
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section id="basics" labelledBy="basics-title">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal className="flex flex-col gap-5">
            <h2 id="basics-title" className="text-h2 text-balance text-fg">
              Базові знання
            </h2>
            <p className="max-w-[52ch] text-lede text-pretty text-fg-secondary">
              Загальні матеріали про будову імплантів — для молодих лікарів і як
              довідка для досвідчених. Параметри конкретних систем лишаються в
              хірургічних техніках виробників.
            </p>
            <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
              {basicsTopics.map((t) => (
                <li key={t.label}>
                  <Link
                    href={t.href}
                    className="flex min-h-12 items-center justify-between gap-4 py-3 text-body text-fg-secondary transition-[color] duration-fast ease-out-quint hover:text-fg"
                  >
                    {t.label}
                    <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0 text-fg-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={100}>
            <MaterialCard material={basics} />
          </Reveal>
        </div>
      </Section>

      <Section id="ask" labelledBy="ask-title" tone="surface">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4">
            <h2 id="ask-title" className="max-w-[22ch] text-h2 text-balance text-fg">
              Не знайшли потрібний навчальний матеріал?
            </h2>
            <p className="max-w-[58ch] text-lede text-pretty text-fg-secondary">
              Зверніться до команди Palarmus Implants, щоб уточнити наявність
              матеріалів щодо конкретної системи або хірургічної техніки.
            </p>
          </div>
          <ButtonLink href="/contacts" size="lg" className="shrink-0">
            Зв’язатися з нами
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2} />
          </ButtonLink>
        </Reveal>
      </Section>
    </>
  );
}
