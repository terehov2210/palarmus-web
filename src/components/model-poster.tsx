import { modelThumb, type Model3D } from "@/content/models-3d";

/**
 * The model's rendered thumbnail, standing in for the 3D stage until it draws.
 * Light on purpose (no three): it is also the `loading` view of the lazily
 * imported stage, so the picture is there from the first paint and the live
 * model fades in over the same image.
 */
export function ModelPoster({
  model,
  hidden = false,
  status,
}: {
  model: Pick<Model3D, "slug">;
  hidden?: boolean;
  /** Small chip in the corner, e.g. «Завантаження 3D · 40%». */
  status?: string;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a plain poster under a canvas, already sized */}
      <img
        src={modelThumb(model)}
        alt=""
        aria-hidden="true"
        decoding="async"
        className={`pointer-events-none absolute inset-0 size-full object-contain p-[8%] transition-[opacity,filter] duration-500 ease-out-quint ${
          hidden ? "opacity-0 blur-sm" : "opacity-100"
        }`}
      />
      {status ? (
        <p
          role="status"
          className="pointer-events-none absolute top-4 right-4 flex items-center gap-2 rounded-pill bg-(--stage-chip) px-3 py-1 text-label text-(--stage-ink) backdrop-blur-md"
        >
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-current opacity-70" />
          {status}
        </p>
      ) : null}
    </>
  );
}
