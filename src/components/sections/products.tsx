import { ProductCard } from "@/components/catalog/product-card";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { featuredProducts } from "@/content/products";

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
          <Reveal as="li" key={product.slug} delay={(i % 4) * 60} className="h-full">
            <ProductCard product={product} showCategory />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
