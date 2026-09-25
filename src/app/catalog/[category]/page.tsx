import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { positions } from "@/components/catalog/category-card";
import { ProductCard } from "@/components/catalog/product-card";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { categories, findCategory } from "@/content/catalog";
import { productsByCategory } from "@/content/products";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/catalog/[category]">): Promise<Metadata> {
  const { category } = await params;
  const found = findCategory(category);
  if (!found) return { title: "Категорію не знайдено" };
  return {
    title: found.title,
    description: found.blurb,
    alternates: { canonical: `/catalog/${found.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: PageProps<"/catalog/[category]">) {
  const { category } = await params;
  const found = findCategory(category);
  if (!found) notFound();

  const items = productsByCategory(found.slug);

  return (
    <>
      <PageHeader
        id="category-title"
        trail={[
          { label: "Головна", href: "/" },
          { label: "Каталог", href: "/catalog" },
          { label: found.title },
        ]}
        eyebrow={`Напрям ${found.index}`}
        title={found.title}
        lede={found.blurb}
        aside={
          // The catalogue card's art, on a tile of its own: it is painted on a
          // light studio ground, which a fade into a dark page would muddy.
          <div className="rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline">
            <div className="relative aspect-16/10 overflow-hidden rounded-inner bg-[#f2f4f5]">
              <Image
                src={found.image}
                alt={found.imageAlt}
                fill
                quality={82}
                priority
                sizes="(min-width: 1024px) 38rem, 92vw"
                className="object-cover object-right"
              />
            </div>
          </div>
        }
      />

      <Section labelledBy="category-products" className="pt-0 lg:pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="category-products" className="text-h2 text-fg">
            {items.length > 0 ? "Позиції напряму" : "Позиції за запитом"}
          </h2>
          {items.length > 0 ? (
            <p className="rounded-pill bg-fg/[0.05] px-3 py-1 text-body-sm text-fg-muted tabular-nums ring-1 ring-inset ring-hairline">
              {items.length} {positions(items.length)}
            </p>
          ) : null}
        </div>

        {items.length > 0 ? (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((product, i) => (
              <Reveal
                as="li"
                key={product.slug}
                delay={(i % 4) * 60}
                className="h-full"
              >
                <ProductCard product={product} />
              </Reveal>
            ))}
          </ul>
        ) : (
          /* An empty category says so plainly and offers the one action that
             helps, rather than rendering a grid with nothing in it. */
          <Reveal
            delay={80}
            className="mt-10 flex max-w-[62ch] flex-col gap-4 rounded-card bg-surface p-6 shadow-card ring-1 ring-inset ring-hairline lg:p-8"
          >
            <p className="text-body text-pretty text-fg-secondary">
              Готових позицій цього напряму зараз немає в каталозі. Ми
              комплектуємо його під конкретний випадок разом із виробником:
              опишіть задачу, і ми узгодимо набір, типорозміри та строк
              доставки.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <ButtonLink href="/#consultation">Надіслати запит</ButtonLink>
              <ButtonLink href="/catalog" variant="secondary">
                Інші напрями
              </ButtonLink>
            </div>
          </Reveal>
        )}
      </Section>
    </>
  );
}
