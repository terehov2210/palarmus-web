/**
 * Brand glyphs. `lucide-react` dropped brand icons in v1, so the marks the
 * site actually links to live here — same 24-unit grid, same `currentColor`,
 * same stroke widths, so they sit correctly beside the lucide set.
 */

type GlyphProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function InstagramGlyph({
  size = 16,
  strokeWidth = 1.5,
  className,
}: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
