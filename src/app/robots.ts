import type { MetadataRoute } from "next";

import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account pages hold nothing a crawler should index.
      disallow: ["/account/", "/compare"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
