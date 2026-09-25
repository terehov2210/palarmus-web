import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Сторінку не знайдено",
  robots: { index: false, follow: true },
};

/**
 * A real 404. The catch-all that used to answer every unknown URL with a 200
 * "section in progress" page is gone: to a crawler that is a soft 404, and to
 * a reader it promised a page that was never coming.
 */
export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col justify-center gap-6 py-24">
      <Eyebrow>Помилка 404</Eyebrow>
      <h1 className="max-w-[20ch] text-display text-balance text-fg">
        Сторінку <strong>не знайдено</strong>
      </h1>
      <span aria-hidden="true" className="brand-mark size-3" />
      <p className="max-w-[56ch] text-lede text-pretty text-fg-secondary">
        Можливо, посилання застаріло або сторінку перенесли. Почніть із
        каталогу або залиште заявку — підберемо потрібну позицію.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <ButtonLink href="/catalog">Переглянути каталог</ButtonLink>
        <ButtonLink href="/#consultation" variant="secondary">
          Отримати консультацію
        </ButtonLink>
      </div>
    </div>
  );
}
