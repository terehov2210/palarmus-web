"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@base-ui/react/button";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Plus, X } from "lucide-react";

import {
  heroModels,
  hotspotKindLabel,
  type HeroModelSpec,
  type Hotspot,
} from "@/content/hero-models";

const FOV = 26;
/** Breathing room around the framed box. */
const MARGIN = 1.04;

/** rad/s of phase — one there-and-back every ~40s, easing at both ends. */
const SWEEP_RATE = 0.157;
/** How briskly a hand-turned model settles back onto the sweep. */
const REJOIN_RATE = 1.6;
/** Fraction of a flick's speed surviving one second. */
const FRICTION = 0.02;
/** Exponential approach rate when the model turns to present a marker. */
const TURN_RATE = 7;
/** Radians per pixel of horizontal drag. */
const DRAG_RATE = 0.008;
/** Pointer travel that turns a press into a drag rather than a click. */
const DRAG_SLOP = 6;
/** id of the single detail panel, wired to the legend via aria-controls. */
export const PANEL_ID = "hero-model-panel";

/**
 * How far a hotspot has to be turned towards the camera to register.
 *
 * A dot is drawn as soon as its part starts coming round, is at full strength
 * once it is properly facing, and is hit-testable over exactly the range where
 * it is visible. Fading them out at all is what keeps the frame legible: two
 * hotspots on the same line of sight — the ceramic head and the greater
 * trochanter, seen edge-on at 91° — project to within 3px of each other, and
 * the far one of the pair is genuinely behind the near one.
 */
const FADE_IN = 0.06;
const FADE_FULL = 0.3;
const HIT_FLOOR = 0.1;

/** How much of the generated environment the material reflects back. */
const ENV_INTENSITY = 1.5;
/**
 * Neutral tone mapping (Khronos PBR Neutral) holds hue and saturation where
 * ACES pushes the warm bone texture towards bronze, so the extra brightness is
 * bought with exposure rather than by swapping the curve.
 */
const EXPOSURE = 1.06;

type Spin = {
  angle: number;
  velocity: number;
  /** Non-null while animating to a landmark's azimuth. */
  target: number | null;
  /** Sweep phase. `angle` follows sin(phase) whenever nothing else drives it. */
  phase: number;
  /** Centre and half-width of the current model's sweep, in radians. */
  mid: number;
  amp: number;
  /** Sweep suspended: pointer inside, panel open, or mid-drag. */
  held: boolean;
  /** A finger is on it, so the move handler owns `angle` this frame. */
  dragging: boolean;
  /** False under a reduce-motion preference: it then never moves by itself. */
  sweeping: boolean;
};

/** The sweep state a model opens in: at `start`, heading towards `max`. */
function restSpin(model: HeroModelSpec): Pick<Spin, "angle" | "phase" | "mid" | "amp"> {
  const { min, max, start } = model.sweep;
  const mid = (min + max) / 2;
  const amp = (max - min) / 2;
  return {
    angle: start,
    // The phase whose sine is the starting angle. `asin` returns the rising
    // quarter of the cycle, so the model's first move is always towards `max`.
    phase: Math.asin(Math.min(1, Math.max(-1, (start - mid) / amp))),
    mid,
    amp,
  };
}

/** Puts the sweep back in step with wherever the model has ended up. */
function rejoin(state: Spin) {
  const offset = (state.angle - state.mid) / state.amp;
  const asin = Math.asin(Math.min(1, Math.max(-1, offset)));
  // Keep going the way the sweep was already going, so rejoining never reads
  // as the model changing its mind.
  state.phase = Math.cos(state.phase) >= 0 ? asin : Math.PI - asin;
}

/** `hover` is -1 for "pointer inside the frame but not on a marker". */
type Ui = { active: number | null; hover: number | null };

