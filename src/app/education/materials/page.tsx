import type { Metadata } from "next";

import { LibraryBrowser } from "@/components/education/library-browser";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { materials } from "@/content/training";

export const metadata: Metadata = {
  title: "Усі навчальні матеріали",
  description:
    "Хірургічні техніки, відеодемонстрації, інструкції та базові знання для травматологів і ортопедів.",
  alternates: { canonical: "/education/materials" },
};

/** Every material in one list; the library home's search lands here with `?q=`. */
export default async function MaterialsPage({ searchParams }: PageProps<"/education/materials">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  return (
    <>
      <PageHeader
        id="materials-title"
        trail={[
          { label: "Головна", href: "/" },
          { label: "Навчання", href: "/education" },
          { label: "Усі матеріали" },
        ]}
        title="Усі навчальні матеріали"
        lede="Хірургічні техніки, відеодемонстрації, інструкції та базові знання з усіх напрямів."
      />
      <Section labelledBy="materials-title" className="pt-0 lg:pt-0">
        {/* Keyed by the query, so a new search resets the filters. */}
        <LibraryBrowser key={query} materials={materials} initialQuery={query} />
      </Section>
    </>
  );
}
