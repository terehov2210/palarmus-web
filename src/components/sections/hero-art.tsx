"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { ArrowUpRight, X } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { skeletonZones, type SkeletonZone } from "@/content/skeleton-zones";
import { supportsWebGL } from "@/lib/webgl";

/**
 * three + R3F are far too heavy to sit in the initial bundle, and WebGL cannot
 * render on the server at all. `ssr: false` needs a client component, which is
 * why this wrapper carries "use client".
 */
const SkeletonModel = dynamic(
  () => import("@/components/skeleton-model").then((m) => m.SkeletonModel),
  { ssr: false },
);

/**
 * Rendered only when WebGL is genuinely unavailable — never as a poster that
 * the model then replaces, which read as the page changing its mind. The probe
 * is synchronous on mount, so on every machine that can render the model this
 * file is never requested.
 */
const FALLBACK = { src: "/brand/hero-joints.webp" };

/** The width at which the hero becomes two columns — `lg` in the theme. */
const SIDE_BY_SIDE = "(min-width: 64rem)";

const PANEL_ID = "hero-zone-panel";

function ZoneCard({
  zone,
  onClose,
  showModelLine,
}: {
  zone: SkeletonZone;
  onClose: () => void;
  showModelLine: boolean;
}) {
  return (
    <div
      id={PANEL_ID}
      data-hotspot-ui=""
      className="pointer-events-auto w-[19rem] max-w-full rounded-card border border-hairline bg-base p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-label uppercase text-fg-muted">{zone.label}</p>
          <p className="text-h3 text-balance text-fg">{zone.title}</p>
        </div>
        <Button
          onClick={onClose}
          aria-label="Закрити зону"
          className="-me-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted transition-[background-color,color,scale] duration-fast ease-out-quint hover:bg-raised hover:text-fg active:scale-[0.94]"
        >
          <X aria-hidden="true" size={15} strokeWidth={2} />
        </Button>
      </div>
      {showModelLine ? (
        <p className="mt-2 text-caption text-fg-muted">На моделі: {zone.shown}</p>
      ) : null}
      <p className="mt-3 text-body-sm text-pretty text-fg-secondary">{zone.body}</p>
      <ButtonLink href={zone.href} variant="secondary" className="mt-4">
        {zone.cta}
        <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2} className="ms-2" />
      </ButtonLink>
    </div>
  );
}

/**
 * The zones as buttons: the stable, complete and accessible route in. The dots
 * on the model are the spatial one, and they move, get occluded and sit behind
 * the figure for half a turn — so they are never the only way to a zone.
 */
