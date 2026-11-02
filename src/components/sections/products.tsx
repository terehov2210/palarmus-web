import { ProductCard } from "@/components/catalog/product-card";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { featuredProducts } from "@/content/products";

export function Products() {
  return (
    <Section id="products" labelledBy="products-title">
      <SectionHeader
        titleId="products-title"
        title="Системи, які замовляють найчастіше"
        action={
          <ButtonLink href="/catalog" variant="secondary">
            Більше товарів
          </ButtonLink>
        }
      />

      {/* On a phone the eight cards are one swipeable row rather than a
          4,500px column; from `sm` up they are the grid. */}
      <ul className="-mx-5 mt-12 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-16 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-4">
        {featuredProducts.map((product, i) => (
          <Reveal
            as="li"
            key={product.slug}
            delay={(i % 4) * 60}
            className="h-full w-[78%] shrink-0 snap-start sm:w-auto"
          >
            <ProductCard product={product} showCategory />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
