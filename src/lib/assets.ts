import fs from "node:fs";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");

/**
 * Whether a file exists under `public/`, checked at build time.
 *
 * Several parts of the site are written before their art is commissioned. This
 * lets a server component decide between the real image and an honest fallback
 * without ever shipping a broken `<img>` or a stand-in that pretends to be the
 * real thing.
 */
export function hasPublicAsset(src: string) {
  try {
    return fs.existsSync(path.join(publicDir, src.replace(/^\//, "")));
  } catch {
    return false;
  }
}
