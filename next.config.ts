import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  images: {
    /**
     * AVIF first, WebP as the fallback.
     *
     * Next's default is `["image/webp"]`, so a browser that advertises AVIF
     * was still being handed WebP. Every illustration on this site is a smooth
     * 3D render — large areas of gradient with fine bone texture on top — which
     * is exactly the content AVIF encodes better than WebP at the same quality
     * setting, and where WebP is most prone to banding across the blue grounds.
     *
     * Ordering matters: Next picks the first entry the request's `Accept`
     * header allows, so anything without AVIF support transparently keeps
     * getting WebP.
     *
     * The cost is encode time on the first request for each variant, which is
     * paid once and then cached.
     */
    formats: ["image/avif", "image/webp"],
    /**
     * Next 16 allow-lists the `q` values the optimiser will honour, and the
     * default list is `[75]` alone.
     *
     * 82 exists because AVIF and WebP do not mean the same thing by "75".
     * Measured against the source render, AVIF q75 sits 0.6-2.0 dB below
     * WebP q75; at q82 the smooth hero is at parity (0.02 dB) and the most
     * texture-dense illustration is 1.4 dB behind while still 36% smaller.
     * Illustrations pass `quality={82}` so the byte saving never comes out of
     * fidelity. Everything else keeps 75, where it already looks right.
     */
    qualities: [75, 82],
  },

  /**
   * The hero's GLBs, which Next otherwise serves out of `public/` with
   * `max-age=0`.
   *
   * That is the right default for a folder whose filenames carry no content
   * hash — but it costs a revalidation round trip on every repeat visit for a
   * file approaching a megabyte, and the response is byte-identical almost
   * every time.
   *
   * A week of `max-age` with a month of `stale-while-revalidate` is the trade
   * this makes: repeat visits inside a week pay nothing, and a replaced model
   * still reaches everyone without anyone having to remember to rename a file.
   * `immutable` would be the faster answer and the wrong one here — these
   * assets have no hash in their names, so a returning reader would be pinned
   * to a stale model for as long as the max-age says.
   */
  async headers() {
    return [
      /**
       * Baseline hardening for every response. No CSP here on purpose: Next
       * inlines its bootstrap scripts, so a useful policy needs per-request
       * nonces from a proxy, and a policy with `unsafe-inline` would only look
       * like protection. `frame-ancestors` is the part worth having today.
       */
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/models/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
