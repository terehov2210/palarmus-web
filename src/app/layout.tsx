import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/content/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
    siteName: site.name,
    locale: "uk_UA",
    type: "website",
  },
};

/** No maximum-scale, so the reader decides how far to zoom. */
export const viewport: Viewport = {
  themeColor: "#fcfdfe",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" dir="ltr" className="h-full antialiased">
      <head>
        {/* Both subsets this page renders, preloaded so the first paint is
            not in a fallback face. */}
        <link
          rel="preload"
          href="/fonts/manrope-cyrillic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/manrope-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-full flex-col bg-base text-fg">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-100 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-control focus:bg-accent-solid focus:px-5 focus:text-body-sm focus:font-semibold focus:text-on-accent"
        >
          Перейти до вмісту
        </a>
        <SiteHeader />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
