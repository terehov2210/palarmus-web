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

      <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {featuredProducts.map((product, i) => (
          <Reveal
            as="li"
            key={product.slug}
            delay={(i % 4) * 60}
            className="group h-full"
          >
            <Link
              href={productHref(product)}
              className="flex h-full flex-col overflow-hidden rounded-card bg-base p-2 shadow-card ring-1 ring-inset ring-hairline transition-[box-shadow,translate,scale] duration-medium ease-out-quint active:scale-[0.99] hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="relative aspect-4/3 overflow-hidden rounded-inner bg-surface dark:bg-[radial-gradient(70%_70%_at_50%_45%,rgb(255_255_255/0.14),rgb(255_255_255/0.04))]">
                <Image
                  src={product.image as string}
                  alt={product.imageAlt}
                  fill
                  sizes="(min-width: 1280px) 20rem, (min-width: 640px) 44vw, 88vw"
                  className="object-contain p-7 mix-blend-multiply dark:mix-blend-normal transition-[scale] duration-700 ease-out-quint group-hover:scale-[1.06]"
                />
              </div>

              <div className="flex flex-1 flex-col gap-2 px-4 pt-5 pb-4">
                <p className="text-caption font-medium text-fg-muted">
                  {findCategory(product.category)?.title ?? product.category}
                </p>
                <h3 className="text-h3 text-fg">{product.name}</h3>
                <p className="line-clamp-3 text-body-sm text-pretty text-fg-secondary">
                  {product.summary}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 pt-4 text-body-sm font-semibold text-fg transition-[color] duration-fast ease-out-quint group-hover:text-fg-accent">
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
