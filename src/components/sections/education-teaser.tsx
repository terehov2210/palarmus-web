import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, Section } from "@/components/ui/section";
import { implantTypes } from "@/content/education";

/**
 * Entry point to `/education` from the homepage.
 *
 * Layout family used nowhere else on this page: one large visual against a
 * text column, where every other section is a card grid or a form split. It
 * also brings the deep blue of the hero back once, late, so the page opens and
 * closes its two strongest images on the same note.
 *
 * The six pills are real navigation into each anchor on the training page, not
 * decoration — a surgeon looking for one construction type lands on it in one
 * click instead of scrolling the whole page.
 */
export function EducationTeaser() {
  return (
    <Section id="education" labelledBy="education-teaser-title">
      <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal className="relative aspect-4/3 overflow-hidden rounded-media media-outline lg:aspect-square">
          <Image
            src="/education/hero.webp"
            alt="Розріз стегнової кістки з інтрамедулярним стержнем, шари м'яких тканин і кортексу"
            fill
            sizes="(min-width: 1024px) 30rem, 92vw"
            className="object-cover"
          />
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal className="flex flex-col gap-4">
            <Eyebrow>Навчання</Eyebrow>
            <h2
              id="education-teaser-title"
              className="max-w-[24ch] text-h2 text-balance text-fg"
            >
              Розбираємо конструкції для тих, хто вчиться оперувати
            </h2>
            <p className="max-w-[56ch] text-lede text-pretty text-fg-secondary">
              Принципи фіксації, шість типів конструкцій, матеріали та глосарій.
              Оглядовий матеріал для ординаторів — без параметрів конкретних
              систем, вони лишаються в technique guide виробника.
            </p>
          </Reveal>

          <Reveal delay={90} as="ul" className="flex flex-wrap gap-2">
            {implantTypes.map((type) => (
              <li key={type.slug}>
                <Link
                  href={`/education#${type.slug}`}
                  className="inline-flex min-h-9 items-center rounded-control border border-hairline bg-surface px-3.5 text-body-sm text-fg-secondary transition-[border-color,color,background-color,scale] duration-fast ease-out-quint active:scale-[0.97] hover:border-control-line hover:bg-raised hover:text-fg"
                >
                  {type.name}
                </Link>
              </li>
            ))}
          </Reveal>

          <Reveal delay={160} className="flex flex-wrap gap-3 pt-1">
            <ButtonLink href="/education">Перейти до розділу</ButtonLink>
            <ButtonLink href="/education#glossary" variant="secondary">
              Глосарій
              <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
