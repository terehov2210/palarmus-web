import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/content/site";
import { themeScript } from "@/lib/theme";
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
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

/** No maximum-scale, so the reader decides how far to zoom. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `data-theme` is written by the inline script below before first paint,
    // so the server markup and the DOM legitimately differ on this element.
    <html lang="uk" dir="ltr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* The faces the first screen renders in, preloaded so it does not
            paint in a fallback: the hero headline (Gilroy Light + ExtraBold)
            and the Cyrillic body text. */}
        <link
          rel="preload"
          href="/fonts/gilroy-300.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/gilroy-800.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/montserrat-cyrillic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      {/* `relative` on body and an isolated root, both per Base UI: the root
          keeps page content in its own stacking context so dialogs portalled
          into <body> always paint above it, and `relative` keeps a dialog
          backdrop pinned on iOS Safari 26+. */}
      <body className="relative flex min-h-full flex-col bg-base text-fg">
        <div className="isolate flex min-h-full flex-1 flex-col">
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
        </div>
      </body>
    </html>
  );
}