function ZoneLegend({
  ref,
  active,
  onActivate,
  onHover,
  hint,
}: {
  ref?: React.Ref<HTMLUListElement>;
  active: string | null;
  onActivate: (zone: string | null) => void;
  onHover: (zone: string | null) => void;
  hint: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      {hint ? (
        <p className="rounded-pill bg-base/70 px-3 py-1 text-label uppercase text-fg-muted ring-1 ring-inset ring-hairline backdrop-blur-md">
          Потягніть, щоб обертати · оберіть зону
        </p>
      ) : null}
      <ul ref={ref} aria-label="Зони на моделі" className="flex flex-wrap gap-1.5">
        {skeletonZones.map((zone) => (
          <li key={zone.id}>
            <Button
              data-hotspot-ui=""
              aria-expanded={active === zone.id}
              aria-controls={PANEL_ID}
              onClick={() => onActivate(active === zone.id ? null : zone.id)}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") onHover(zone.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") onHover(null);
              }}
              // Every chip carries its own ground: on desktop this row sits
              // over the render.
              className={`pointer-events-auto inline-flex h-8 items-center rounded-pill border px-3.5 text-caption backdrop-blur-md transition-[background-color,border-color,color,scale] duration-fast ease-out-quint active:scale-[0.96] ${
                active === zone.id
                  ? "border-transparent bg-accent-solid font-semibold text-on-accent"
                  : "border-hairline bg-raised/70 text-fg-secondary hover:border-hairline-strong hover:bg-raised hover:text-fg"
              }`}
            >
              {zone.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The hero art: the Palarmus skeleton, from the cap to mid-thigh, turning
 * slowly. The zone buttons open a direction of the catalogue: the model turns
 * to it, the camera closes in (down to the knee or the ankle if that is where
 * the construction is), the bones go x-ray and the implant appears.
 *
 * Nothing above the fold waits on WebGL: the hero copy is server-rendered and
 * paints on its own, the 3D chunk and the GLB land whenever they land.
 * `webgl` is tri-state so that neither branch renders during the first tick,
 * which is what stops the fallback flashing before the model.
 *
 * Where the legend and card go is a layout question, so it is answered here:
 * two columns, the frame is a full screen tall and they sit along its bottom
 * edge; one column, the frame is barely taller than the card, so everything
 * goes underneath it instead.
 */
export function HeroArt() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [sideBySide, setSideBySide] = useState(false);
  const legend = useRef<HTMLUListElement>(null);

  // Reading a platform capability, which does not exist during SSR.
  useEffect(() => {
    const probe = () => setWebgl(supportsWebGL());
    probe();
  }, []);

  useEffect(() => {
    const query = window.matchMedia(SIDE_BY_SIDE);
    const sync = () => setSideBySide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const onLoaded = useCallback(() => setLoaded(true), []);

  /**
   * The one way in and out — a chip, a dot on the model, the card's close
   * button and Escape all come through here, so closing from inside the card
   * puts the focus back on the zone's chip rather than on the body.
   */
  const activate = useCallback(
    (next: string | null) => {
      const previous = active;
      setActive(next);
      if (next !== null || previous === null) return;
      const panel = document.getElementById(PANEL_ID);
      if (!panel?.contains(document.activeElement)) return;
      const index = skeletonZones.findIndex((z) => z.id === previous);
      requestAnimationFrame(() => {
        legend.current?.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
      });
    },
    [active],
  );

  // Below `lg` the card opens under the frame, which on a phone can be off the
  // bottom of the screen. `nearest` scrolls only when it actually is.
  const reveal = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, []);

  const zone = skeletonZones.find((z) => z.id === active) ?? null;
  // Without a model the list still leads into the catalogue, card and all.
  const ready = loaded || webgl === false;

  const card = zone ? (
    <div ref={sideBySide ? undefined : reveal}>
      <ZoneCard zone={zone} onClose={() => activate(null)} showModelLine={webgl === true} />
    </div>
  ) : null;
  const zoneLegend = (
    <ZoneLegend ref={legend} active={active} onActivate={activate} onHover={setHover} hint={webgl === true} />
  );

  return (
    <div className="order-2 w-full page-gutter pb-14 lg:absolute lg:inset-y-0 lg:right-0 lg:order-none lg:w-[56%] lg:p-0 lg:ps-[13%]">
      <p className="sr-only">
        Тривимірна модель скелета в червоній кепці Palarmus, від голови до стегон. Оберіть зону, щоб
        побачити, де розташовується імплант, і перейти до розділу каталогу.
      </p>

      <div className="relative aspect-4/5 w-full lg:h-full lg:aspect-auto">
        {webgl === false ? (
          <Image
            src={FALLBACK.src}
            alt=""
            fill
            quality={82}
            sizes="(min-width: 1024px) 43vw, 92vw"
            className="object-cover object-center"
          />
        ) : null}

        {webgl ? (
          <SkeletonModel
            frame="half"
            // On desktop the zone chips take the bottom fifth of the frame.
            lift={sideBySide ? 0.12 : 0}
            // …and the card the top-right corner, so the construction moves left of it.
            shift={sideBySide ? 0.5 : 0}
            className="mask-fade-b"
            active={active}
            hover={hover}
            onActivate={activate}
            onHover={setHover}
            onLoaded={onLoaded}
          />
        ) : null}

        {ready && sideBySide ? (
          <>
            {/* The card goes in the top-right corner; the camera moves the
                construction it describes to the left of it, above the chips. */}
            {card ? <div className="pointer-events-none absolute end-8 top-8">{card}</div> : null}
            <div className="pointer-events-none absolute inset-x-8 bottom-8">{zoneLegend}</div>
          </>
        ) : null}
      </div>

      {ready && !sideBySide ? (
        <div className="mt-3 flex flex-col gap-3">
          {zoneLegend}
          {card}
        </div>
      ) : null}
    </div>
  );
}
