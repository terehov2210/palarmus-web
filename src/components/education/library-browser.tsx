"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { MaterialCard } from "@/components/education/material-card";
import { directions, materialTypes, type Material, type MaterialType } from "@/content/training";

/** Case- and apostrophe-insensitive, so «зв'язок» finds «зв’язок». */
const fold = (s: string) => s.toLowerCase().replace(/[’'`ʼ™®]/g, "");

const chip = (on: boolean) =>
  `inline-flex min-h-9 items-center rounded-pill px-4 text-body-sm ring-1 ring-inset transition-[background-color,color,box-shadow] duration-fast ease-out-quint ${
    on ? "bg-base text-fg shadow-card ring-hairline-strong" : "bg-surface text-fg-secondary ring-hairline hover:text-fg"
  }`;

/**
 * Search, filters and the grid of a material list (brief §4). Filters only
 * offer what the list actually has: a type with no material, or a single
 * source, is not a choice worth a button.
 */
export function LibraryBrowser({
  materials,
  initialQuery = "",
}: {
  materials: Material[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<MaterialType | "all">("all");
  const [source, setSource] = useState<string | "all">("all");

  const types = materialTypes.filter((t) => materials.some((m) => m.type === t.id));
  const sources = [...new Set(materials.map((m) => m.source))];
  const q = fold(query.trim());
  const shown = materials.filter(
    (m) =>
      (type === "all" || m.type === type) &&
      (source === "all" || m.source === source) &&
      (!q ||
        fold(
          `${m.title} ${m.summary} ${m.source} ${directions.find((d) => d.slug === m.direction)?.title ?? ""}`,
        ).includes(q)),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <label className="relative block max-w-xl">
          <span className="sr-only">Пошук матеріалів</span>
          <Search
            aria-hidden="true"
            size={18}
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Процедура, імплант або виробник"
            className="min-h-12 w-full rounded-pill bg-surface ps-11 pe-4 text-body text-fg ring-1 ring-inset ring-hairline placeholder:text-fg-muted focus:ring-hairline-strong focus:outline-none"
          />
        </label>

        {types.length > 1 ? (
          <div role="group" aria-label="Тип матеріалу" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={type === "all"} onClick={() => setType("all")} className={chip(type === "all")}>
              Усі матеріали
            </button>
            {types.map((t) => (
              <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(t.id)} className={chip(type === t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        {sources.length > 1 ? (
          <div role="group" aria-label="Виробник або джерело" className="flex flex-wrap items-center gap-2">
            <span className="me-1 text-body-sm text-fg-muted">Джерело</span>
            <button type="button" aria-pressed={source === "all"} onClick={() => setSource("all")} className={chip(source === "all")}>
              Усі
            </button>
            {sources.map((s) => (
              <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)} className={chip(source === s)}>
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="text-body-sm text-fg-muted tabular-nums">
        {shown.length} з {materials.length}
      </p>

      {shown.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <li key={m.slug}>
              <MaterialCard material={m} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card bg-surface p-8 text-body text-pretty text-fg-secondary ring-1 ring-inset ring-hairline">
          За цим запитом матеріалів немає. Спробуйте іншу назву або зніміть фільтр.
        </p>
      )}
    </div>
  );
}
