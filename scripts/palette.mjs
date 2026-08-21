// sRGB <-> OKLab/OKLCH + WCAG contrast, no deps.
const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
}
function linToOklab([r, g, b]) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}
function oklabToLin([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const oklabToOklch = ([L, a, b]) => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
const oklchToOklab = ([L, C, h]) => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];

const hexToOklch = (hex) => oklabToOklch(linToOklab(hexToRgb(hex).map(srgbToLin)));
const oklchToRgb = (lch) => oklabToLin(oklchToOklab(lch)).map(linToSrgb);
const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

// Largest chroma at (L, h) that still fits sRGB.
function clampChroma([L, C, h]) {
  if (inGamut(oklchToRgb([L, C, h]))) return [L, C, h];
  let lo = 0, hi = C;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb([L, mid, h]))) lo = mid; else hi = mid;
  }
  return [L, lo, h];
}
const toHex = (lch) => rgbToHex(oklchToRgb(clampChroma(lch)));

const relLum = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(srgbToLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function contrast(a, b) {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// Flatten a translucent fg over an opaque bg, then measure.
function over(fgHex, alpha, bgHex) {
  const f = hexToRgb(fgHex), b = hexToRgb(bgHex);
  return rgbToHex(f.map((v, i) => v * alpha + b[i] * (1 - alpha)));
}

const fmt = (lch) => {
  const [L, C, h] = clampChroma(lch);
  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(4)} ${h.toFixed(1)})`;
};

// ============================================================================
// Ramp construction
//
// Accent hue is measured off #0a6fe8, a clean azure. It is held near h=250 on
// purpose: far enough off cyan that it never reads as the teal the nearest
// competitor already owns, and short of the violet end where a medical blue
// starts looking like a generic AI gradient.
//
// Neutral shares the accent hue at a trace chroma, so every grey on the page
// is the same family of blue rather than a separate warm or neutral grey.
// Error is held at h=25 and success at h=152, both far enough off the accent
// that a failed field can never read as a brand highlight.
//
// One committed light appearance. The page ground is near-white, the ink is a
// cool near-black, and the anatomy art is a light duotone, so nothing here
// needs a second theme to stay legible.
// ============================================================================

const BRAND = "#0a6fe8";
const [, , ACCENT_HUE] = hexToOklch(BRAND);
const NEUTRAL_HUE = ACCENT_HUE;
const ERROR_HUE = 25;
const SUCCESS_HUE = 152;

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Even steps in perceived lightness, denser at the light end.
const L = [0.971, 0.936, 0.885, 0.823, 0.744, 0.652, 0.581, 0.497, 0.417, 0.339, 0.252];
// Vividness peaks mid-ramp and falls off at both ends, as a fraction of the
// hue's own sRGB maximum at that lightness.
const C = [0.05, 0.11, 0.24, 0.42, 0.64, 0.86, 1.0, 0.92, 0.78, 0.62, 0.46];

const maxC = (l, h) => clampChroma([l, 0.4, h])[1];

function ramp(hue, scale = 1) {
  const out = {};
  STEPS.forEach((step, i) => {
    const lch = [L[i], C[i] * maxC(L[i], hue) * scale, hue];
    out[step] = { css: fmt(lch), hex: toHex(lch) };
  });
  return out;
}

const accent = ramp(ACCENT_HUE);

const named = (l, c, h) => ({ css: fmt([l, c, h]), hex: toHex([l, c, h]) });

// Off-step values that exist because a specific role needs them. On a light
// appearance the useful part of every ramp is bunched at the two ends, so
// almost every role is off-step rather than on it.
const extra = {
  // Surfaces. Three steps of a cool near-white: the page, an alternating
  // band, and the lift used for hover and for wells under product art.
  "neutral-page": named(0.994, 0.0014, NEUTRAL_HUE),
  "neutral-band": named(0.968, 0.0062, NEUTRAL_HUE),
  "neutral-raised": named(0.938, 0.0088, NEUTRAL_HUE),

  // Ink. Three weights, all measured against all three surfaces.
  "neutral-ink": named(0.19, 0.013, NEUTRAL_HUE),
  "neutral-body": named(0.44, 0.014, NEUTRAL_HUE),
  "neutral-muted": named(0.52, 0.0125, NEUTRAL_HUE),

  // Control perimeters. Clears 3:1 on the page and on the band.
  "neutral-line": named(0.62, 0.01, NEUTRAL_HUE),

  // Accent. On light, hover and active go *darker* than rest, so the numbers
  // stay monotonic: bigger step, darker fill.
  "accent-500": named(0.6, maxC(0.6, ACCENT_HUE) * 0.96, ACCENT_HUE),
  "accent-600": named(0.505, maxC(0.505, ACCENT_HUE) * 0.98, ACCENT_HUE),
  "accent-650": named(0.455, maxC(0.455, ACCENT_HUE) * 0.98, ACCENT_HUE),
  "accent-700": named(0.41, maxC(0.41, ACCENT_HUE) * 0.98, ACCENT_HUE),
  "accent-100": named(0.955, 0.03, ACCENT_HUE),

  // Status. Tints are light washes rather than dark ones.
  "error-500": named(0.52, maxC(0.52, ERROR_HUE) * 0.9, ERROR_HUE),
  "error-400": named(0.6, maxC(0.6, ERROR_HUE) * 0.85, ERROR_HUE),
  "error-100": named(0.952, maxC(0.952, ERROR_HUE) * 0.32, ERROR_HUE),
  "success-500": named(0.48, maxC(0.48, SUCCESS_HUE) * 0.85, SUCCESS_HUE),
  "success-100": named(0.952, maxC(0.952, SUCCESS_HUE) * 0.3, SUCCESS_HUE),
};

// Two pixels measured off the category illustrations in public/categories.
// Re-measure with `python3 scripts/art-measure.py` whenever the art changes.
//
// ART_DARKEST is the darkest pixel anywhere in the set (the drill body in
// equipment.webp) and drives the caption scrim check at the bottom.
//
// ART_LABEL_BG is the darkest pixel under the `01`..`06` index label in the
// top-left corner. That label is the only text on the card with no scrim
// behind it, so it is measured against the artwork itself. The illustrations
// put a soft blue vignette in that corner where the previous duotone was
// near-white, which is what pushed fg-muted under 4.5:1 and moved the label to
// fg-secondary.
const ART_DARKEST = "#000002";
const ART_LABEL_BG = "#c4d3e3";

// ============================================================================
// Semantic tokens, exactly as globals.css wires them
// ============================================================================

const WHITE = "#ffffff";

const T = {
  base: extra["neutral-page"].hex,
  surface: extra["neutral-band"].hex,
  raised: extra["neutral-raised"].hex,

  fg: extra["neutral-ink"].hex,
  "fg-secondary": extra["neutral-body"].hex,
  "fg-muted": extra["neutral-muted"].hex,
  "fg-accent": extra["accent-600"].hex,
  "on-accent": WHITE,

  "accent-solid": extra["accent-600"].hex,
  "accent-solid-hover": extra["accent-650"].hex,
  "accent-solid-active": extra["accent-700"].hex,
  "accent-tint": extra["accent-100"].hex,
  "accent-line": extra["accent-500"].hex,

  "control-line": extra["neutral-line"].hex,
  // On light, the ring is the ink. It clears 3:1 on every surface *and* on
  // the accent fill, so one ring still works everywhere.
  "focus-ring": extra["neutral-ink"].hex,

  // Not a token: the artwork the unscrimmed index label sits on.
  "art-label-bg": ART_LABEL_BG,

  error: extra["error-500"].hex,
  "error-line": extra["error-400"].hex,
  "error-tint": extra["error-100"].hex,
  success: extra["success-500"].hex,
  "success-tint": extra["success-100"].hex,
};

// [foreground, background, required ratio, note]
const PAIRS = [
  ["fg", "base", 4.5], ["fg", "surface", 4.5], ["fg", "raised", 4.5],
  ["fg-secondary", "base", 4.5], ["fg-secondary", "surface", 4.5], ["fg-secondary", "raised", 4.5],
  ["fg-muted", "base", 4.5], ["fg-muted", "surface", 4.5], ["fg-muted", "raised", 4.5],
  ["fg-accent", "base", 4.5], ["fg-accent", "surface", 4.5],
  ["fg-accent", "raised", 4.5],

  ["on-accent", "accent-solid", 4.5],
  ["on-accent", "accent-solid-hover", 4.5],
  ["on-accent", "accent-solid-active", 4.5],
  ["accent-solid", "base", 3], ["accent-solid", "surface", 3],
  ["accent-line", "base", 3], ["accent-line", "surface", 3],
  ["fg", "accent-tint", 4.5], ["fg-accent", "accent-tint", 3],

  ["error", "base", 4.5], ["error", "surface", 4.5],
  ["fg", "error-tint", 4.5], ["error", "error-tint", 3],
  ["error-line", "base", 3], ["error-line", "surface", 3],
  ["success", "base", 4.5], ["success", "surface", 4.5],
  ["fg", "success-tint", 4.5], ["success", "success-tint", 3],

  ["control-line", "base", 3], ["control-line", "surface", 3],
  // The card index label, measured on the art rather than on a surface.
  ["fg-secondary", "art-label-bg", 4.5],
  ["focus-ring", "base", 3], ["focus-ring", "surface", 3], ["focus-ring", "accent-solid", 3],
];

// ============================================================================
// Report
// ============================================================================

const pad = (v, n) => String(v).padEnd(n);
const away = (h) => Math.min(Math.abs(h - ACCENT_HUE), 360 - Math.abs(h - ACCENT_HUE));

console.log(`brand ${BRAND} -> h=${ACCENT_HUE.toFixed(1)}`);
console.log(`error hue ${ERROR_HUE} sits ${away(ERROR_HUE).toFixed(0)} degrees off the accent`);
console.log(`success hue ${SUCCESS_HUE} sits ${away(SUCCESS_HUE).toFixed(0)} degrees off the accent\n`);

console.log("--- accent ramp (reference) ---");
for (const s of STEPS) console.log(`  --accent-${pad(s, 4)} ${pad(accent[s].css, 30)} ${accent[s].hex}`);

console.log("\n--- role-specific steps (these are what globals.css declares) ---");
for (const [k, v] of Object.entries(extra)) console.log(`  --${pad(k, 15)} ${pad(v.css, 30)} ${v.hex}`);

console.log("\n--- measured pairs ---");
let failures = 0;
for (const [fg, bg, need, note] of PAIRS) {
  const ratio = contrast(T[fg], T[bg]);
  const ok = ratio >= need;
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? "PASS" : "FAIL"} ${ratio.toFixed(2).padStart(5)}:1 (need ${need})  ${pad(fg, 20)} on ${pad(bg, 20)}${note ? `  # ${note}` : ""}`,
  );
}

// The card captions sit over the anatomy art, so the scrim has to carry ink
// text over the *darkest* thing in the picture, not the lightest.
console.log("\n--- fg over the scrim on anatomy art ---");
for (const alpha of [0.8, 0.88, 0.94]) {
  const flat = over(T.base, alpha, ART_DARKEST);
  const ratio = contrast(T.fg, flat);
  console.log(
    `  scrim ${(alpha * 100).toFixed(0)}% over ${ART_DARKEST} -> ${flat}   fg ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? "PASS" : "FAIL"}`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} failing pair(s). Fix the tokens or the usage before shipping.`);
  process.exit(1);
}
console.log("\nAll measured pairs pass.");
