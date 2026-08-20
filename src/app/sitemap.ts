import type { MetadataRoute } from "next";

import { site } from "@/content/site";

/**
 * Only the homepage is real so far. Add each route here as it lands, rather
 * than listing the `[...slug]` stubs — those are `noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
