import Image from "next/image";
import { ImageOff } from "lucide-react";

import type { Product } from "@/content/products";

/**
 * A product's picture, on its own studio tile.
 *
 * The manufacturer's renders are lit on pure black. Keying the black out was
 * tried and rejected (see docs/product-media.md): the darker metal keys out
 * with it. So the tile is dark instead, in both themes, and the render is
 * composited with `mix-blend-mode: screen`. Screen leaves light untouched and
 * turns black fully transparent, so the render's ground disappears into the
 * tile's own soft light while every grey of the metal survives — no matte, no
 * holes, no stair-stepped edges. The transparent cut-outs sit on it as they
 * are, since screen over nothing is nothing.
 *
 * `imageOnLight` marks the one photograph shot on white (TrHCROSS): screen
 * would turn it into a white square, so it gets a white tile instead.
 */
export function ProductMedia({
  product,
  sizes,
  priority = false,
  padding = "p-7",
  zoomOnHover = false,
  className,
}: {
  product: Product;
  sizes: string;
  priority?: boolean;
  padding?: string;
  zoomOnHover?: boolean;
  className?: string;
}) {
  const light = product.imageOnLight === true;
  return (
    <div
      className={[
        "relative overflow-hidden",
        product.image ? (light ? "bg-white" : "product-stage") : "bg-surface",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {product.image ? (
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          priority={priority}
          sizes={sizes}
          className={[
            "object-contain",
            padding,
            light ? "" : "mix-blend-screen",
            zoomOnHover ? "transition-[scale] duration-700 ease-out-quint group-hover:scale-[1.06]" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
          <ImageOff aria-hidden="true" size={20} strokeWidth={1.5} className="text-fg-muted" />
          <span className="text-caption text-fg-muted">Фото надішлемо на запит</span>
        </div>
      )}
    </div>
  );
}
