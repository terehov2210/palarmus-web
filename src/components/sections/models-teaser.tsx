import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { GROUPS, groupOf, modelThumb, models3d } from "@/content/models-3d";

/** One assembly per direction, so the strip shows the range rather than four hips. */
const PICKS = ["hip-tha", "mirai-ps", "titan-long-kit", "femur-distal-lateral-plate"];

/**
 * The homepage door into /3d-models. The 3D collection is the site's own
 * material — nothing else in the market shows these implants turning — so it
 * sits right after the catalogue's six directions: first what is sold, then the
 * same things seen up close.
 */
export function ModelsTeaser() {
  const picks = PICKS.map((slug) => models3d.find((m) => m.slug === slug)).filter((m) => m !== undefined);

  return (
    <Section id="models-3d" labelledBy="models-teaser-title">
      <SectionHeader
        titleId="models-teaser-title"
        title="Кожен імплант можна покрутити й розібрати"
        description={`${models3d.length} моделей, побудованих за розмірами з каталогів виробників: ендопротези, стрижні, пластини, гвинти, якорі та обладнання.`}
        action={
          <ButtonLink href="/3d-models" variant="secondary">
            Усі 3D-моделі
          </ButtonLink>
        }
      />

      <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {picks.map((model, i) => (
          <Reveal as="li" key={model.slug} delay={(i % 4) * 60}>
            <Link
              href={`/3d-models#${model.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-card bg-base p-2 shadow-card ring-1 ring-inset ring-hairline transition-[box-shadow] duration-medium ease-out-quint hover:shadow-card-hover hover:ring-hairline-strong"
            >
              <div className="product-stage relative aspect-4/3 overflow-hidden rounded-inner">
                <Image
                  src={modelThumb(model)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 18rem, 44vw"
                  className="object-contain p-3"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 px-3 pt-4 pb-3">
                <p className="text-caption text-fg-muted">{GROUPS.find((g) => g.id === groupOf(model))?.label}</p>
                <h3 className="text-body-sm font-semibold text-balance text-fg">{model.short}</h3>
                <span className="mt-auto inline-flex items-center gap-2 pt-3 text-body-sm font-semibold text-fg transition-[color] duration-fast ease-out-quint group-hover:text-fg-accent">
                  Відкрити в 3D
                  <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
