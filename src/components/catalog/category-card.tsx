import { hasDarkVariant, ThemedImage } from "@/components/ui/themed-image";
import Link from "next/link";

import type { Category } from "@/content/catalog";

/**
 * One catalogue direction: its illustration on an inset tile, the caption on
 * the card's surface under it.
 *
 * The art is painted on a light studio ground, so it keeps its own tile and
 * the caption never sits over it: that reads the same on both themes, where a
 * scrim over the art would fade light grey into black. The chips on the art
 * are fixed light for the same reason — they sit on the art, not on the page.
 */
export function CategoryCard({
  category,
  summary,
  count,
}: {
  category: Category;
  /** Short line for the homepage; the catalogue passes the longer blurb. */
  summary: string;
  /** Listed positions; shown on the catalogue page, where it is a promise. */
  count?: number;
}) {
  return (
    <Link
      href={`/catalog/${category.slug}`}
      className="group flex h-full flex-col rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline transition-[box-shadow,scale] duration-medium ease-out-quint active:scale-[0.99] hover:shadow-card-hover hover:ring-hairline-strong"
    >
      <div className={`relative aspect-16/8 overflow-hidden rounded-inner bg-[#f2f4f5] ${hasDarkVariant(category.image) ? "dark:bg-[#0e0e10]" : ""}`}>
        <ThemedImage
          src={category.image}
          alt={category.imageAlt}
          fill
          quality={82}
          sizes="(min-width: 1024px) 40rem, 92vw"
          className="object-cover object-right"
        />
      </div>

      <div className="flex flex-col gap-1.5 px-4 pt-5 pb-4 lg:px-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-h3 text-fg">{category.title}</h3>
          {count !== undefined ? (
            <span className="shrink-0 rounded-pill bg-fg/[0.05] px-2.5 py-0.5 text-caption text-fg-muted tabular-nums ring-1 ring-inset ring-hairline">
              {count > 0 ? `${count} ${positions(count)}` : "за запитом"}
            </span>
          ) : null}
        </div>
        <p className="text-body-sm text-pretty text-fg-secondary">{summary}</p>
      </div>
    </Link>
  );
}

/** Ukrainian plural for «позиція»: 1 позиція, 3 позиції, 10 позицій. */
export function positions(n: number) {
  const tens = n % 100;
  const ones = n % 10;
  if (tens >= 11 && tens <= 14) return "позицій";
  if (ones === 1) return "позиція";
  if (ones >= 2 && ones <= 4) return "позиції";
  return "позицій";
}