/** The azimuth at which a hotspot's `facing` vector points at the camera. */
function presentAngle(hotspot: Hotspot, current: number) {
  const want = -Math.atan2(hotspot.facing[0], hotspot.facing[2]);
  const turn = Math.PI * 2;
  // Pick the revolution nearest the current angle, so the model never takes
  // the long way round to a marker two degrees away.
  return want + Math.round((current - want) / turn) * turn;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function Specimen({ url }: { url: string }) {
  // useDraco=false is deliberate: drei's default points DRACOLoader at
  // gstatic.com. Both assets are EXT_meshopt_compression, and MeshoptDecoder
  // ships inside the bundle, so nothing is fetched from a third party.
  const { scene } = useGLTF(url, false, true);

  const model = useMemo(() => {
    const root = scene.clone(true);

    // The asset ships one material with a metallicRoughness map and both
    // factors left at the glTF default of 1, which means the cup and the stem
    // are true metal: direct lights give them almost no diffuse, and nearly
    // everything they show is a reflection of the environment. Turning that
    // reflection up is what makes the construction read as polished rather
    // than as a dark grey shape — no amount of extra lamps does it.
    //
    // `clone(true)` shares materials with the cached GLTF, so this clones the
    // material as well rather than reaching back into the loader's cache.
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = (mesh.material as THREE.MeshStandardMaterial).clone();
      material.envMapIntensity = ENV_INTENSITY;
      mesh.material = material;
    });

    return root;
  }, [scene]);

  return <primitive object={model} />;
}

/** Mounts only once the GLTF has resolved, which is what "loaded" means here. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

/**
 * Frames a model's `frame` box for whatever aspect the canvas ends up at.
 *
 * The top edge is pinned rather than the centre: a taller box should reveal
 * more femur — or more sacrum — below, not open a gap above the specimen.
 *
 * This sits inside the Suspense boundary on purpose. Framing is a property of
 * the model being shown, so it has to commit at the same moment the geometry
 * does; outside, the camera would jump to the new model's box while the old one
 * was still the thing on screen.
 */
function Frame({ frame }: { frame: HeroModelSpec["frame"] }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useEffect(() => {
    const aspect = width / Math.max(height, 1);
    const t = Math.tan((FOV * Math.PI) / 360);
    const distance = Math.max(
      (frame.halfHeight * MARGIN) / t,
      (frame.halfWidth * MARGIN) / (t * aspect),
    );
    const y = frame.halfHeight * MARGIN - distance * t;

    camera.fov = FOV;
    camera.near = 0.05;
    camera.far = 20;
    camera.position.set(0, y, distance);
    camera.lookAt(0, y, 0);
    camera.updateProjectionMatrix();
  }, [camera, width, height, frame]);

  return null;
}

type SceneProps = {
  model: HeroModelSpec;
  spin: React.RefObject<Spin>;
  ui: React.RefObject<Ui>;
  markers: React.RefObject<(HTMLDivElement | null)[]>;
};

/**
 * Rotation and marker projection, in that order, inside one frame callback.
 *
 * The dots are ordinary DOM buttons in a layer over the canvas rather than
 * `<Html>` children of the scene, so they are styled by the same tokens as the
 * rest of the page. Their transforms are written straight to the nodes — six
 * elements moving every frame is not something React state should be asked to
 * do.
 */
