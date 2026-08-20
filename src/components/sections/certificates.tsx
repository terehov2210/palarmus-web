import { ArrowUpRight, BadgeCheck } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import { certificates } from "@/content/trust";

export function Certificates() {
  return (
    <Section id="certificates" labelledBy="certificates-title">
      <SectionHeader
        eyebrow="Сертифікати якості"
        titleId="certificates-title"
        title="Документи, які супроводжують кожну партію"
        description="Імпланти постачаються з повним комплектом документів: сертифікат відповідності, декларація, номер серії та інструкція виробника."
      />

      <ul className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {certificates.map((certificate, i) => (
          <Reveal
            as="li"
            key={certificate.code}
            delay={(i % 4) * 90}
            className="flex h-full flex-col gap-5 rounded-card border border-hairline bg-surface p-6"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-control bg-accent-tint">
              <BadgeCheck
                aria-hidden="true"
                size={20}
                strokeWidth={2}
                className="text-fg-accent"
              />
            </span>

            <div className="flex flex-col gap-2">
              <h3 className="text-h3 text-fg">{certificate.code}</h3>
              <p className="text-body-sm text-pretty text-fg-secondary">
                {certificate.title}
              </p>
            </div>

            <dl className="mt-auto flex flex-col gap-3 border-t border-hairline pt-5 text-caption">
              <div className="flex flex-col gap-0.5">
                <dt className="text-fg-muted">Хто видав</dt>
                <dd className="text-fg-secondary">{certificate.issuer}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-fg-muted">Сфера дії</dt>
                <dd className="text-pretty text-fg-secondary">
                  {certificate.scope}
                </dd>
              </div>
            </dl>

            {/* A link is rendered only when a scan actually exists, so the
                card never offers a document it cannot open. */}
            {certificate.documentUrl ? (
              <a
                href={certificate.documentUrl}
                className="inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-fg transition-[color] duration-fast ease-out-quint hover:text-fg-accent"
              >
                Переглянути {certificate.code}
                <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2} />
              </a>
            ) : (
              <p className="text-caption text-fg-muted">
                Скан документа надаємо за запитом.
              </p>
            )}
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
