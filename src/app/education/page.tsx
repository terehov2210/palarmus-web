import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Compass, Info } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { ArtSlot } from "@/components/ui/art-slot";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeader } from "@/components/ui/section";
import {
  glossary,
  implantTypes,
  materialGroups,
  principles,
  regions,
} from "@/content/education";

export const metadata: Metadata = {
  title: "Навчання",
  description:
    "Навчальний розділ про ортопедичні імпланти: принципи фіксації, типи конструкцій, матеріали та анатомічні зони. Для ординаторів і лікарів, які починають працювати з остеосинтезом.",
  alternates: { canonical: "/education" },
};

/**
 * Layout families are deliberately all different, so the page does not read as
 * one component repeated seven times: numbered list, alternating full-width
 * rows, grouped columns, a two-column table-less region map, a definition
 * grid, then a closing panel.
 */
export default function EducationPage() {
  return (
    <>
      {/* ---- Intro. The one eyebrow in the first three sections. ---------- */}
      <section
        aria-labelledby="education-title"
        className="relative isolate overflow-hidden border-b border-hairline"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 blueprint-grid opacity-40 [mask-image:radial-gradient(120%_90%_at_100%_0%,black,transparent_70%)]"
        />
        <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-24">
          <Reveal className="flex flex-col gap-5">
            <Eyebrow>Навчальний розділ</Eyebrow>
            <h1
              id="education-title"
              className="text-display text-balance text-fg"
            >
              Як влаштовані ортопедичні імпланти
            </h1>
            <p className="max-w-[54ch] text-lede text-pretty text-fg-secondary">
              Розбір конструкцій, матеріалів і принципів фіксації для
              ординаторів та лікарів, які починають працювати з остеосинтезом.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <ButtonLink href="#types" size="lg">
                До типів імплантів
              </ButtonLink>
              <ButtonLink href="#glossary" variant="secondary" size="lg">
                Глосарій
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ArtSlot
              src="/education/hero.webp"
              alt="Розріз стегнової кістки з інтрамедулярним стержнем та шийковим гвинтом"
              spec="Ключовий кадр розділу: стегнова кістка в розрізі зі стержнем і шийковим гвинтом. 1600x1200, глибокий синій фон, кістка кольору слонової кості, імплант титановий."
              aspect="aspect-4/3"
              sizes="(min-width: 1024px) 42rem, 92vw"
              priority
            />
          </Reveal>
        </div>
      </section>

      {/* ---- Principles. Numbered list, no eyebrow. ----------------------- */}
      <Section id="principles" tone="surface" labelledBy="principles-title">
        <SectionHeader
          titleId="principles-title"
          title="Чотири принципи, з яких починається будь-яка фіксація"
          description="Імплант не працює сам по собі. Він лише інструмент, який реалізує рішення, ухвалене до розрізу."
        />

        <ol className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {principles.map((principle, i) => (
            <Reveal
              as="li"
              key={principle.title}
              delay={(i % 2) * 60}
              className="flex gap-5 border-t border-hairline pt-6"
            >
              <span
                aria-hidden="true"
                className="shrink-0 text-h3 font-bold text-fg-accent tabular-nums"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-h3 text-fg">{principle.title}</h3>
                <p className="text-body-sm text-pretty text-fg-secondary">
                  {principle.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* ---- Implant types. Alternating full-width rows. ------------------ */}
      <Section id="types" labelledBy="types-title">
        <SectionHeader
          titleId="types-title"
          title="Шість типів конструкцій"
          description="Для кожного типу: що це, де застосовується і який принцип фіксації він реалізує."
        />

        {/* Two-up rather than six stacked image+text rows: the same block
            repeated six times down a page reads as a template, and the art
            alone would add ~4000px of scroll before any of the copy. */}
        <ul className="mt-14 grid gap-5 lg:grid-cols-2 lg:gap-6">
          {implantTypes.map((type, i) => (
            <Reveal
              as="li"
              key={type.slug}
              id={type.slug}
              delay={(i % 2) * 60}
              className="h-full"
            >
              <article className="flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
                <ArtSlot
                  src={type.image}
                  alt={type.imageAlt}
                  spec={`${type.name}. Квадрат 1400x1400, той самий стиль: кістка кольору слонової кості, титановий імплант, напівпрозорі м'які тканини.`}
                  aspect="aspect-4/3 sm:aspect-square"
                  sizes="(min-width: 1024px) 32rem, 92vw"
                  className="rounded-none media-outline"
                />

                <div className="flex flex-1 flex-col gap-5 border-t border-hairline p-6 lg:p-7">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-h3 text-balance text-fg">
                      {type.name}
                    </h3>
                    <p className="text-caption text-fg-muted">{type.kicker}</p>
                  </div>

                  <dl className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <dt className="text-label uppercase text-fg-muted">
                        Що це
                      </dt>
                      <dd className="text-body-sm text-pretty text-fg-secondary">
                        {type.what}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-label uppercase text-fg-muted">
                        Де застосовується
                      </dt>
                      <dd className="text-body-sm text-pretty text-fg-secondary">
                        {type.where}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-label uppercase text-fg-muted">
                        Принцип фіксації
                      </dt>
                      <dd className="text-body-sm text-pretty text-fg-secondary">
                        {type.principle}
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* ---- Materials. Grouped by the job the material does. ------------- */}
      <Section id="materials" tone="surface" labelledBy="materials-title">
        <SectionHeader
          eyebrow="Матеріали"
          titleId="materials-title"
          title="Матеріал вибирають під роботу, а не під ціну"
          description="Жорсткість, зносостійкість і прозорість для променів вирішують різні задачі, тому в одній конструкції часто поєднано кілька матеріалів."
        />

        <div className="mt-14 grid gap-x-10 gap-y-12 lg:grid-cols-3">
          {materialGroups.map((group, i) => (
            <Reveal
              key={group.heading}
              delay={(i % 3) * 60}
              className="flex flex-col gap-5 border-t border-hairline pt-6"
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-h3 text-fg">{group.heading}</h3>
                <p className="text-body-sm text-pretty text-fg-muted">
                  {group.intro}
                </p>
              </div>
              <dl className="flex flex-col gap-4">
                {group.items.map((item) => (
                  <div key={item.name} className="flex flex-col gap-1">
                    <dt className="text-body-sm font-semibold text-fg">
                      {item.name}
                    </dt>
                    <dd className="text-body-sm text-pretty text-fg-secondary">
                      {item.note}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---- Regions. Anatomy to catalogue, as linked rows. --------------- */}
      <Section id="regions" labelledBy="regions-title">
        <SectionHeader
          titleId="regions-title"
          title="Від анатомічної зони до розділу каталогу"
          action={
            <ButtonLink href="/catalog" variant="secondary">
              Усі категорії
            </ButtonLink>
          }
        />

        <Reveal as="ul" delay={80} className="mt-12 grid gap-4 lg:grid-cols-2">
          {regions.map((region) => (
            <li key={region.area}>
              <Link
                href={region.href}
                className="group flex items-start justify-between gap-6 rounded-card border border-hairline bg-surface p-5 shadow-card transition-[border-color,box-shadow,scale] duration-fast ease-out-quint active:scale-[0.99] hover:border-hairline-strong hover:shadow-card-hover"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-h3 text-fg">{region.area}</span>
                  <span className="text-body-sm text-pretty text-fg-secondary">
                    {region.systems}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2}
                  className="mt-1 shrink-0 text-fg-accent transition-[translate] duration-fast ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </Reveal>
      </Section>

      {/* ---- Glossary. Definition grid. ----------------------------------- */}
      <Section id="glossary" tone="surface" labelledBy="glossary-title">
        <SectionHeader
          eyebrow="Глосарій"
          titleId="glossary-title"
          title="Терміни, які звучать на кожному обході"
        />

        <Reveal
          as="dl"
          delay={80}
          className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {glossary.map((entry) => (
            <div
              key={entry.term}
              className="flex flex-col gap-1.5 border-t border-hairline pt-5"
            >
              <dt className="text-body-sm font-semibold text-fg">
                {entry.term}
              </dt>
              <dd className="text-body-sm text-pretty text-fg-secondary">
                {entry.definition}
              </dd>
            </div>
          ))}
        </Reveal>
      </Section>

      {/* ---- Scope note and close. ---------------------------------------- */}
      <Section id="scope" labelledBy="scope-title">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <Reveal className="flex flex-col gap-5">
            <h2
              id="scope-title"
              className="max-w-[26ch] text-h2 text-balance text-fg"
            >
              Межі цього матеріалу
            </h2>
            <div className="flex flex-col gap-4 border-t border-hairline pt-6">
              <p className="flex gap-3 text-body text-pretty text-fg-secondary">
                <Info
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-fg-accent"
                />
                Розділ оглядовий. Тут немає діаметрів, глибин розсвердлювання,
                моментів затягування чи порогів показань: ці параметри залежать
                від конкретної системи і беруться лише з technique guide
                виробника.
              </p>
              <p className="flex gap-3 text-body text-pretty text-fg-secondary">
                <BookOpen
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-fg-accent"
                />
                Матеріал не замінює керівництва з хірургічної техніки і не є
                клінічною рекомендацією. Рішення щодо пацієнта ухвалює лікар.
              </p>
              <p className="flex gap-3 text-body text-pretty text-fg-secondary">
                <Compass
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-fg-accent"
                />
                Для конкретної системи ми надаємо technique guide виробника і
                проводимо воркшоп із інженером.
              </p>
            </div>
          </Reveal>

          <Reveal
            delay={120}
            className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-6 shadow-card lg:p-8"
          >
            <h3 className="text-h3 text-balance text-fg">
              Потрібен воркшоп для відділення
            </h3>
            <p className="text-body-sm text-pretty text-fg-secondary">
              Розбираємо систему на моделях кістки разом з інженером виробника.
              Напишіть, який напрям цікавить, і ми узгодимо дату.
            </p>
            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              <ButtonLink href="/#consultation">Замовити воркшоп</ButtonLink>
              <ButtonLink href="/catalog" variant="secondary">
                Каталог
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
