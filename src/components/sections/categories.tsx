import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { categories } from "@/content/catalog";

export function Categories() {
  return (
    <Section id="catalog" labelledBy="categories-title">
      <SectionHeader
        eyebrow="Каталог"
        titleId="categories-title"
        title="Шість напрямів, від остеосинтезу до артроскопії"
        description="Кожен напрям укомплектований імплантами, інструментом і супровідними документами — замовляти в різних постачальників не потрібно."
        action={
          <ButtonLink href="/catalog" variant="secondary">
            Усі категорії
          </ButtonLink>
        }
      />

      {/* Cards are as wide as the artwork: the source banners are 2.55:1 with
          the anatomy on the trailing edge, so a tall crop would throw the
          subject away and push the caption on top of it. */}
      <ul className="mt-14 grid gap-5 lg:grid-cols-2">
        {categories.map((category, i) => (
          <Reveal
            as="li"
            key={category.href}
            delay={(i % 2) * 90}
            className="group"
          >
            <Link
              href={category.href}
              className="relative flex aspect-16/10 flex-col justify-end overflow-hidden rounded-card border border-hairline transition-[border-color] duration-fast ease-out-quint hover:border-hairline-strong sm:aspect-16/7"
            >
              <Image
                src={category.image}
                alt={category.imageAlt}
                fill
                sizes="(min-width: 1024px) 40rem, 92vw"
                className="object-cover object-right transition-[scale] duration-300 ease-out-quint group-hover:scale-105"
              />

              <div aria-hidden="true" className="absolute inset-0 scrim-bottom" />

              <span
                aria-hidden="true"
                className="absolute start-6 top-6 text-label uppercase text-fg-muted"
              >
                {category.index}
              </span>

              <div className="relative flex max-w-[26rem] flex-col gap-1.5 p-6">
                <h3 className="flex items-center gap-2 text-h3 text-fg">
                  {category.title}
                  <ArrowUpRight
                    aria-hidden="true"
                    size={18}
                    strokeWidth={2}
                    className="shrink-0 text-fg-accent transition-[translate] duration-fast ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </h3>
                <p className="text-body-sm text-pretty text-fg-secondary">
                  {category.summary}
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
