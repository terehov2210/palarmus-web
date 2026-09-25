import type { Metadata } from "next";

import { CategoryCard } from "@/components/catalog/category-card";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { categories } from "@/content/catalog";
import { products, productsByCategory } from "@/content/products";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Шість напрямів: імпланти для травматології, ендопротези суглобів, спінальна хірургія, спортивна медицина, обладнання та гіалуронова кислота.",
  alternates: { canonical: "/catalog" },
};

export default function CatalogPage() {
  return (
    <>
      <PageHeader
        id="catalog-title"
        trail={[{ label: "Головна", href: "/" }, { label: "Каталог" }]}
        eyebrow="Каталог"
        title={
          <>
            Шість <strong>напрямів</strong>
          </>
        }
        lede="Кожен напрям укомплектований імплантами, інструментом і супровідними документами. Позиції, яких немає в наявності, підбираємо разом із виробником."
      />

      <Section labelledBy="catalog-directions" className="pt-0 lg:pt-0">
        <h2 id="catalog-directions" className="sr-only">
          Напрями каталогу
        </h2>

        {/* The count of what is listed under each direction, so the page
            never promises more than it holds. */}
        <ul className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          {categories.map((category, i) => (
            <Reveal as="li" key={category.slug} delay={(i % 2) * 60} className="h-full">
              <CategoryCard
                category={category}
                summary={category.blurb}
                count={productsByCategory(category.slug).length}
              />
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section labelledBy="catalog-help" className="pt-0 lg:pt-0">
        <Reveal className="relative isolate overflow-hidden rounded-card bg-surface p-8 ring-1 ring-inset ring-hairline lg:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -end-24 -bottom-32 -z-10 h-80 w-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(199_0_11/0.12),transparent)] blur-2xl"
          />
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
            <div className="flex flex-col gap-4">
              <h2 id="catalog-help" className="max-w-[22ch] text-h2 text-balance text-fg">
                Не знайшли потрібну позицію?
              </h2>
              <p className="max-w-[58ch] text-lede text-pretty text-fg-secondary">
                У каталозі {products.length} позицій із детальними типорозмірами.
                Решту номенклатури підбираємо під конкретний випадок — опишіть
                задачу, і ми узгодимо комплектацію та строк доставки.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <ButtonLink href="/#consultation" size="lg">
                Отримати консультацію
              </ButtonLink>
              <ButtonLink href="/education" variant="secondary" size="lg">
                Навчальний розділ
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
