"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { findCategory } from "@/content/catalog";
import {
  materials,
  modelThumb,
  models3d,
  modelUrl,
  type Model3D,
} from "@/content/models-3d";
import { supportsWebGL } from "@/lib/webgl";

/** three + R3F stay out of the page bundle, and WebGL cannot render on the server. */
const ModelStage = dynamic(
  () => import("@/components/model-stage").then((m) => m.ModelStage),
  { ssr: false },
);

/** Short names for the filter: the catalogue's own titles run to four words. */
const FILTERS = [
  { id: "all", label: "Усі" },
  { id: "joints", label: "Суглоби" },
  { id: "traumatology", label: "Травматологія" },
  { id: "sports-medicine", label: "Спортивна медицина" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const isSlug = (slug: string) => models3d.some((m) => m.slug === slug);

/**
 * Starts fetching a GLB the moment a card is pointed at. The stage loads its
 * models through drei's own cache, which a plain fetch does not fill — but the
 * HTTP cache it lands in does make the stage's request near-instant.
 */
const warmed = new Set<string>();
function warm(model: Model3D) {
  const url = modelUrl(model);
  if (warmed.has(url)) return;
  warmed.add(url);
  fetch(url, { priority: "low" } as RequestInit).catch(() => warmed.delete(url));
}

function ModelSheet({ model }: { model: Model3D }) {
  const category = findCategory(model.category);
  const href = model.product ? `/catalog/${model.category}/${model.product}` : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4" aria-live="polite">
        {category ? <Eyebrow>{category.title}</Eyebrow> : null}
        <h2 id="model-title" className="text-h2 text-balance text-fg">
          {model.name}
        </h2>
        <p className="text-body-sm text-fg-muted">{model.maker}</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-label uppercase text-fg-accent">Де застосовується</h3>
          <p className="max-w-[60ch] text-body text-pretty text-fg-secondary">{model.where}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-label uppercase text-fg-accent">Чому саме така конструкція</h3>
          <p className="max-w-[60ch] text-body text-pretty text-fg-secondary">{model.why}</p>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] border-t border-hairline text-body-sm">
        {model.spec.map(([term, value]) => (
          <div key={term} className="col-span-2 grid grid-cols-subgrid border-b border-hairline py-3">
            <dt className="pe-6 text-fg-muted">{term}</dt>
            <dd className="text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <ul aria-label="Матеріали" className="flex flex-wrap gap-1.5">
        {model.materials.map((id) => (
          <li
            key={id}
            className="inline-flex items-center gap-2 rounded-pill py-1 ps-1 pe-3 text-caption text-fg ring-1 ring-inset ring-hairline"
          >
            <span
              aria-hidden="true"
              className="size-5 rounded-full ring-1 ring-inset ring-hairline-strong"
              style={{ background: materials[id].swatch }}
            />
            {materials[id].label}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        {href ? (
          <ButtonLink href={href}>
            Відкрити в каталозі
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2} />
          </ButtonLink>
        ) : (
          <ButtonLink href="/#consultation">Запитати про наявність</ButtonLink>
        )}
      </div>
    </div>
  );
}

function ModelCard({
  model,
  selected,
  onSelect,
}: {
  model: Model3D;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-controls="model-stage"
      onClick={onSelect}
      onPointerEnter={() => warm(model)}
      onFocus={() => warm(model)}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-card bg-base p-2 text-start shadow-card ring-inset transition-[box-shadow,translate,scale] duration-medium ease-out-quint active:scale-[0.99] ${
        selected
          ? "ring-2 ring-accent-line"
          : "ring-1 ring-hairline hover:-translate-y-1 hover:shadow-card-hover"
      }`}
    >
      <div className="product-stage relative aspect-4/3 overflow-hidden rounded-inner">
        <Image
          src={modelThumb(model)}
          alt=""
          fill
          sizes="(min-width: 1280px) 15rem, (min-width: 640px) 30vw, 44vw"
          className="object-contain p-3 transition-[scale] duration-700 ease-out-quint group-hover:scale-[1.06]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pt-4 pb-3">
        <p className="text-caption text-fg-muted">
          {FILTERS.find((f) => f.id === model.category)?.label}
        </p>
        <h3 className="text-body-sm font-semibold text-balance text-fg">{model.short}</h3>
      </div>
    </button>
  );
}

/**
 * The /3d-models showcase: one stage, the sheet for whatever is on it, and the
 * collection to pick from.
 *
 * The sheet and the cards are ordinary server-rendered markup, so the page
 * reads in full before — or without — WebGL. The stage alone is client-only.
 * The model on stage is mirrored into the URL hash, so a link can open on it.
 */
export function ModelShowcase() {
  const [slug, setSlug] = useState(models3d[0].slug);
  const [filter, setFilter] = useState<FilterId>("all");
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  // Platform capability and the URL hash: neither exists during SSR.
  useEffect(() => {
    const read = () => {
      setWebgl(supportsWebGL());
      const hash = window.location.hash.slice(1);
      if (isSlug(hash)) setSlug(hash);
    };
    read();
  }, []);

  const select = useCallback((next: string) => {
    setSlug(next);
    window.history.replaceState(null, "", `#${next}`);
    // Below `lg` the stage is above the cards, often off-screen by now.
    if (window.matchMedia("(min-width: 64rem)").matches) return;
    stage.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, []);

  const model = models3d.find((m) => m.slug === slug) ?? models3d[0];
  const shown = models3d.filter((m) => filter === "all" || m.category === filter);

  return (
    <div className="flex flex-col gap-20 lg:gap-28">
      {/* On a desktop the stage is the point of the page: it takes the wider
          column and nearly the full height of the window under the sticky
          header, so the model is shown at a size worth turning. */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-14">
        <div ref={stage} className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline">
            <div
              id="model-stage"
              className="product-stage relative aspect-square overflow-hidden rounded-inner sm:aspect-4/3 model-stage-tall"
            >
              <p className="sr-only">
                Тривимірна модель: {model.name}. Потягніть по горизонталі, щоб обертати.
              </p>
              {webgl ? <ModelStage model={model} /> : null}
              {webgl === false ? (
                <Image
                  src={modelThumb(model)}
                  alt={model.name}
                  fill
                  sizes="(min-width: 1024px) 40rem, 92vw"
                  className="object-contain p-10"
                />
              ) : null}
            </div>
          </div>
        </div>

        <ModelSheet model={model} />
      </div>

      <section aria-labelledby="models-all" className="flex flex-col gap-8">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="models-all" className="text-h2 text-fg">
            Усі моделі
          </h2>
          <ToggleGroup
            aria-label="Напрям"
            value={[filter]}
            onValueChange={(next) => {
              if (next[0]) setFilter(next[0] as FilterId);
            }}
            // One row that scrolls sideways on a phone: four options wrapped inside a
            // pill read as two broken pills.
            className="inline-flex max-w-full gap-1 self-start overflow-x-auto rounded-pill bg-fg/[0.04] p-1 ring-1 ring-inset ring-hairline [scrollbar-width:none] sm:self-auto"
          >
            {FILTERS.map((f) => (
              <Toggle
                key={f.id}
                value={f.id}
                className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-pill px-4 text-body-sm font-medium text-fg-secondary transition-[background-color,color,box-shadow,scale] duration-fast ease-out-quint hover:text-fg active:scale-[0.96] data-pressed:bg-base data-pressed:text-fg data-pressed:shadow-card"
              >
                {f.label}
              </Toggle>
            ))}
          </ToggleGroup>
        </Reveal>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {shown.map((m) => (
            <li key={m.slug}>
              <ModelCard model={m} selected={m.slug === slug} onSelect={() => select(m.slug)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
