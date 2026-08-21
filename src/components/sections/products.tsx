import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { findCategory } from "@/content/catalog";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { featuredProducts, productHref } from "@/content/products";

export function Products() {
  return (
    <Section id="products" labelledBy="products-title">
      <SectionHeader
        eyebrow="Популярні позиції"
        titleId="products-title"
        title="Системи, які замовляють найчастіше"
        action={
          <ButtonLink href="/catalog" variant="secondary">
            Більше товарів
          </ButtonLink>
        }
      />

      <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {featuredProducts.map((product, i) => (
          <Reveal
            as="li"
            key={product.slug}
            delay={(i % 4) * 60}
            className="group h-full"
          >
            <Link
              href={productHref(product)}
              className="flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card transition-[border-color,box-shadow,scale] duration-fast ease-out-quint active:scale-[0.99] hover:border-hairline-strong hover:shadow-card-hover"
            >
              <div className="relative aspect-4/3 overflow-hidden bg-base">
                <Image
                  src={product.image as string}
                  alt={product.imageAlt}
                  fill
                  sizes="(min-width: 1280px) 20rem, (min-width: 640px) 44vw, 88vw"
                  className="object-contain p-6 transition-[scale] duration-200 ease-out-quint group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col gap-2 border-t border-hairline p-5">
                <p className="text-label uppercase text-fg-muted">
                  {findCategory(product.category)?.title ?? product.category}
                </p>
                <h3 className="text-h3 text-fg">{product.name}</h3>
                <p className="text-body-sm text-pretty text-fg-secondary">
                  {product.summary}
                </p>
                <span className="mt-3 inline-flex items-center gap-2 text-body-sm font-semibold text-fg-accent">
                  Детальніше
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                    className="transition-[translate] duration-fast ease-out-quint group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
