import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Download } from "lucide-react";

import { ProductCard } from "@/components/catalog/product-card";
import { MaterialCard } from "@/components/education/material-card";
import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Reveal } from "@/components/reveal";
import { buttonClasses } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { products } from "@/content/products";
import {
  duration,
  findDirection,
  findMaterial,
  materials,
  typeLabel,
} from "@/content/training";

export function generateStaticParams() {
  return materials
    .filter((m) => m.direction && m.media.kind !== "article")
    .map((m) => ({ direction: m.direction!, material: m.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/education/[direction]/[material]">): Promise<Metadata> {
  const { direction, material } = await params;
  const found = findMaterial(material);
  if (!found || found.direction !== direction) return { title: "Матеріал не знайдено" };
  return {
    title: `${found.title} — Навчання`,
    description: found.summary,
    alternates: { canonical: `/education/${direction}/${found.slug}` },
  };
}

/**
 * One material (brief §6): breadcrumbs, title, what it shows, the player or
 * viewer up top, the facts beside it, then supporting material and the
 * catalogue products it is about. The main file is the first thing on the
 * page, so a surgeon finds it without reading through text.
 */
export default async function MaterialPage({
  params,
}: PageProps<"/education/[direction]/[material]">) {
  const { direction, material } = await params;
  const found = findMaterial(material);
  if (!found || found.direction !== direction || found.media.kind === "article") notFound();
  const dir = findDirection(direction);
  const { media } = found;

  const related = found.related.map((s) => findMaterial(s)).filter((m) => m !== undefined);
  const items = found.products
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p) => p !== undefined);

  const facts: [string, string][] = [
    ["Виробник або джерело", found.source],
    ["Мова оригіналу", found.language],
    ["Тип матеріалу", typeLabel(found.type)],
    media.kind === "video" ? ["Тривалість", duration(media.seconds)] : ["Сторінок", String(media.pages)],
  ];

  return (
    <>
      <Section labelledBy="material-title" className="pt-10 lg:pt-14">
        <Breadcrumbs
          trail={[
            { label: "Навчання", href: "/education" },
            ...(dir ? [{ label: dir.title, href: `/education/${dir.slug}` }] : []),
            { label: found.title },
          ]}
        />

        <Reveal className="mt-8 flex max-w-[60rem] flex-col gap-5">
          <h1 id="material-title" className="text-h2 text-balance text-fg">
            {found.title}
          </h1>
          <p className="max-w-[64ch] text-lede text-pretty text-fg-secondary">{found.summary}</p>
        </Reveal>

        <div
          className={`mt-10 grid gap-8 lg:gap-12 ${
            media.kind === "video" ? "lg:grid-cols-[minmax(0,26rem)_1fr]" : "lg:grid-cols-[minmax(0,1fr)_18rem]"
          }`}
        >
          <Reveal className="rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline">
            {media.kind === "video" ? (
              <video
                src={media.file}
                poster={found.cover}
                controls
                playsInline
                preload="metadata"
                className={`w-full rounded-inner bg-black ${media.portrait ? "aspect-9/16" : "aspect-video"}`}
              >
                Ваш браузер не відтворює відео.{" "}
                <a href={media.file}>Відкрити файл</a>
              </video>
            ) : (
              <iframe
                src={`${media.file}#view=FitH`}
                title={found.title}
                loading="lazy"
                className="h-[78vh] min-h-[32rem] w-full rounded-inner bg-white"
              />
            )}
          </Reveal>

          <Reveal delay={80} className="flex flex-col gap-6 lg:self-start">
            <dl className="flex flex-col divide-y divide-hairline rounded-card bg-surface px-5 ring-1 ring-inset ring-hairline">
              {facts.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 py-4">
                  <dt className="text-caption text-fg-muted">{k}</dt>
                  <dd className="text-body text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            {media.kind === "pdf" ? (
              <div className="flex flex-col gap-3">
                <a
                  href={media.file}
                  target="_blank"
                  rel="noopener"
                  className={buttonClasses("secondary", "md", "justify-center")}
                >
                  Відкрити на весь екран
                  <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2} />
                </a>
                {media.download ? (
                  <a href={media.file} download className={buttonClasses("primary", "md", "justify-center")}>
                    <Download aria-hidden="true" size={16} strokeWidth={2} />
                    Завантажити PDF
                  </a>
                ) : null}
              </div>
            ) : null}
          </Reveal>
        </div>
      </Section>

      {related.length > 0 ? (
        <Section labelledBy="related-title" tone="surface">
          <SectionHeader titleId="related-title" title="Супровідні матеріали" />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((m) => (
              <li key={m.slug}>
                <MaterialCard material={m} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {items.length > 0 ? (
        <Section labelledBy="products-title">
          <SectionHeader titleId="products-title" title="Пов’язані вироби" />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((p) => (
              <li key={p.slug}>
                <ProductCard product={p} showCategory />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
