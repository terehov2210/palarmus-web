import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
