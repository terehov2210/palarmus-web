import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
      className="group flex h-full flex-col rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline transition-[box-shadow,translate,scale] duration-medium ease-out-quint active:scale-[0.99] hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative aspect-16/8 overflow-hidden rounded-inner bg-[#f2f4f5]">
        <Image
          src={category.image}
          alt={category.imageAlt}
          fill
          quality={82}
          sizes="(min-width: 1024px) 40rem, 92vw"
          className="object-cover object-right transition-[scale] duration-700 ease-out-quint group-hover:scale-[1.04]"
        />

        <span
          aria-hidden="true"
          className="absolute start-3 top-3 rounded-pill bg-white/85 px-2.5 py-1 text-label text-[#3a3a3a] ring-1 ring-inset ring-black/10 backdrop-blur-md"
        >
          {category.index}
        </span>

        <span
          aria-hidden="true"
          className="absolute end-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-black shadow-[0_2px_8px_-2px_rgb(0_0_0/0.25)] ring-1 ring-inset ring-black/10 backdrop-blur-md transition-[background-color,color,rotate] duration-medium ease-out-quint group-hover:rotate-45 group-hover:bg-accent-solid group-hover:text-on-accent group-hover:ring-transparent"
        >
          <ArrowUpRight size={18} strokeWidth={2} />
        </span>
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
