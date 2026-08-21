import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";

import { productHref, type Product } from "@/content/products";

/**
 * One product in a listing.
 *
 * Only 8 of the 23 products have a photograph that can sit on a light page.
 * Rather than stretch those across the rest or ship a damaged cut-out of the
 * shop's black-lit renders, a product without one gets a plain tinted tile
 * that says the photo is outstanding. The card keeps its size and shape either
 * way, so a listing never looks half-built.
 *
 * An earlier pass drew the product's initials in that tile. It was dropped:
 * these names mix Latin and Cyrillic, so "Rewalk стегновий" rendered as "RС"
 * with a Cyrillic С that reads as a Latin C — a meaningless pair of letters
 * that looked like a code the reader was supposed to recognise.
 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={productHref(product)}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card transition-[border-color,box-shadow,scale] duration-fast ease-out-quint active:scale-[0.99] hover:border-hairline-strong hover:shadow-card-hover"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-base">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1280px) 20rem, (min-width: 640px) 44vw, 88vw"
            className="object-contain p-6 transition-[scale] duration-200 ease-out-quint group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-accent-tint">
            <ImageOff
              aria-hidden="true"
              size={20}
              strokeWidth={1.5}
              className="text-fg-accent"
            />
            <span className="text-caption text-fg-secondary">
              Фото готується
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 border-t border-hairline p-5">
        <h3 className="text-h3 text-balance text-fg">{product.name}</h3>
        <p className="line-clamp-3 text-body-sm text-pretty text-fg-secondary">
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
  );
}
