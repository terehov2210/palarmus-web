// Measures every text/fill pair the site renders against the brandbook
// palette (White #FFFFFF, Black #000000, Venetian Red #C7000B and their
// tints). No deps: `node scripts/palette.mjs`.
//
// Keep the hex values in step with the primitives in src/app/globals.css.

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const p = {
  white: "#ffffff",
  grey50: "#f5f5f5",
  grey100: "#ebebeb",
  grey400: "#8a8a8a",
  grey500: "#666666",
  grey700: "#3a3a3a",
  black: "#000000",
  ink900: "#0d0d0d",
  ink800: "#1a1a1a",
  ink500: "#6e6e6e",
  ink300: "#9e9e9e",
  ink200: "#c4c4c4",
  red300: "#e0666d",
  red500: "#c7000b",
  red600: "#a8000a",
  red700: "#8a0008",
};

// [label, foreground, background, minimum]
const pairs = [
  ["light · fg on base", p.black, p.white, 4.5],
  ["light · fg-secondary on base", p.grey700, p.white, 4.5],
  ["light · fg-secondary on surface", p.grey700, p.grey50, 4.5],
  ["light · fg-muted on base", p.grey500, p.white, 4.5],
  ["light · fg-muted on surface", p.grey500, p.grey50, 4.5],
  ["light · fg-muted on raised", p.grey500, p.grey100, 4.5],
  ["light · fg-accent on base", p.red500, p.white, 4.5],
  ["light · fg-accent on surface", p.red500, p.grey50, 4.5],
  ["light · error on base", p.red600, p.white, 4.5],
  ["light · control-line on base (non-text)", p.grey400, p.white, 3],
  ["light · control-line on surface (non-text)", p.grey400, p.grey50, 3],
  ["on-accent on accent-solid", p.white, p.red500, 4.5],
  ["on-accent on accent-solid-hover", p.white, p.red600, 4.5],
  ["on-accent on accent-solid-active", p.white, p.red700, 4.5],
  ["ink · fg on base", p.white, p.black, 4.5],
  ["ink · fg-secondary on base", p.ink200, p.black, 4.5],
  ["ink · fg-secondary on surface", p.ink200, p.ink900, 4.5],
  ["ink · fg-muted on base", p.ink300, p.black, 4.5],
  ["ink · fg-muted on raised", p.ink300, p.ink800, 4.5],
  ["ink · fg-accent on base", p.red300, p.black, 4.5],
  ["ink · fg-accent on surface", p.red300, p.ink900, 4.5],
  ["ink · control-line on base (non-text)", p.ink500, p.black, 3],
  ["ink · accent-solid on base (non-text)", p.red500, p.black, 3],
  ["ink · base red as text — must NOT be used", p.red500, p.black, 4.5],
];

let failures = 0;
for (const [label, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  const expectedFail = label.includes("must NOT");
  if (!ok && !expectedFail) failures++;
  const mark = ok ? "pass" : expectedFail ? "fail (expected)" : "FAIL";
  console.log(`${r.toFixed(2).padStart(6)}:1  ${mark.padEnd(16)} ${label}`);
}
process.exitCode = failures ? 1 : 0;
