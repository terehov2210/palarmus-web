import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { ProductCard } from "@/components/catalog/product-card";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, Section } from "@/components/ui/section";
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
      <section
        aria-labelledby="category-title"
        className="relative isolate overflow-hidden border-b border-hairline"
      >
        {/* Same art as the catalogue card, bled to the edge and faded into the
            page so the copy never sits on the anatomy. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block"
        >
          <Image
            src={found.image}
            alt=""
            fill
            priority
            sizes="46vw"
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-base),transparent_70%)]" />
        </div>

        <div className="container-page relative flex flex-col gap-5 py-12 lg:py-16">
          <Breadcrumbs
            trail={[
              { label: "Головна", href: "/" },
              { label: "Каталог", href: "/catalog" },
              { label: found.title },
            ]}
          />
          <Reveal className="flex max-w-[34rem] flex-col gap-4">
            <Eyebrow>Напрям {found.index}</Eyebrow>
            <h1
              id="category-title"
              className="text-display text-balance text-fg"
            >
              {found.title}
            </h1>
            <p className="text-lede text-pretty text-fg-secondary">
              {found.blurb}
            </p>
          </Reveal>
        </div>
      </section>

      <Section labelledBy="category-products">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="category-products" className="text-h2 text-fg">
            {items.length > 0 ? "Позиції напряму" : "Позиції за запитом"}
          </h2>
          {items.length > 0 ? (
            <p className="text-body-sm text-fg-muted tabular-nums">
              {items.length} позицій
            </p>
          ) : null}
        </div>

        {items.length > 0 ? (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            className="mt-10 flex max-w-[62ch] flex-col gap-4 rounded-card border border-hairline bg-surface p-6 shadow-card lg:p-8"
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
