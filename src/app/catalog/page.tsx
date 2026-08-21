import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, Section } from "@/components/ui/section";
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
      <section aria-labelledby="catalog-title" className="border-b border-hairline">
        <div className="container-page flex flex-col gap-5 py-12 lg:py-16">
          <Breadcrumbs trail={[{ label: "Головна", href: "/" }, { label: "Каталог" }]} />
          <Reveal className="flex flex-col gap-4">
            <Eyebrow>Каталог</Eyebrow>
            <h1 id="catalog-title" className="max-w-[28ch] text-display text-balance text-fg">
              Шість напрямів
            </h1>
            <p className="max-w-[62ch] text-lede text-pretty text-fg-secondary">
              Кожен напрям укомплектований імплантами, інструментом і
              супровідними документами. Позиції, яких немає в наявності,
              підбираємо разом із виробником.
            </p>
          </Reveal>
        </div>
      </section>

      <Section labelledBy="catalog-directions">
        <h2 id="catalog-directions" className="sr-only">
          Напрями каталогу
        </h2>

        {/* Wide media card per direction, with the count of what is listed
            under it so the page never promises more than it holds. */}
        <ul className="grid gap-5 lg:grid-cols-2">
          {categories.map((category, i) => {
            const count = productsByCategory(category.slug).length;
            return (
              <Reveal as="li" key={category.slug} delay={(i % 2) * 60} className="group">
                <Link
                  href={`/catalog/${category.slug}`}
                  className="flex h-full flex-col overflow-hidden rounded-card border border-hairline shadow-card transition-[border-color,box-shadow,scale] duration-fast ease-out-quint active:scale-[0.99] hover:border-hairline-strong hover:shadow-card-hover"
                >
                  <div className="relative aspect-16/7 overflow-hidden">
                    <Image
                      src={category.image}
                      alt={category.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 40rem, 92vw"
                      className="object-cover object-right transition-[scale] duration-200 ease-out-quint group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 border-t border-hairline bg-surface p-6">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="flex items-center gap-2 text-h3 text-fg">
                        {category.title}
                        <ArrowUpRight
                          aria-hidden="true"
                          size={18}
                          strokeWidth={2}
                          className="shrink-0 text-fg-accent transition-[translate] duration-fast ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </h3>
                      <span className="shrink-0 text-caption text-fg-muted tabular-nums">
                        {count > 0 ? `${count} позицій` : "за запитом"}
                      </span>
                    </div>
                    <p className="text-body-sm text-pretty text-fg-secondary">
                      {category.blurb}
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      <Section tone="surface" labelledBy="catalog-help">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <Reveal className="flex flex-col gap-4">
            <h2 id="catalog-help" className="max-w-[26ch] text-h2 text-balance text-fg">
              Не знайшли потрібну позицію
            </h2>
            <p className="max-w-[58ch] text-lede text-pretty text-fg-secondary">
              У каталозі {products.length} позицій із детальними типорозмірами.
              Решту номенклатури підбираємо під конкретний випадок — опишіть
              задачу, і ми узгодимо комплектацію та строк доставки.
            </p>
          </Reveal>
          <Reveal delay={110} className="flex flex-wrap gap-3">
            <ButtonLink href="/#consultation" size="lg">
              Отримати консультацію
            </ButtonLink>
            <ButtonLink href="/education" variant="secondary" size="lg">
              Навчальний розділ
            </ButtonLink>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
