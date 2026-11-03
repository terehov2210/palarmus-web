"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { MaterialCard } from "@/components/education/material-card";
import { directions, materialTypes, typeFilterLabel, type Material, type MaterialType } from "@/content/training";

/** Cards shown before «Показати ще» (brief §4: pagination once there is a lot). */
const PAGE = 12;

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
  const [limit, setLimit] = useState(PAGE);

  const types = materialTypes.filter((t) => materials.some((m) => m.type === t.id));
  const sources = [...new Set(materials.map((m) => m.source))];
  const q = fold(query.trim());
  const matchesQuery = (m: Material) =>
    !q ||
    fold(`${m.title} ${m.summary} ${m.source} ${directions.find((d) => d.slug === m.direction)?.title ?? ""}`).includes(q);
  const shown = materials.filter(
    (m) => (type === "all" || m.type === type) && (source === "all" || m.source === source) && matchesQuery(m),
  );
  /** How many a type chip would show, given the other filters. */
  const countType = (t: MaterialType | "all") =>
    materials.filter((m) => (t === "all" || m.type === t) && (source === "all" || m.source === source) && matchesQuery(m)).length;
  const visible = shown.slice(0, limit);

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
            className="min-h-12 w-full rounded-pill bg-surface ps-11 pe-4 text-body text-fg ring-1 ring-inset ring-hairline placeholder:text-fg-muted"
          />
        </label>

        {types.length > 1 ? (
          <div role="group" aria-label="Тип матеріалу" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={type === "all"} onClick={() => setType("all")} className={chip(type === "all")}>
              Усі матеріали
              <span className="ms-1.5 text-caption tabular-nums text-fg-muted">{countType("all")}</span>
            </button>
            {types.map((t) => (
              <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(t.id)} className={chip(type === t.id)}>
                {typeFilterLabel[t.id]}
                <span className="ms-1.5 text-caption tabular-nums text-fg-muted">{countType(t.id)}</span>
              </button>
            ))}
          </div>
        ) : null}

        {sources.length > 1 ? (
          <div role="group" aria-label="Виробник" className="flex flex-wrap items-center gap-2">
            <span className="me-1 text-body-sm text-fg-muted">Виробник</span>
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
          {visible.map((m) => (
            <li key={m.slug}>
              <MaterialCard material={m} />
            </li>
          ))}
        </ul>
      ) : null}

      {shown.length > visible.length ? (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className="inline-flex min-h-11 items-center self-center rounded-pill bg-fg/[0.05] px-6 text-body-sm font-semibold text-fg ring-1 ring-inset ring-hairline transition-[background-color,box-shadow,scale] duration-fast ease-out-quint hover:bg-fg/[0.09] hover:ring-hairline-strong active:scale-[0.96]"
        >
          Показати ще {Math.min(PAGE, shown.length - visible.length)}
        </button>
      ) : null}

      {shown.length > 0 ? null : (
        <div className="flex flex-col items-start gap-4 rounded-card bg-surface p-8 ring-1 ring-inset ring-hairline">
          <p className="text-body text-pretty text-fg-secondary">
            {q ? <>За запитом «{query.trim()}» матеріалів немає.</> : <>З цими фільтрами матеріалів немає.</>}{" "}
            Спробуйте іншу назву або покажіть усі матеріали.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setType("all");
              setSource("all");
            }}
            className={chip(false)}
          >
            Скинути пошук і фільтри
          </button>
        </div>
      )}
    </div>
  );
}
