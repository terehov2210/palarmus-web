import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductMedia } from "@/components/catalog/product-media";
import { Reveal } from "@/components/reveal";
import { buttonClasses, ButtonLink } from "@/components/ui/button";
import { Eyebrow, Section } from "@/components/ui/section";
import { findCategory } from "@/content/catalog";
import { findProduct, products, productsByCategory } from "@/content/products";
import { site } from "@/content/site";

export function generateStaticParams() {
  return products.map((p) => ({ category: p.category, product: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/catalog/[category]/[product]">): Promise<Metadata> {
  const { category, product } = await params;
  const found = findProduct(category, product);
  if (!found) return { title: "Товар не знайдено" };
  return {
    title: found.name,
    description: found.summary,
    alternates: { canonical: `/catalog/${found.category}/${found.slug}` },
  };
}

/**
 * `summary` is the first sentence of `body[0]`, which is right for a card but
 * reads as a stutter here: the lede and the paragraph under it would open with
 * the same words. Drop that sentence from the paragraph, and drop the whole
 * paragraph if nothing substantial is left.
 */
function bodyWithoutLede(body: string[], summary: string) {
  if (body.length === 0) return body;
  const [first, ...rest] = body;
  if (!first.startsWith(summary)) return body;
  const trimmed = first.slice(summary.length).trim();
  return trimmed.length > 40 ? [trimmed, ...rest] : rest;
}

export default async function ProductPage({
  params,
}: PageProps<"/catalog/[category]/[product]">) {
  const { category, product } = await params;
  const found = findProduct(category, product);
  if (!found) notFound();

  const cat = findCategory(found.category);
  const body = bodyWithoutLede(found.body, found.summary);
  const related = productsByCategory(found.category)
    .filter((p) => p.slug !== found.slug)
    .slice(0, 4);

  return (
    <>
      <Section labelledBy="product-title" className="pt-10 lg:pt-14">
        <Breadcrumbs
          trail={[
            { label: "Головна", href: "/" },
            { label: "Каталог", href: "/catalog" },
            ...(cat ? [{ label: cat.title, href: `/catalog/${cat.slug}` }] : []),
            { label: found.name },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Media. Squared off rather than 4:3 so a long nail and a small
              anchor both get a sensible amount of room; sticky beside the
              copy on wide screens so it stays in view while the text runs. */}
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline">
              <ProductMedia
                product={found}
                priority
                padding="p-10 lg:p-14"
                sizes="(min-width: 1024px) 34rem, 92vw"
                className="aspect-square rounded-inner"
              />
            </div>
          </Reveal>

          <div className="flex flex-col gap-6">
            <Reveal className="flex flex-col gap-5">
              {cat ? <Eyebrow>{cat.title}</Eyebrow> : null}
              <h1 id="product-title" className="text-h2 text-balance text-fg">
                {found.name}
              </h1>
              <p className="max-w-[58ch] text-lede text-pretty text-fg-secondary">
                {found.summary}
              </p>
            </Reveal>

            {body.length > 0 ? (
              <Reveal
                delay={80}
                className="flex flex-col gap-3 rounded-card bg-surface p-6 ring-1 ring-inset ring-hairline"
              >
                {body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="max-w-[64ch] text-body text-pretty text-fg-secondary"
                  >
                    {paragraph}
                  </p>
                ))}
              </Reveal>
            ) : null}

            <Reveal delay={140} className="flex flex-col gap-4 pt-1">
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/#consultation" size="lg">
                  Запитати ціну та наявність
                </ButtonLink>
                <a href={site.phone.href} className={buttonClasses("secondary", "lg")}>
                  <Phone aria-hidden="true" size={16} strokeWidth={2} />
                  {site.phone.label}
                </a>
              </div>
              <p className="flex items-start gap-2.5 text-caption text-pretty text-fg-muted">
                <Info
                  aria-hidden="true"
                  size={15}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0"
                />
                Ціни залежать від комплектації та обсягу. Для клінік працюємо за
                безготівковим розрахунком і тендерними процедурами.
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      {found.spec && found.spec.rows.length > 0 ? (
        <Section labelledBy="product-spec" className="pt-0 lg:pt-0">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="product-spec" className="text-h2 text-fg">
              Типорозміри
            </h2>
            <p className="text-body-sm text-fg-muted tabular-nums">
              {found.spec.rows.length} позицій
            </p>
          </div>

          {/* The table is the useful part of a catalogue entry, so it is not
              summarised away — it scrolls inside its own container instead, and
              the caption carries the count for anyone who cannot see it. */}
          <Reveal
            delay={80}
            className="mt-8 overflow-x-auto rounded-card bg-base shadow-card ring-1 ring-inset ring-hairline"
          >
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">
                Типорозміри та коди продукту: {found.name}
              </caption>
              <thead>
                <tr>
                  {(found.spec.head ?? ["Код продукту", "Розмір"]).map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="border-b border-hairline px-5 py-3.5 text-start text-label uppercase text-fg-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {found.spec.rows.map((row) => (
                  <tr key={row.join("|")} className="even:bg-surface/60">
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={`px-5 py-3 align-top ${
                          i === 0
                            ? "font-medium text-fg tabular-nums whitespace-nowrap"
                            : "text-fg-secondary tabular-nums"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section labelledBy="product-related">
          <h2 id="product-related" className="text-h2 text-balance text-fg">
            Інші позиції напряму
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item, i) => (
              <Reveal
                as="li"
                key={item.slug}
                delay={(i % 4) * 60}
                className="h-full"
              >
                <ProductCard product={item} />
              </Reveal>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
