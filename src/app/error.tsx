"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { site } from "@/content/site";

/**
 * Runtime failures inside a page. The header and footer stay up (they live in
 * the root layout), so the reader keeps the navigation and the phone number —
 * which is the one route to us that never depends on this site working.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col justify-center gap-6 py-24">
      <Eyebrow>Помилка</Eyebrow>
      <h1 className="max-w-[20ch] text-h2 text-balance text-fg">
        Не вдалося завантажити сторінку
      </h1>
      <span aria-hidden="true" className="brand-mark size-2.5" />
      <p className="max-w-[56ch] text-lede text-pretty text-fg-secondary">
        Спробуйте ще раз. Якщо не допоможе — зателефонуйте нам:{" "}
        <a href={site.phone.href} className="font-semibold text-fg underline">
          {site.phone.label}
        </a>
        .
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button type="button" onClick={() => retry()}>
          Спробувати ще раз
        </Button>
        <ButtonLink href="/" variant="secondary">
          На головну
        </ButtonLink>
      </div>
    </div>
  );
}
