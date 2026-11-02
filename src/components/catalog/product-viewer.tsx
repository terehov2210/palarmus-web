"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ModelPoster } from "@/components/model-poster";
import type { StageState } from "@/components/model-stage";
import type { Model3D } from "@/content/models-3d";
import { supportsWebGL } from "@/lib/webgl";

/** three + R3F stay out of the page bundle, and WebGL cannot render on the server. */
const ModelStage = dynamic(
  () => import("@/components/model-stage").then((m) => m.ModelStage),
  { ssr: false, loading: () => null },
);

type View = "3d" | "photo";

/** Probed once per page: each probe costs a WebGL context. Null on the server. */
let probed: boolean | undefined;
const noSubscribe = () => () => {};
const readWebgl = () => (probed ??= supportsWebGL());
const serverWebgl = () => null;

/**
 * The product picture with its 3D model beside it, one toggle apart. The model
 * opens first — it is the reason a surgeon would look closer — and the photo,
 * rendered on the server, stays one click away (and is all there is without
 * WebGL).
 */
export function ProductViewer({ model, photo }: { model: Model3D; photo: ReactNode }) {
  const webgl = useSyncExternalStore(noSubscribe, readWebgl, serverWebgl);
  const [view, setView] = useState<View>("3d");
  /** Null until the stage chunk has loaded and reported in. */
  const [stage, setStage] = useState<StageState | null>(null);

  const show3d = view === "3d" && webgl !== false;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-card bg-surface p-2 shadow-card ring-1 ring-inset ring-hairline">
        {show3d ? (
          <div className="product-stage relative aspect-square overflow-hidden rounded-inner">
            <p className="sr-only">
              Тривимірна модель: {model.name}. Потягніть, щоб обертати.
            </p>
            <ModelPoster
              model={model}
              hidden={stage !== null && stage !== "poster"}
              status={stage === null ? "Завантаження 3D" : undefined}
            />
            {webgl ? <ModelStage model={model} onStage={setStage} /> : null}
          </div>
        ) : (
          photo
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {webgl !== false ? (
          <ToggleGroup
            value={[view]}
            onValueChange={(next) => next[0] && setView(next[0] as View)}
            aria-label="Що показати"
            className="inline-flex rounded-pill bg-surface p-1 ring-1 ring-inset ring-hairline"
          >
            {(
              [
                ["3d", "3D-модель"],
                ["photo", "Фото"],
              ] as const
            ).map(([id, label]) => (
              <Toggle
                key={id}
                value={id}
                className="min-h-9 rounded-pill px-4 text-body-sm text-fg-secondary transition-[background-color,color] duration-fast ease-out-quint hover:text-fg data-[pressed]:bg-base data-[pressed]:text-fg data-[pressed]:shadow-card"
              >
                {label}
              </Toggle>
            ))}
          </ToggleGroup>
        ) : (
          <span />
        )}
        <Link
          href={`/3d-models#${model.slug}`}
          className="inline-flex min-h-9 items-center gap-1.5 text-body-sm text-fg-secondary transition-[color] duration-fast ease-out-quint hover:text-fg"
        >
          Усі 3D-моделі
          <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
