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
// Accent hue is #ff2f00, measured off the previous palarmus.com.ua build.
// Neutral is a cool graphite held at h=264. Error is held at h=0 so it sits
// 32 degrees off the accent — a failed field must never read as a highlight.
// Only the status ramps the product renders exist; there is no warning ramp.
// ============================================================================

const BRAND = "#ff2f00";
const [, , ACCENT_HUE] = hexToOklch(BRAND);
const NEUTRAL_HUE = 264;
const ERROR_HUE = 0;
const SUCCESS_HUE = 152;

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Even steps in perceived lightness, denser at the light end.
const L = [0.971, 0.936, 0.885, 0.823, 0.744, 0.652, 0.581, 0.497, 0.417, 0.339, 0.252];
// Vividness peaks mid-ramp and falls off at both ends, as a fraction of the
// hue's own sRGB maximum at that lightness.
const C = [0.05, 0.11, 0.24, 0.42, 0.64, 0.86, 1.0, 0.92, 0.78, 0.62, 0.46];

const L_NEUTRAL = [0.985, 0.967, 0.928, 0.868, 0.782, 0.688, 0.588, 0.481, 0.382, 0.283, 0.204];
const C_NEUTRAL = [0.0018, 0.0026, 0.004, 0.0056, 0.007, 0.0078, 0.0082, 0.008, 0.0072, 0.006, 0.0048];

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
const error = ramp(ERROR_HUE, 0.85);
const success = ramp(SUCCESS_HUE, 0.9);

const neutral = {};
STEPS.forEach((step, i) => {
  const lch = [L_NEUTRAL[i], C_NEUTRAL[i], NEUTRAL_HUE];
  neutral[step] = { css: fmt(lch), hex: toHex(lch) };
});

const named = (l, c, h) => ({ css: fmt([l, c, h]), hex: toHex([l, c, h]) });

// Off-step values that exist because a specific role needs them.
const extra = {
  "neutral-ink": named(0.168, 0.004, NEUTRAL_HUE), // page ground
  "neutral-550": named(0.55, 0.008, NEUTRAL_HUE), // control perimeter, >=3:1
  "accent-550": named(0.58, maxC(0.58, ACCENT_HUE) * 0.98, ACCENT_HUE), // fill hover
  "accent-600": named(0.54, maxC(0.54, ACCENT_HUE) * 0.98, ACCENT_HUE), // fill rest
  "accent-650": named(0.5, maxC(0.5, ACCENT_HUE) * 0.98, ACCENT_HUE), // fill active
  "accent-925": named(0.28, maxC(0.28, ACCENT_HUE) * 0.35, ACCENT_HUE), // tint surface
};

// ============================================================================
// Semantic tokens, exactly as globals.css wires them
// ============================================================================

const T = {
  base: extra["neutral-ink"].hex,
  surface: neutral[950].hex,
  raised: neutral[900].hex,

  fg: neutral[50].hex,
  "fg-secondary": neutral[300].hex,
  "fg-muted": neutral[400].hex,
  "fg-accent": accent[500].hex,
  "on-accent": neutral[50].hex,

  "accent-solid": extra["accent-600"].hex,
  "accent-solid-hover": extra["accent-550"].hex,
  "accent-solid-active": extra["accent-650"].hex,
  "accent-tint": extra["accent-925"].hex,

  "control-line": extra["neutral-550"].hex,
  "focus-ring": neutral[50].hex,

  error: error[500].hex,
  "error-line": error[400].hex,
  "error-tint": error[900].hex,
  success: success[400].hex,
  "success-tint": success[900].hex,
};

// Brightest pixel in the category artwork, for the scrim check.
const GLOW = "#ff4d2b";

// [foreground, background, required ratio, note]
const PAIRS = [
  ["fg", "base", 4.5], ["fg", "surface", 4.5], ["fg", "raised", 4.5],
  ["fg-secondary", "base", 4.5], ["fg-secondary", "surface", 4.5], ["fg-secondary", "raised", 4.5],
  ["fg-muted", "base", 4.5], ["fg-muted", "surface", 4.5], ["fg-muted", "raised", 4.5],
  ["fg-accent", "base", 4.5], ["fg-accent", "surface", 4.5],
  ["fg-accent", "raised", 3, "icon only — accent text is kept off bg-raised"],

  ["on-accent", "accent-solid", 4.5],
  ["on-accent", "accent-solid-hover", 4.5],
  ["on-accent", "accent-solid-active", 4.5],
  ["accent-solid", "base", 3], ["accent-solid", "surface", 3],
  ["fg", "accent-tint", 4.5], ["fg-accent", "accent-tint", 3],

  ["error", "surface", 4.5], ["fg", "error-tint", 4.5], ["error", "error-tint", 3],
  ["error-line", "surface", 3], ["error-line", "base", 3],
  ["success", "surface", 4.5], ["fg", "success-tint", 4.5], ["success", "success-tint", 3],

  ["control-line", "surface", 3], ["control-line", "base", 3],
  ["focus-ring", "base", 3], ["focus-ring", "surface", 3], ["focus-ring", "accent-solid", 3],
];

// ============================================================================
// Report
// ============================================================================

const pad = (v, n) => String(v).padEnd(n);

console.log(`brand ${BRAND} -> h=${ACCENT_HUE.toFixed(1)}`);
console.log(`error hue ${ERROR_HUE} sits ${Math.min(Math.abs(ERROR_HUE - ACCENT_HUE), 360 - Math.abs(ERROR_HUE - ACCENT_HUE)).toFixed(0)} degrees off the accent\n`);

for (const [name, r] of [["accent", accent], ["neutral", neutral], ["error", error], ["success", success]]) {
  console.log(`--- ${name} ---`);
  for (const s of STEPS) console.log(`  --${name}-${pad(s, 4)} ${pad(r[s].css, 30)} ${r[s].hex}`);
  console.log("");
}
console.log("--- role-specific steps ---");
for (const [k, v] of Object.entries(extra)) console.log(`  --${pad(k, 13)} ${pad(v.css, 30)} ${v.hex}`);

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

console.log("\n--- fg over the scrim on category art ---");
for (const alpha of [0.75, 0.85, 0.92]) {
  const flat = over(T.base, alpha, GLOW);
  console.log(`  scrim ${(alpha * 100).toFixed(0)}% over ${GLOW} -> ${flat}   fg ${contrast(T.fg, flat).toFixed(2)}:1`);
}

if (failures > 0) {
  console.error(`\n${failures} failing pair(s). Fix the tokens or the usage before shipping.`);
  process.exit(1);
}
console.log("\nAll measured pairs pass.");
