import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; href?: string };

/**
 * The catalogue goes three levels deep, so a page needs to say where it sits.
 * The current page is the last item and is not a link — it carries
 * `aria-current` instead, so a screen reader announces position without
 * offering a link to where the reader already is.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Навігація по каталогу">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-sm text-fg-muted">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-fg-muted/60"
                />
              ) : null}
              {last || !crumb.href ? (
                <span aria-current={last ? "page" : undefined} className="text-fg-secondary">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="rounded-control transition-[color] duration-fast ease-out-quint hover:text-fg-accent"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
