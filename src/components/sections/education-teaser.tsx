import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { directions, materials, materialsCount } from "@/content/training";

/**
 * Entry point to `/education` from the homepage.
 *
 * Layout family used nowhere else on this page: one large visual against a
 * text column, where every other section is a card grid or a form split. It
 * also brings the grey-ground render back once, late, so the page opens and
 * closes its two strongest images on the same note.
 *
 * The pills are the library's five directions, each a real way in; the copy
 * says what the section is per the client's brief: a library of techniques,
 * videos and manufacturer documents, not a course for trainees.
 */
export function EducationTeaser() {
  return (
    <Section id="education" labelledBy="education-teaser-title">
      <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal className="relative aspect-4/3 overflow-hidden rounded-media shadow-card-hover media-outline lg:aspect-square">
          <Image
            src="/education/hero.webp"
            alt="Розріз стегнової кістки з інтрамедулярним стержнем, шари м'яких тканин і кортексу"
            fill
            quality={82}
            sizes="(min-width: 1024px) 30rem, 92vw"
            className="object-cover"
          />
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal className="flex flex-col gap-4">
            <h2
              id="education-teaser-title"
              className="max-w-[24ch] text-h2 text-balance text-fg"
            >
              Хірургічні техніки, відео та документи виробників
            </h2>
            <p className="max-w-[56ch] text-lede text-pretty text-fg-secondary">
              {`Бібліотека для травматологів і ортопедів, ${materialsCount(materials.length)}: хірургічні техніки, описи систем, відеоогляди обладнання та базові знання про будову імплантів.`}
            </p>
          </Reveal>

          <Reveal delay={90} as="ul" className="flex flex-wrap gap-2">
            {directions.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/education/${d.slug}`}
                  className="inline-flex min-h-9 items-center rounded-pill bg-surface px-4 text-body-sm text-fg-secondary ring-1 ring-inset ring-hairline transition-[box-shadow,color,background-color,scale] duration-fast ease-out-quint active:scale-[0.97] hover:bg-base hover:text-fg hover:shadow-card"
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </Reveal>

          <Reveal delay={160} className="flex flex-wrap gap-3 pt-1">
            <ButtonLink href="/education">Перейти до розділу</ButtonLink>
            <ButtonLink href="/education/basics" variant="secondary">
              Базові знання
              <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
