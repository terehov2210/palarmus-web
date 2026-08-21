import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ImageOff, Info, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { ProductCard } from "@/components/catalog/product-card";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
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
      <Section labelledBy="product-title">
        <Breadcrumbs
          trail={[
            { label: "Головна", href: "/" },
            { label: "Каталог", href: "/catalog" },
            ...(cat ? [{ label: cat.title, href: `/catalog/${cat.slug}` }] : []),
            { label: found.name },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Media. Squared off rather than 4:3 so a long nail and a small
              anchor both get a sensible amount of room. */}
          <Reveal className="relative aspect-square overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
            {found.image ? (
              <Image
                src={found.image}
                alt={found.imageAlt}
                fill
                priority
                sizes="(min-width: 1024px) 32rem, 92vw"
                className="object-contain p-10"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-accent-tint p-8 text-center">
                <ImageOff
                  aria-hidden="true"
                  size={22}
                  strokeWidth={1.5}
                  className="text-fg-accent"
                />
                <p className="text-body-sm font-semibold text-fg">
                  Фото готується
                </p>
                <p className="max-w-[34ch] text-caption text-pretty text-fg-secondary">
                  Надішлемо знімки та повну специфікацію на запит.
                </p>
              </div>
            )}
          </Reveal>

          <div className="flex flex-col gap-6">
            <Reveal className="flex flex-col gap-3">
              {cat ? (
                <p className="text-label uppercase text-fg-muted">{cat.title}</p>
              ) : null}
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
                className="flex flex-col gap-3 border-t border-hairline pt-6"
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
                <a
                  href={site.phone.href}
                  className="inline-flex min-h-13 items-center gap-2 rounded-control border border-hairline-strong px-7 text-body font-semibold text-fg transition-[border-color,background-color,scale] duration-fast ease-out-quint active:scale-[0.96] hover:border-control-line hover:bg-raised"
                >
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
        <Section tone="surface" labelledBy="product-spec">
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
            className="mt-8 overflow-x-auto rounded-card border border-hairline bg-base shadow-card"
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
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
