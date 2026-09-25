// Rasterize the brand logo (white on transparent) for the cap decal texture.
// node 3d/scripts/logo.mjs  ->  3d/source/logo-white.png
import { readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync(new URL("../../public/brand/palarmus-implants.svg", import.meta.url), "utf8")
  .replace(/currentColor/g, "#ffffff");
const out = new URL("../source/logo-white.png", import.meta.url);
// A few px of padding so texture filtering at the UV edge never clips a letter
await sharp(Buffer.from(svg), { density: 1200 })
  .resize(2000)
  .extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(out.pathname.replace(/^\/([A-Z]:)/, "$1"));