function Scene({ model, spin, ui, markers }: SceneProps) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const scratch = useMemo(
    () => ({
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      toCamera: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    const state = spin.current;
    if (!state) return;
    // A backgrounded tab hands back one enormous delta on return; without the
    // clamp the model lurches through a third of a turn on refocus.
    const delta = Math.min(rawDelta, 0.05);

    if (state.target !== null) {
      state.velocity = 0;
      state.angle +=
        (state.target - state.angle) * (1 - Math.exp(-TURN_RATE * delta));
      if (Math.abs(state.target - state.angle) < 0.0015) {
        state.angle = state.target;
        state.target = null;
        rejoin(state);
      }
    } else {
      // Mid-drag the move handler is already writing `angle` from the pointer;
      // integrating the velocity it recorded as well would move it twice.
      if (!state.dragging) state.angle += state.velocity * delta;
      state.velocity *= Math.pow(FRICTION, delta);
      if (state.velocity !== 0 && Math.abs(state.velocity) < 0.002) {
        state.velocity = 0;
        rejoin(state);
      }

      if (state.sweeping && !state.held && state.velocity === 0) {
        state.phase += SWEEP_RATE * delta;
        const sweep = state.mid + state.amp * Math.sin(state.phase);
        // Equality is the common case and costs nothing; the easing only shows
        // when a drag has left the model outside the swept arc.
        state.angle += (sweep - state.angle) * (1 - Math.exp(-REJOIN_RATE * delta));
      }
    }

    if (outer.current) outer.current.rotation.y = state.angle;

    const group = inner.current;
    const nodes = markers.current;
    const pinned = ui.current;
    if (!group || !nodes || !pinned) return;
    group.updateWorldMatrix(true, false);

    for (let i = 0; i < model.hotspots.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      const hotspot = model.hotspots[i];

      scratch.point.set(...hotspot.position).applyMatrix4(group.matrixWorld);
      scratch.normal
        .set(...hotspot.facing)
        .transformDirection(group.matrixWorld);
      scratch.toCamera.copy(camera.position).sub(scratch.point).normalize();
      const facing = scratch.normal.dot(scratch.toCamera);

      scratch.point.project(camera);
      const x = (scratch.point.x * 0.5 + 0.5) * size.width;
      const y = (-scratch.point.y * 0.5 + 0.5) * size.height;

      // A marker being read or pointed at stays at full strength even when the
      // part it names has turned away, so a dot never dims out from under the
      // cursor mid-click.
      const forced = pinned.active === i || pinned.hover === i;
      const shown = forced ? 1 : smoothstep(FADE_IN, FADE_FULL, facing);

      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      node.style.opacity = shown.toFixed(3);
      // Anything the eye can see, the pointer can hit. These were once two
      // different thresholds, which left a band where a half-lit dot looked
      // clickable and was not — and because a dead dot cannot be hovered
      // either, it could not light itself up to escape that band.
      node.style.pointerEvents = shown > HIT_FLOOR ? "auto" : "none";

      const side = x > size.width * 0.5 ? "start" : "end";
      if (node.dataset.side !== side) node.dataset.side = side;
    }
  });

  return (
    <group ref={outer}>
      <group ref={inner} position={[0, -model.frame.y, 0]}>
        <Specimen url={model.url} />
      </group>
    </group>
  );
}

/**
 * One panel in a fixed slot rather than a popover pinned to the marker.
 *
 * A card anchored to the dot had nowhere to go: the model fills the middle of
 * the frame, so opening outward covered the construction the card was
 * describing, and opening inward ran off the edge of the art. In a fixed slot
 * it lands in the same place every time, and the model turning to face the
 * reader is what carries the connection back to the dot.
 *
 * `HeroArt` decides where that slot is, because the answer differs by layout:
 * on desktop the art is tall enough to give up a corner, and on a phone it is
 * not — there the panel goes below the frame, where it hides nothing.
 */
