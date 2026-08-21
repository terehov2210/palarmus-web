import fs from "node:fs";
import path from "node:path";

import Image from "next/image";
import { ImageOff } from "lucide-react";

const publicDir = path.join(process.cwd(), "public");

/**
 * Checked at build time, not in the browser. The training section is fully
 * written before its illustrations are commissioned, so every slot has to
 * render something honest in the meantime: the real render once the file
 * lands in `public/`, and a labelled brief until then.
 *
 * Nothing here is a fake screenshot or a stand-in photograph. The placeholder
 * states plainly that art is outstanding and carries the spec it is waiting
 * for, so the page never implies an illustration exists when it does not.
 */
function hasAsset(src: string) {
  try {
    return fs.existsSync(path.join(publicDir, src.replace(/^\//, "")));
  } catch {
    return false;
  }
}

type ArtSlotProps = {
  src: string;
  alt: string;
  /** Rendered inside the placeholder so the brief travels with the page. */
  spec: string;
  /** Tailwind aspect utility, e.g. `aspect-4/3`. */
  aspect: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export function ArtSlot({
  src,
  alt,
  spec,
  aspect,
  sizes,
  className,
  priority = false,
}: ArtSlotProps) {
  const wrapper = [
    "relative overflow-hidden rounded-media media-outline",
    aspect,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (hasAsset(src)) {
    return (
      <div className={wrapper}>
        <Image
          src={src}
          alt={alt}
          fill
          quality={82}
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`${wrapper} bg-accent-tint`}>
      <div className="absolute inset-0 blueprint-grid opacity-60" />
      <div className="relative flex h-full flex-col items-start justify-end gap-2 p-5">
        <ImageOff
          aria-hidden="true"
          size={20}
          strokeWidth={1.5}
          className="text-fg-accent"
        />
        <p className="text-body-sm font-semibold text-fg">
          Ілюстрація готується
        </p>
        <p className="max-w-[42ch] text-caption text-pretty text-fg-secondary">
          {spec}
        </p>
      </div>
    </div>
  );
}
