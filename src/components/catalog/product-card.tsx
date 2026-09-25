import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductMedia } from "@/components/catalog/product-media";
import { findCategory } from "@/content/catalog";
import { productHref, type Product } from "@/content/products";

/**
 * One product in a listing: the studio tile (see `ProductMedia`), the name,
 * a clamped summary and the way in. The homepage strip also shows which
 * direction each product belongs to, since it mixes them; a category page
 * does not repeat what its own title already says.
 */
export function ProductCard({ product, showCategory = false }: { product: Product; showCategory?: boolean }) {
  return (
    <Link
      href={productHref(product)}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-base p-2 shadow-card ring-1 ring-inset ring-hairline transition-[box-shadow,translate,scale] duration-medium ease-out-quint active:scale-[0.99] hover:-translate-y-1 hover:shadow-card-hover"
    >
      <ProductMedia
        product={product}
        sizes="(min-width: 1280px) 20rem, (min-width: 640px) 44vw, 88vw"
        zoomOnHover
        className="aspect-4/3 rounded-inner"
      />

      <div className="flex flex-1 flex-col gap-2 px-4 pt-5 pb-4">
        {showCategory ? (
          <p className="text-caption font-medium text-fg-muted">
            {findCategory(product.category)?.title ?? product.category}
          </p>
        ) : null}
        <h3 className="text-h3 text-balance text-fg">{product.name}</h3>
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
  );
}
