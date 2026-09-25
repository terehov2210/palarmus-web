import { CategoryCard } from "@/components/catalog/category-card";
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
          subject away. */}
      <ul className="mt-16 grid gap-4 lg:grid-cols-2 lg:gap-5">
        {categories.map((category, i) => (
          <Reveal as="li" key={category.slug} delay={(i % 2) * 60} className="h-full">
            <CategoryCard category={category} summary={category.summary} />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
