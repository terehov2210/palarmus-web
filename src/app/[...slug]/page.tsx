import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";

/**
 * Every route other than the homepage lands here for now, so nothing the
 * homepage links to dead-ends on a 404 while the rest of the site is built.
 * Delete this catch-all as each real route lands.
 */

export const metadata: Metadata = {
  title: "Розділ у розробці",
  robots: { index: false, follow: true },
};

export default async function StubPage({
  params,
}: PageProps<"/[...slug]">) {
  const { slug } = await params;

  return (
    <div className="container-page flex min-h-[60vh] flex-col justify-center gap-6 py-24">
      <Eyebrow>Розділ у розробці</Eyebrow>
      <h1 className="max-w-[24ch] text-h2 text-balance text-fg">
        Ця сторінка ще збирається
      </h1>
      <p className="max-w-[56ch] text-lede text-pretty text-fg-secondary">
        Готова головна сторінка, решта розділів у роботі. Щоб підібрати імплант
        зараз — залиште заявку або зателефонуйте нам.
      </p>
      <p className="text-caption text-fg-muted">
        Маршрут: /{slug.join("/")}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <ButtonLink href="/#consultation">Отримати консультацію</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          На головну
        </ButtonLink>
      </div>
    </div>
  );
}
