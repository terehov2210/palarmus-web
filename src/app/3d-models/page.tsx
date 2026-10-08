import type { Metadata } from "next";

import { ModelShowcase } from "@/components/model-showcase";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { models3d } from "@/content/models-3d";

export const metadata: Metadata = {
  title: "3D-моделі імплантів",
  description:
    "Інтерактивні 3D-моделі імплантів Palarmus: ендопротези кульшового й колінного суглобів, стрижні та гвинти для остеосинтезу, фіксатори для спортивної медицини. Де застосовується кожен імплант і чому він так влаштований.",
  alternates: { canonical: "/3d-models" },
};

export default function Models3DPage() {
  return (
    <>
      <PageHeader
        id="models-title"
        trail={[{ label: "Головна", href: "/" }, { label: "3D-моделі" }]}
        eyebrow={`${models3d.length} моделей`}
        title={
          <>
            Імпланти <strong>у 3D</strong>
          </>
        }
        lede="Моделі побудовані за розмірами з каталогів виробників. Оберіть імплант, покрутіть його і подивіться, де він застосовується та чому влаштований саме так."
      />
      <Section labelledBy="model-title" className="pt-0 lg:pt-0">
        <ModelShowcase />
      </Section>
    </>
  );
}
