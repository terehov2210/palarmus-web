"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { Progress as BaseProgress } from "@base-ui/react/progress";

import { STUDIO_HDR_URL } from "@/components/skeleton-materials";
import { modelUrl, type Model3D } from "@/content/models-3d";

const FOV = 26;
/** Room around the model: enough air that it never touches the edge mid-turn,
    little enough that the part, not the tile, fills the frame. */
const MARGIN = 1.12;
/** rad/s of the idle turn. */
const SPIN_RATE = 0.45;
/** Radians per pixel of horizontal drag. */
const DRAG_RATE = 0.008;
/** Fraction of a flick's speed surviving one second. */
const FRICTION = 0.02;
/** After a drag, the model rests this long before it turns by itself again. */
const RESUME_AFTER = 2.5;
/** Slightly above and to the right of the model, so faces and edges both read. */
const VIEW = new THREE.Vector3(0.18, 0.12, 1).normalize();
/** Lengths the scale bar may name, in millimetres. */
const SCALE_STEPS = [1, 2, 5, 10, 20, 50, 100];
/** The bar is never drawn shorter than this, in CSS pixels. */
const SCALE_MIN_PX = 56;

type Spin = {
  /** Turn about the vertical axis: the idle spin for "y" models, and every drag. */
  yaw: number;
  /** Turn about the model's own length: the idle spin for "x" models. */
  roll: number;
  velocity: number;
  dragging: boolean;
  /** Seconds left before the idle spin resumes after a drag. */
  rest: number;
  /** False under a reduce-motion preference: it then never moves by itself. */
  idle: boolean;
};

type View = { distance: number };

/**
 * One model, posed and centred. The pose is applied before the bounding box is
 * taken, so the box is that of what the reader sees and the model turns about
 * its own middle rather than about wherever the GLB's origin happens to be (the
 * centre of a femoral head, the tip of a screw).
 */
function Specimen({
  model,
  spinRef,
  viewRef,
}: {
  model: Model3D;
  spinRef: React.RefObject<Spin>;
  viewRef: React.RefObject<View>;
}) {
  const { scene } = useGLTF(modelUrl(model), false, true);
  const yaw = useRef<THREE.Group>(null);
  const roll = useRef<THREE.Group>(null);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  const posed = useMemo(() => {
    const group = new THREE.Group();
    group.add(scene.clone(true));
    group.rotation.set(...(model.pose.map(THREE.MathUtils.degToRad) as [number, number, number]));
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    group.position.sub(box.getCenter(new THREE.Vector3()));
    return { group, size: box.getSize(new THREE.Vector3()) };
  }, [scene, model.pose]);

  // Framing. A model that rolls about its length sweeps a circle across it, and
  // one that turns on the spot sweeps one in plan, so the box is widened to
  // that circle; otherwise a flat part would grow out of the frame mid-turn.
  const distance = useMemo(() => {
    const { size } = posed;
    const across = model.spin === "x" ? Math.max(size.y, size.z) : Math.max(size.x, size.z);
    const w = model.spin === "x" ? size.x : across;
    const h = model.spin === "x" ? across : size.y;
    const t = Math.tan((FOV * Math.PI) / 360);
    const aspect = width / Math.max(height, 1);
    return Math.max(h / 2 / t, w / 2 / (t * aspect)) * MARGIN + Math.max(size.x, size.z) / 2;
  }, [posed, model.spin, width, height]);

  useFrame(({ camera }, rawDelta) => {
    // The camera is placed here rather than in an effect: it belongs to the
    // renderer, and the frame callback is where R3F hands it over to be moved.
    const view = viewRef.current;
    if (view.distance !== distance) {
      const lens = camera as THREE.PerspectiveCamera;
      lens.fov = FOV;
      lens.near = distance / 100;
      lens.far = distance * 10;
      lens.position.copy(VIEW).multiplyScalar(distance);
      lens.lookAt(0, 0, 0);
      lens.updateProjectionMatrix();
      view.distance = distance;
    }

    const state = spinRef.current;
    // A backgrounded tab hands back one enormous delta on return.
    const delta = Math.min(rawDelta, 0.05);

    if (!state.dragging) {
      state.yaw += state.velocity * delta;
      state.velocity *= Math.pow(FRICTION, delta);
      if (Math.abs(state.velocity) < 0.002) state.velocity = 0;
      state.rest = Math.max(0, state.rest - delta);
      if (state.idle && state.velocity === 0 && state.rest === 0) {
        if (model.spin === "x") state.roll += SPIN_RATE * delta;
        else state.yaw += SPIN_RATE * delta;
      }
    }

    if (yaw.current) yaw.current.rotation.y = state.yaw;
    if (roll.current) roll.current.rotation.x = state.roll;
  });

  return (
    <group ref={yaw}>
      <group ref={roll}>
        <primitive object={posed.group} />
      </group>
    </group>
  );
}

/**
 * The scale bar measures at the model's centre, which is where the camera
 * looks. It is written straight to the DOM every frame — the width changes with
 * the frame size and the model, and neither is worth a React render.
 */
