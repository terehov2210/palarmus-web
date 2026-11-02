import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Play } from "lucide-react";

import { duration, materialHref, typeLabel, type Material } from "@/content/training";

/**
 * One material, the same structure whatever the source or format (brief §5):
 * cover, type, title, short description, source, the way in.
 */
export function MaterialCard({ material }: { material: Material }) {
  const { media } = material;
  const meta =
    media.kind === "video"
      ? duration(media.seconds)
      : media.kind === "pdf"
        ? `PDF · ${media.pages} с.`
        : "Стаття";

  return (
    <Link
      href={materialHref(material)}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-base p-2 shadow-card ring-1 ring-inset ring-hairline transition-[box-shadow,scale] duration-medium ease-out-quint active:scale-[0.99] hover:shadow-card-hover hover:ring-hairline-strong"
    >
      <div className="relative aspect-4/3 overflow-hidden rounded-inner bg-surface">
        <Image
          src={material.cover}
          alt=""
          fill
          sizes="(min-width: 1280px) 20rem, (min-width: 640px) 44vw, 88vw"
          className={
            media.kind === "pdf"
              ? "object-contain p-5 drop-shadow-[0_6px_14px_rgb(0_0_0/0.25)]"
              : "object-cover"
          }
        />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-(--stage-chip) px-2.5 py-0.5 text-caption text-(--stage-ink) tabular-nums ring-1 ring-inset ring-white/10 backdrop-blur-md">
          {media.kind === "video" ? (
            <Play aria-hidden="true" size={12} strokeWidth={2} className="fill-current" />
          ) : media.kind === "pdf" ? (
            <FileText aria-hidden="true" size={12} strokeWidth={2} />
          ) : null}
          {meta}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-5 pb-4">
        <p className="text-caption font-medium text-fg-muted">{typeLabel(material.type)}</p>
        <h3 className="text-h3 text-balance text-fg">{material.title}</h3>
        <p className="line-clamp-3 text-body-sm text-pretty text-fg-secondary">{material.summary}</p>
        <p className="text-caption text-fg-muted">{material.source}</p>
        <span className="mt-auto inline-flex items-center gap-2 pt-3 text-body-sm font-semibold text-fg transition-[color] duration-fast ease-out-quint group-hover:text-fg-accent">
          Переглянути матеріал
          <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
        </span>
      </div>
    </Link>
  );
}