export function HotspotCard({
  hotspot,
  onClose,
  className,
}: {
  hotspot: Hotspot;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div
      id={PANEL_ID}
      data-hotspot-ui=""
      className={[
        "pointer-events-auto rounded-card border border-hairline bg-base p-4 shadow-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-label uppercase text-fg-muted">
            {hotspotKindLabel[hotspot.kind]}
          </p>
          <p className="text-h3 text-fg">{hotspot.title}</p>
        </div>
        <Button
          onClick={onClose}
          aria-label="Закрити підказку"
          className="-me-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted transition-[background-color,color,scale] duration-fast ease-out-quint hover:bg-raised hover:text-fg active:scale-[0.94]"
        >
          <X aria-hidden="true" size={15} strokeWidth={2} />
        </Button>
      </div>
      <p className="mt-2 text-caption text-fg-muted">{hotspot.meta}</p>
      <p className="mt-3 text-body-sm text-pretty text-fg-secondary">
        {hotspot.body}
      </p>
    </div>
  );
}

/**
 * Which specimen the frame is showing.
 *
 * A segmented control rather than a pair of loose chips, because the two are
 * mutually exclusive views of the same frame and nothing else on the page reads
 * that way. It is the only control here that changes what is being looked at
 * rather than what is being said about it, so it sits at the top of the frame,
 * away from the landmark chips at the bottom.
 *
 * Pointing at an option starts fetching that model. The second GLB is 1.7MB and
 * is deliberately not preloaded — most readers never switch — so without this
 * the first switch is a second of empty frame. `preload` is idempotent and
 * cached, so hovering the pair repeatedly costs one request.
 */
export function ModelSwitch({
  models,
  active,
  onSelect,
  className,
}: {
  models: HeroModelSpec[];
  active: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  const prefetch = (index: number) => {
    useGLTF.preload(models[index].url, false, true);
  };

  return (
    <ToggleGroup
      aria-label="Модель у кадрі"
      data-hotspot-ui=""
      // Single-select, and never empty: pressing the model already in the
      // frame would otherwise un-press it and leave the switch with no value.
      value={[models[active].id]}
      onValueChange={(next) => {
        const index = models.findIndex((m) => m.id === next[0]);
        if (index >= 0) onSelect(index);
      }}
      className={[
        // `self-start` because below `lg` this sits in a stretching flex column,
        // where an inline-flex still fills the width and leaves the pair of
        // options floating in a pill twice their size.
        "pointer-events-auto inline-flex self-start gap-0.5 rounded-control border border-hairline-strong bg-base/85 p-0.5 backdrop-blur-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {models.map((model, index) => (
        <Toggle
          key={model.id}
          value={model.id}
          onPointerEnter={() => prefetch(index)}
          onFocus={() => prefetch(index)}
          className="inline-flex h-8 items-center rounded-control px-3 text-caption text-fg-secondary transition-[background-color,color,scale] duration-fast ease-out-quint hover:bg-raised hover:text-fg active:scale-[0.96] data-pressed:bg-accent-solid data-pressed:font-semibold data-pressed:text-on-accent data-pressed:hover:bg-accent-solid"
        >
          {model.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

/**
 * The landmarks as a list, in the slot the panel will occupy.
 *
 * The dots on the model cannot be the only way in. The bounded sweep keeps
 * nearly every one of them live nearly all the time, but "nearly" is not a
 * thing to build the only route to the content on: a dot moves while you reach
 * for it, and the greater trochanter really is behind the femur for part of the
 * arc. Showing them all regardless is not the fix either — two of them sit on
 * the same line of sight at 91° and land 3px apart.
 *
 * So this is the stable, complete route, and the dots are the spatial one. It
 * also answers a question the frame otherwise cannot: how many of these there
 * are, and what they are.
 */
export function HotspotLegend({
  ref,
  hotspots,
  active,
  onActivate,
  className,
}: {
  ref?: React.Ref<HTMLDivElement>;
  hotspots: Hotspot[];
  active: number | null;
  onActivate: (index: number) => void;
  className?: string;
}) {
  return (
    <div
      ref={ref}
      className={["flex flex-col items-start gap-2", className]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="rounded-control bg-base/85 px-2 py-1 text-label uppercase text-fg-muted backdrop-blur-sm">
        Потягніть, щоб обертати
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {hotspots.map((hotspot, index) => (
          <li key={hotspot.id}>
            <Button
              data-hotspot-ui=""
              aria-expanded={active === index}
              aria-controls={PANEL_ID}
              onClick={() => onActivate(index)}
              // Every chip carries its own ground: on desktop this cluster sits
              // over the render, where `fg-secondary` on bone measured nowhere
              // near 4.5:1.
              className={`inline-flex h-8 items-center rounded-control border px-2.5 text-caption backdrop-blur-sm transition-[background-color,border-color,color,scale] duration-fast ease-out-quint active:scale-[0.96] ${
                active === index
                  ? "border-transparent bg-accent-solid text-on-accent"
                  : hotspot.kind === "implant"
                    ? "border-accent-line/60 bg-base/85 font-semibold text-fg hover:bg-accent-tint"
                    : "border-hairline-strong bg-base/85 text-fg-secondary hover:bg-base hover:text-fg"
              }`}
            >
              {hotspot.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Progress() {
  const { active, progress } = useProgress();
  if (!active) return null;

  // Centred rather than along the bottom edge, which is where the landmark
  // chips live. On the first load that edge is empty and either would do, but a
  // model swap leaves the legend up — see `HeroArt` — and the two would sit on
  // top of each other. The middle of the frame is also where the model is about
  // to appear, which is the more useful thing for the line to be pointing at.
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <BaseProgress.Root
        value={Math.round(progress)}
        aria-label="Завантаження 3D-моделі"
        className="flex items-center gap-3 rounded-control bg-base/85 px-3 py-1.5 backdrop-blur-sm"
      >
        <BaseProgress.Track className="block h-px w-20 overflow-hidden bg-hairline-strong">
          <BaseProgress.Indicator className="block h-full bg-accent-line transition-[width] duration-200 ease-out" />
        </BaseProgress.Track>
        <BaseProgress.Value className="text-label tabular-nums text-fg-muted" />
      </BaseProgress.Root>
    </div>
  );
}

/**
 * The hero's 3D model with labelled anatomy.
 *
 * Interaction, and what each rule protects:
 *  - It turns by itself, slowly, and stops the moment the pointer is inside —
 *    so nothing has to be chased to be clicked.
 *  - Horizontal drag spins it, with inertia. `touch-action: pan-y` leaves
 *    vertical scrolling to the browser, which is the whole reason this does
 *    not use OrbitControls: a hero that eats the first swipe, or the first
 *    turn of the wheel, is a hero nobody gets past. There is no zoom either.
 *  - Opening a landmark turns the model until that part faces the reader and
 *    holds it there while the panel is open. Dragging closes the panel rather
 *    than towing it around.
 *  - Under a reduce-motion preference it never moves on its own. Drag and the
 *    dots still work; the turn-to-present becomes an instant cut.
 *
 * The dots are a pointer affordance, not the interface: they are `aria-hidden`
 * and out of the tab order, because a moving target that can be occluded by the
 * model in front of it is not a control to hand a keyboard user.
 * `HotspotLegend` is the accessible route, and it names the same landmarks from
 * a position that holds still.
 *
 * Which one is open is a prop rather than local state: the panel has to be able
 * to live outside the frame on a narrow viewport, so its owner is `HeroArt`.
 * Which specimen is in the frame is a prop for the same reason. Rotation and
 * drag are nobody else's business.
 *
 * Swapping specimens is a plain swap, not a crossfade: the geometry suspends,
 * the frame empties, the progress line appears, the new one arrives. Holding
 * the old model on screen through a transition would mean holding its markers,
 * its legend and its camera box too — six dots labelling a specimen that is
 * being replaced. drei caches the GLTF, so this only ever happens once per
 * model, and `ModelSwitch` prefetches on hover so usually not even then.
 */
export function HeroModel({
  model,
  onLoaded,
  active,
  onActivate,
}: {
  model: HeroModelSpec;
  onLoaded?: () => void;
  active: number | null;
  onActivate: (index: number | null) => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  const spin = useRef<Spin>({
    ...restSpin(model),
    velocity: 0,
    target: null,
    held: false,
    dragging: false,
    sweeping: true,
  });
  const ui = useRef<Ui>({ active: null, hover: null });
  const drag = useRef({ id: -1, x: 0, time: 0, travel: 0 });

  const [visible, setVisible] = useState(false);

  // A new specimen gets its own sweep, and starts at rest in it. Without this
  // the spine would open at the hip's azimuth — which for the spine is the flat
  // posterior view — and then swing a hundred degrees to reach its own arc.
  useEffect(() => {
    Object.assign(spin.current, restSpin(model), {
      velocity: 0,
      target: null,
    });
    markers.current.length = model.hotspots.length;
  }, [model]);

  const hold = useCallback(() => {
    spin.current.held =
      ui.current.active !== null ||
      ui.current.hover !== null ||
      drag.current.id !== -1;
  }, []);

  const present = useCallback(
    (index: number) => {
      const state = spin.current;
      const to = presentAngle(model.hotspots[index], state.angle);
      // No reduce-motion exemption for the turn itself — the model still has to
      // end up showing the part being named. It just gets there instantly.
      if (state.sweeping) {
        state.target = to;
      } else {
        state.angle = to;
        state.target = null;
        rejoin(state);
      }
      state.velocity = 0;
    },
    [model],
  );

  const close = useCallback(() => onActivate(null), [onActivate]);

  // Mirrors the controlled selection into the ref the frame callback reads, and
  // turns the model to whatever just opened. Doing it here rather than in a
  // click handler is what makes the legend work: a landmark opened by name gets
  // exactly the same turn as one opened by its dot.
  useEffect(() => {
    ui.current.active = active;
    hold();
    if (active !== null) present(active);
  }, [active, hold, present]);

  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;

    // WebGL keeps drawing while scrolled past otherwise, and this sits at the
    // top of the page — the one place a reader is guaranteed to leave behind.
    const io = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? false),
      { rootMargin: "150px 0px" },
    );
    io.observe(node);

    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      spin.current.sweeping = !query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Markers and cards are targets, not drag handles. Starting a drag from
    // one would also retarget the follow-up `click` to this wrapper via
    // pointer capture, which is exactly how a tap stops opening anything.
    if ((event.target as HTMLElement).closest("[data-hotspot-ui]")) return;

    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      time: event.timeStamp,
      travel: 0,
    };
    // Capture keeps a fast drag alive past the edge of the frame. It throws if
    // the pointer is already gone, which is not a reason to lose the drag.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* the move handler works without it, just not off-element */
    }
    spin.current.target = null;
    spin.current.dragging = true;
    hold();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (state.id !== event.pointerId) return;

    const dx = event.clientX - state.x;
    const dt = Math.max(event.timeStamp - state.time, 8) / 1000;
    state.travel += Math.abs(dx);
    state.x = event.clientX;
    state.time = event.timeStamp;

    spin.current.angle += dx * DRAG_RATE;
    spin.current.velocity = (dx * DRAG_RATE) / dt;

    // Steering it means the reader is done with whatever was open — and a panel
    // whose model is being spun out from under it describes nothing.
    if (state.travel > DRAG_SLOP && ui.current.active !== null) close();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current.id !== event.pointerId) return;
    drag.current.id = -1;
    // Whatever velocity the last move recorded is now the flick, and the frame
    // callback takes over integrating it — unless the finger came to rest
    // before lifting, in which case that reading is stale and letting it fly
    // would send the model off on a flick the reader had already finished.
    const state = spin.current;
    state.dragging = false;
    if (event.timeStamp - drag.current.time > 120) state.velocity = 0;
    if (Math.abs(state.velocity) < 0.002) {
      state.velocity = 0;
      rejoin(state);
    }
    hold();
  };

  return (
    <div
      ref={wrapper}
      className="absolute inset-0 touch-pan-y select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        if (ui.current.hover === null) ui.current.hover = -1;
        spin.current.held = true;
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        ui.current.hover = null;
        hold();
      }}
    >
      <Canvas
        className="mask-fade-b"
        camera={{ fov: FOV, position: [0, 0, 2] }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          // ACES, the R3F default, pushes the warm bone texture towards
          // bronze. Neutral holds the authored colour.
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: EXPOSURE,
        }}
        frameloop={visible ? "always" : "never"}
      >
        <Suspense fallback={null}>
          <Frame frame={model.frame} />
          <Scene model={model} spin={spin} ui={ui} markers={markers} />
          {onLoaded ? <Ready onReady={onLoaded} /> : null}

          {/* Studio strip lights, deliberately narrow.
              This rig has one material to satisfy and two jobs: the cup and the
              stem are metal, so they show reflections and nothing else, while
              the bone is dielectric and wants directional shading. Both read the
              same `envMapIntensity`, so the split is made by the shape of the
              sources rather than their number. A narrow bright card mirrors as a
              hard streak while adding almost nothing to the overall irradiance;
              a big soft one floods the scene and flattens the bone to beige,
              which is what the first attempt at "brighter" actually did.
              Rendered into a local cubemap — no HDRI download. */}
          <Environment resolution={512}>
            {/* The floor the cards sit on, and the single biggest lever on how
                the hardware reads. A metal shows its environment and nothing
                else, and thin, sharply curved parts — rods, screw shafts —
                sample the whole sphere rather than catching a card the way the
                cup and the stem do. Against the near-black this used to be,
                they came out as silhouettes. Lifting the floor to a mid neutral grey
                is what turns them into steel; the cards still carry the
                highlights, and the bone only warms slightly, since its diffuse
                was always coming from the lamps below. */}
            <color attach="background" args={["#55585c"]} />
            {/* Key strip, overhead and forward: the top highlight on the cup. */}
            <Lightformer
              intensity={5}
              position={[0.4, 3.2, 2.4]}
              scale={[3.4, 1.6, 1]}
              color="#ffffff"
            />
            {/* Tall narrow strip camera-left, the side the construction is on.
                This is the highlight that runs the length of the stem. */}
            <Lightformer
              intensity={4.4}
              position={[-3.4, 0.8, 2.2]}
              scale={[0.9, 9, 1]}
              color="#ffffff"
            />
            {/* Counter-strip, so the far side of the metal is a reflection
                rather than a flat grey. Faintly warm-red: the hero sits in a
                Venetian Red glow, and the steel should look like it does. */}
            <Lightformer
              intensity={2.4}
              position={[3.4, 0.2, 1.6]}
              scale={[1.1, 7, 1]}
              color="#ffd9db"
            />
            {/* Rim from behind: without it the silhouette dissolves into a
                near-white page as the model turns edge-on. */}
            <Lightformer
              intensity={1.8}
              position={[0, 1.4, -4.2]}
              scale={[5, 3.5, 1]}
              color="#ffffff"
            />
            {/* One small hot source for the glint on the ceramic head — the
                detail that reads as "polished" at a glance. */}
            <Lightformer
              form="circle"
              intensity={9}
              position={[-1.5, 2.3, 2.8]}
              scale={[0.8, 0.8, 1]}
              color="#ffffff"
            />
          </Environment>

          {/* And the bone is lit the ordinary way: a warm key well above the
              ambient, so the texture's own colour survives instead of being
              washed flat. Warm key against cool fill is what makes the render
              look richer than turning everything up ever did. */}
          <ambientLight intensity={0.13} />
          <directionalLight position={[3, 5, 4]} intensity={1.5} color="#fff4e6" />
          <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#f2f2f2" />
          {/* Keeps the far side off pure black as the model turns edge-on. */}
          <directionalLight position={[0, 1, -6]} intensity={0.4} />
        </Suspense>
      </Canvas>

      {/* Marker layer. Each entry is a zero-size anchor carrying the projected
          point, so the dot and its name chip both hang off one transform
          written by the frame callback. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {model.hotspots.map((hotspot, index) => (
          <div
            key={hotspot.id}
            ref={(node) => {
              markers.current[index] = node;
              return () => {
                markers.current[index] = null;
              };
            }}
            data-side="end"
            style={{ opacity: 0 }}
            className="absolute left-0 top-0 will-change-[transform,opacity]"
          >
            {/* Zero-size: its own origin is the projected point. */}
            <div className="hotspot-anchor group/hot">
              {/* Out of the tab order and out of the a11y tree on purpose: the
                  legend names the same six landmarks from a position that holds
                  still. See the component docblock. */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                data-hotspot-ui=""
                onClick={() => {
                  if (active === index) close();
                  else onActivate(index);
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  ui.current.hover = index;
                  spin.current.held = true;
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "mouse") return;
                  if (ui.current.hover === index) ui.current.hover = -1;
                }}
                className={`hotspot-dot grid size-7 place-items-center rounded-full border transition-[background-color,border-color,color,scale] duration-fast ease-out-quint active:scale-[0.9] ${
                  active === index
                    ? "border-transparent bg-accent-solid text-on-accent"
                    : hotspot.kind === "implant"
                      ? "border-accent-line bg-base/85 text-fg-accent backdrop-blur-sm hover:bg-accent-tint"
                      : "border-control-line bg-base/85 text-fg-secondary backdrop-blur-sm hover:bg-raised"
                }`}
              >
                <Plus
                  aria-hidden="true"
                  size={13}
                  strokeWidth={2.5}
                  className={`transition-[rotate] duration-fast ease-out-quint ${
                    active === index ? "rotate-45" : ""
                  }`}
                />
              </button>

              {/* The name on hover. The dot is decorative to assistive tech, so
                  this is too — the legend carries the accessible names. */}
              <span
                aria-hidden="true"
                className={`hotspot-flank pointer-events-none whitespace-nowrap rounded-control bg-base/90 px-2 py-1 text-caption text-fg backdrop-blur-sm transition-[opacity] duration-fast ease-out-quint ${
                  active === index ? "opacity-0" : "opacity-0 group-hover/hot:opacity-100"
                }`}
                style={{ "--flank": "1.25rem" } as React.CSSProperties}
              >
                {hotspot.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Progress />
    </div>
  );
}

// Only the specimen the hero opens on. The other is 1.7MB that most readers
// never ask for; `ModelSwitch` fetches it the moment one of them points at it.
useGLTF.preload(heroModels[0].url, false, true);
