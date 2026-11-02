import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LibraryBrowser } from "@/components/education/library-browser";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { directions, findDirection, materialsIn } from "@/content/training";

export function generateStaticParams() {
  return directions.map((d) => ({ direction: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/education/[direction]">): Promise<Metadata> {
  const { direction } = await params;
  const found = findDirection(direction);
  if (!found) return { title: "Розділ не знайдено" };
  return {
    title: `${found.title} — Навчання`,
    description: found.lede,
    alternates: { canonical: `/education/${found.slug}` },
  };
}

/** A direction (brief §4): breadcrumbs, title, short description, search, filters, the grid. */
export default async function DirectionPage({ params }: PageProps<"/education/[direction]">) {
  const { direction } = await params;
  const found = findDirection(direction);
  if (!found) notFound();
  const list = materialsIn(found.slug);

  return (
    <>
      <PageHeader
        id="direction-title"
        trail={[{ label: "Навчання", href: "/education" }, { label: found.title }]}
        title={found.title}
        lede={found.lede}
      />
      <Section labelledBy="direction-title" className="pt-0 lg:pt-0">
        {list.length > 0 ? (
          <LibraryBrowser materials={list} />
        ) : (
          <div className="flex flex-col items-start gap-5 rounded-card bg-surface p-8 ring-1 ring-inset ring-hairline lg:p-10">
            <p className="max-w-[60ch] text-lede text-pretty text-fg-secondary">
              Матеріали цього напряму ще готуються. Хірургічні техніки й описи
              систем можна запитати в команди Palarmus Implants.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contacts">Запитати матеріали</ButtonLink>
              <ButtonLink href="/education/materials" variant="secondary">
                Усі навчальні матеріали
              </ButtonLink>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
