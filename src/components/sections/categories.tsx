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
      <ul className="mt-16 grid gap-4 lg:grid-cols-2 lg:gap-5">
        {categories.map((category, i) => (
          <Reveal
            as="li"
            key={category.slug}
            delay={(i % 2) * 60}
            className="group h-full"
          >
            {/* The art is painted on a light studio ground, so it sits on its
                own inset tile and the caption goes under it on the card's
                surface: that reads the same on the light and the dark theme,
                where a scrim over the art would fade light grey into black. */}
            <Link
              href={`/catalog/${category.slug}`}
              className="flex h-full flex-col rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline transition-[box-shadow,translate,scale] duration-medium ease-out-quint active:scale-[0.99] hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="relative aspect-16/8 overflow-hidden rounded-inner bg-[#f2f4f5]">
                <Image
                  src={category.image}
                  alt={category.imageAlt}
                  fill
                  quality={82}
                  sizes="(min-width: 1024px) 40rem, 92vw"
                  className="object-cover object-right transition-[scale] duration-700 ease-out-quint group-hover:scale-[1.04]"
                />

                {/* Fixed light chips: they always sit on the light art, not on
                    the page ground, so they do not follow the theme. */}
                <span
                  aria-hidden="true"
                  className="absolute start-3 top-3 rounded-pill bg-white/85 px-2.5 py-1 text-label text-[#3a3a3a] ring-1 ring-inset ring-black/10 backdrop-blur-md"
                >
                  {category.index}
                </span>

                <span
                  aria-hidden="true"
                  className="absolute end-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-black shadow-[0_2px_8px_-2px_rgb(0_0_0/0.25)] ring-1 ring-inset ring-black/10 backdrop-blur-md transition-[background-color,color,rotate] duration-medium ease-out-quint group-hover:rotate-45 group-hover:bg-accent-solid group-hover:text-on-accent group-hover:ring-transparent"
                >
                  <ArrowUpRight size={18} strokeWidth={2} />
                </span>
              </div>

              <div className="flex flex-col gap-1.5 px-4 pt-5 pb-4 lg:px-5">
                <h3 className="text-h3 text-fg">{category.title}</h3>
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