function ScaleWriter({
  barRef,
  labelRef,
  viewRef,
}: {
  barRef: React.RefObject<HTMLSpanElement | null>;
  labelRef: React.RefObject<HTMLSpanElement | null>;
  viewRef: React.RefObject<View>;
}) {
  const height = useThree((state) => state.size.height);
  const last = useRef("");

  useFrame(() => {
    const distance = viewRef.current.distance;
    const bar = barRef.current;
    const label = labelRef.current;
    if (!distance || !bar || !label) return;
    // GLB units are metres.
    const pxPerMm = height / 2 / (distance * Math.tan((FOV * Math.PI) / 360)) / 1000;
    const mm = SCALE_STEPS.find((n) => n * pxPerMm >= SCALE_MIN_PX) ?? SCALE_STEPS.at(-1)!;
    const key = `${mm}:${Math.round(mm * pxPerMm)}`;
    if (key === last.current) return;
    last.current = key;
    bar.style.width = `${Math.round(mm * pxPerMm)}px`;
    label.textContent = `${mm} мм`;
  });

  return null;
}

function Progress() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <BaseProgress.Root
        value={Math.round(progress)}
        aria-label="Завантаження 3D-моделі"
        className="flex items-center gap-3 rounded-pill bg-base/85 px-3 py-1.5 ring-1 ring-inset ring-hairline backdrop-blur-sm"
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
 * The showcase stage: one implant on the studio tile, turning slowly.
 *
 * Horizontal drag turns it, with inertia; `touch-action: pan-y` leaves vertical
 * scrolling to the browser, and there is no wheel zoom, for the same reason as
 * in the hero — a frame that eats the scroll is one nobody gets past. Long,
 * thin parts lie across the frame and roll about their own length, so a screw
 * shows its whole thread instead of swinging end-on to the camera.
 *
 * Swapping models is a plain swap: the geometry suspends, the progress line
 * shows, the new one arrives framed. drei caches every GLB, so going back to a
 * model already seen is instant.
 */
export function ModelStage({ model }: { model: Model3D }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const spin = useRef<Spin>({ yaw: 0, roll: 0, velocity: 0, dragging: false, rest: 0, idle: true });
  const view = useRef<View>({ distance: 0 });
  const drag = useRef({ id: -1, x: 0, time: 0 });
  const [visible, setVisible] = useState(false);

  // Every model opens at its own front view.
  useEffect(() => {
    Object.assign(spin.current, { yaw: 0, roll: 0, velocity: 0, rest: 0 });
  }, [model]);

  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
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
      spin.current.idle = !query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, time: event.timeStamp };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* the move handler works without it, just not off-element */
    }
    spin.current.dragging = true;
    spin.current.velocity = 0;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dt = Math.max(event.timeStamp - state.time, 8) / 1000;
    state.x = event.clientX;
    state.time = event.timeStamp;
    spin.current.yaw += dx * DRAG_RATE;
    spin.current.velocity = (dx * DRAG_RATE) / dt;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current.id !== event.pointerId) return;
    drag.current.id = -1;
    const state = spin.current;
    state.dragging = false;
    // A finger that came to rest before lifting has finished its flick.
    if (event.timeStamp - drag.current.time > 120) state.velocity = 0;
    state.rest = RESUME_AFTER;
  };

  return (
    <div
      ref={wrapper}
      className="absolute inset-0 cursor-grab touch-pan-y select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Canvas
        camera={{ fov: FOV, position: [0, 0, 1] }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.06 }}
        frameloop={visible ? "always" : "never"}
      >
        {/* The hero's photo studio: real softboxes for the metal to mirror. */}
        <Suspense fallback={null}>
          <Environment files={STUDIO_HDR_URL} environmentIntensity={1.1} />
        </Suspense>
        {/* Shaping for the rough finishes — plasma spray, trabecular titanium,
            PEEK — which take little from a reflection and go flat without it. */}
        <hemisphereLight args={["#ffffff", "#2a2a2c", 0.5]} />
        <directionalLight position={[-1.5, 2.2, 3]} intensity={1.1} color="#fff4e8" />
        <directionalLight position={[2.5, 0.5, -2.5]} intensity={0.6} color="#ffd9db" />
        <Suspense fallback={null}>
          <Specimen key={model.slug} model={model} spinRef={spin} viewRef={view} />
        </Suspense>
        <ScaleWriter barRef={bar} labelRef={label} viewRef={view} />
      </Canvas>

      {/* The stage is dark in both themes (see `.product-stage`), so the
          overlay takes the stage's own ink rather than the page's. */}
      <p className="pointer-events-none absolute top-4 left-4 rounded-pill bg-(--stage-chip) px-3 py-1 text-label uppercase text-(--stage-ink) backdrop-blur-md">
        Потягніть, щоб обертати
      </p>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1.5">
        <span
          ref={bar}
          className="block h-2 w-14 border-x-[1.5px] border-b-[1.5px] border-(--stage-ink) transition-[width] duration-medium ease-out-quint"
        />
        <span ref={label} className="text-label tabular-nums text-(--stage-ink)">
          10 мм
        </span>
      </div>

      <Progress />
    </div>
  );
}
