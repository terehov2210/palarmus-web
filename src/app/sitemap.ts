import type { MetadataRoute } from "next";

import { categories } from "@/content/catalog";
import { products, productHref } from "@/content/products";
import { site } from "@/content/site";

/**
 * Every route the site has. Everything below is prerendered.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${site.url}/catalog`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...categories.map((c) => ({
      url: `${site.url}/catalog/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${site.url}${productHref(p)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${site.url}/education`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/about`,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${site.url}/contacts`,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];
}
