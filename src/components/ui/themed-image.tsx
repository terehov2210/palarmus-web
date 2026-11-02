import fs from "node:fs";
import path from "node:path";

import Image, { type ImageProps } from "next/image";

const publicDir = path.join(process.cwd(), "public");

/** `/categories/joints.webp` -> `/categories/joints-dark.webp`. */
export const darkVariant = (src: string) => src.replace(/(\.\w+)$/, "-dark$1");

/** Checked on the server at render (build) time, like `ArtSlot`. */
function exists(src: string) {
  try {
    return fs.existsSync(path.join(publicDir, src.replace(/^\//, "")));
  } catch {
    return false;
  }
}

/**
 * An illustration painted on a light studio ground, with an optional twin for
 * the dark theme. Drop `<name>-dark.webp` next to the original in `public/`
 * and it is used under `data-theme="dark"`; until then the light one shows in
 * both themes, exactly as before.
 *
 * Both are rendered and CSS picks one. A lazy `display: none` image is never
 * requested, so only the visible variant costs a download.
 */
export function ThemedImage({ src, alt, className, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  const dark = darkVariant(src);
  if (!exists(dark)) return <Image src={src} alt={alt} className={className} {...props} />;
  return (
    <>
      <Image src={src} alt={alt} className={`${className ?? ""} dark:hidden`} {...props} />
      <Image src={dark} alt={alt} className={`${className ?? ""} hidden dark:block`} {...props} />
    </>
  );
}

/** Whether a dark twin exists, for tiles that need a matching ground. */
export const hasDarkVariant = (src: string) => exists(darkVariant(src));
