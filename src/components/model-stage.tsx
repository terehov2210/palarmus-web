"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { Layers, Maximize2, Minimize2, Minus, Moon, Plus, RotateCcw, Sun } from "lucide-react";

import { STUDIO_HDR_URL } from "@/components/skeleton-materials";
import { ModelPoster } from "@/components/model-poster";
import { modelUrl, previewUrl, type Model3D } from "@/content/models-3d";

const FOV = 26;
/** Room around the model: enough air that it never touches the edge mid-turn,
    little enough that the part, not the tile, fills the frame. */
const MARGIN = 1.12;
/** rad/s of the idle turn. */
const SPIN_RATE = 0.45;
/** Radians per pixel of drag. */
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
/** Tilt limit (mouse drag up / down), radians. */
const PITCH_MAX = 1.1;
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 4;
/** How far the farthest part travels in the exploded view, as a fraction of the model's size. */
const EXPLODE_REACH = 0.4;
/** The camera backs off this much more at full explode, so the spread parts stay in frame. */
const EXPLODE_BACKOFF = 0.95;

/** Ukrainian names for the parts (GLB node names, see implants-3d). */
const PART_NAMES: Record<string, string> = {
  stem: "Ніжка",
  head: "Головка",
  liner: "Вкладиш",
  cup: "Чашка",
  tray: "Тибіальна платформа",
  insert: "Поліетиленовий вкладиш",
  femoral: "Стегновий компонент",
  nail: "Стрижень",
  end_cap: "Заглушка",
  neck_screw: "Шийковий гвинт",
  compression_screw: "Компресійний гвинт",
  lock_screw: "Блокуючий гвинт",
  handle: "Рукоятка",
  collar: "Муфта",
  slider: "Повзунок",
  wing: "Упор глибини",
  sheath: "Тубус",
  needle: "Голка",
};
const partName = (node: string, fallback: string) =>
  // three drops the dot of Blender suffixes on load: "cup.003" arrives as "cup003"
  PART_NAMES[node] ?? PART_NAMES[node.replace(/[._]?\d+$/, "")] ?? fallback;

type Spin = {
  /** Turn about the vertical axis: the idle spin for "y" models, and every drag. */
  yaw: number;
  /** Turn about the model's own length: the idle spin for "x" models. */
  roll: number;
  /** Tilt towards / away from the viewer (mouse drag up / down). */
  pitch: number;
  velocity: number;
  dragging: boolean;
  /** Seconds left before the idle spin resumes after a drag. */
  rest: number;
  /** False under a reduce-motion preference: it then never moves by itself. */
  idle: boolean;
  /** Paused by the reader (hovering a part, or the exploded view). */
  hold: boolean;
};

type View = { distance: number; zoom: number; applied: number };

type Part = {
  object: THREE.Object3D;
  name: string;
  base: THREE.Vector3;
  offset: THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
};

/**
 * One model, posed and centred. The pose is applied before the bounding box is
 * taken, so the box is that of what the reader sees and the model turns about
 * its own middle rather than about wherever the GLB's origin happens to be (the
 * centre of a femoral head, the tip of a screw).
 *
 * Every root node of the GLB is a part (stem, head, liner, cup; nail and screws…).
 * The exploded view moves each part away from the largest one along the line
 * between their centres; parts that share that line (the head, liner and cup of a
 * hip) are staggered by size, so the inner ones stop nearer.
 */
function Specimen({
  model,
  url,
  spinRef,
  viewRef,
  explodeRef,
  onHover,
  onReady,
}: {
  model: Model3D;
  /** The full GLB or its light preview (same model, fewer triangles). */
  url: string;
  spinRef: React.RefObject<Spin>;
  viewRef: React.RefObject<View>;
  explodeRef: React.RefObject<{ target: number; value: number }>;
  onHover: (label: string | null, x: number, y: number) => void;
  /** Called once the model is on screen, with its number of parts. */
  onReady: (parts: number) => void;
}) {
  const { scene } = useGLTF(url, false, true);
  const pitch = useRef<THREE.Group>(null);
  const yaw = useRef<THREE.Group>(null);
  const roll = useRef<THREE.Group>(null);
  const hovered = useRef<Part | null>(null);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  const posed = useMemo(() => {
    const root = scene.clone(true);
    const group = new THREE.Group();
    group.add(root);
    group.rotation.set(...(model.pose.map(THREE.MathUtils.degToRad) as [number, number, number]));
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const centre = box.getCenter(new THREE.Vector3());
    group.position.sub(centre);
    group.updateMatrixWorld(true);
    const size = box.getSize(new THREE.Vector3());

    // parts, each with its own (cloned) materials so it can light up alone
    const parts: Part[] = root.children.map((object) => {
      const materials: THREE.MeshStandardMaterial[] = [];
      object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const cloned = list.map((m) => (m as THREE.MeshStandardMaterial).clone());
        mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
        materials.push(...cloned);
      });
      return { object, name: object.name, base: object.position.clone(), offset: new THREE.Vector3(), materials };
    });

    if (parts.length > 1) {
      const boxes = parts.map((p) => new THREE.Box3().setFromObject(p.object));
      const sizes = boxes.map((b) => b.getSize(new THREE.Vector3()).length());
      const main = sizes.indexOf(Math.max(...sizes));
      const mainCentre = boxes[main].getCenter(new THREE.Vector3());
      const reach = Math.max(size.x, size.y, size.z) * EXPLODE_REACH;
      const others = parts.map((_, i) => i).filter((i) => i !== main).sort((a, b) => sizes[a] - sizes[b]);
      const inverse = new THREE.Matrix4();
      others.forEach((i, rank) => {
        const dir = boxes[i].getCenter(new THREE.Vector3()).sub(mainCentre);
        if (dir.length() < 1e-5) dir.set(0, 1, 0);
        dir.normalize().multiplyScalar(reach * (0.45 + 0.55 * (rank + 1) / others.length));
        // world direction -> the part's parent space (the pose rotates the root)
        inverse.copy(parts[i].object.parent!.matrixWorld).invert();
        const local = dir.clone().transformDirection(inverse).multiplyScalar(dir.length());
        parts[i].offset.copy(local);
      });
    }
    return { group, size, parts };
  }, [scene, model.pose]);

  useEffect(() => onReady(posed.parts.length), [posed, onReady]);

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
    // A backgrounded tab hands back one enormous delta on return.
    const delta = Math.min(rawDelta, 0.05);

    // The camera is placed here rather than in an effect: it belongs to the
    // renderer, and the frame callback is where R3F hands it over to be moved.
    const view = viewRef.current;
    const ex = explodeRef.current;
    ex.value = THREE.MathUtils.damp(ex.value, ex.target, 6, delta);
    const wanted = (distance / view.zoom) * (1 + EXPLODE_BACKOFF * ex.value);
    if (view.distance !== distance || Math.abs(view.applied - wanted) > wanted * 1e-4) {
      const lens = camera as THREE.PerspectiveCamera;
      // ease the zoom; jump on a new model
      const next = view.distance !== distance ? wanted : THREE.MathUtils.damp(view.applied, wanted, 10, delta);
      lens.fov = FOV;
      lens.near = distance / 100;
      lens.far = distance * 10;
      lens.position.copy(VIEW).multiplyScalar(next);
      lens.lookAt(0, 0, 0);
      lens.updateProjectionMatrix();
      view.distance = distance;
      view.applied = next;
    }

    const state = spinRef.current;
    if (!state.dragging) {
      state.yaw += state.velocity * delta;
      state.velocity *= Math.pow(FRICTION, delta);
      if (Math.abs(state.velocity) < 0.002) state.velocity = 0;
      state.rest = Math.max(0, state.rest - delta);
      if (state.idle && !state.hold && state.velocity === 0 && state.rest === 0) {
        if (model.spin === "x") state.roll += SPIN_RATE * delta;
        else state.yaw += SPIN_RATE * delta;
      }
    }

    if (pitch.current) pitch.current.rotation.x = state.pitch;
    if (yaw.current) yaw.current.rotation.y = state.yaw;
    if (roll.current) roll.current.rotation.x = state.roll;

    for (const p of posed.parts) p.object.position.copy(p.base).addScaledVector(p.offset, ex.value);
  });

  const partOf = (object: THREE.Object3D) => {
    let o: THREE.Object3D | null = object;
    while (o) {
      const hit = posed.parts.find((p) => p.object === o);
      if (hit) return hit;
      o = o.parent;
    }
    return null;
  };

  const light = (part: Part | null) => {
    if (hovered.current === part) return;
    for (const m of hovered.current?.materials ?? []) m.emissive?.setScalar(0);
    hovered.current = part;
    for (const m of part?.materials ?? []) m.emissive?.setRGB(0.09, 0.03, 0.03);
  };

  const onMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (spinRef.current.dragging) return;
    const part = partOf(event.object);
    light(part);
    spinRef.current.hold = !!part;
    onHover(part ? partName(part.name, model.short) : null, event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  };

  const onOut = () => {
    light(null);
    spinRef.current.hold = explodeRef.current.target > 0;
    onHover(null, 0, 0);
  };

  return (
    <group ref={pitch}>
      <group ref={yaw}>
        <group ref={roll}>
          <primitive object={posed.group} onPointerMove={onMove} onPointerOut={onOut} />
        </group>
      </group>
    </group>
  );
}

/**
 * The scale bar measures at the model's centre, which is where the camera
 * looks. It is written straight to the DOM every frame — the width changes with
 * the frame size, the model and the zoom, and none is worth a React render.
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
    const distance = viewRef.current.applied;
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

/**
 * What the reader sees while a model loads. The rendered thumbnail is on screen
 * at once (it is the same picture as the card they clicked), with a thin bar
 * along the bottom of the stage; it fades into the live model the moment the
 * first triangles draw. While the light preview stands in for the full model, a
 * small chip says the detail is still coming.
 */
function Loader({ model, stage }: { model: Model3D; stage: StageState }) {
  const { progress } = useProgress();
  const pct = Math.min(99, Math.round(progress));
  return (
    <>
      <ModelPoster
        model={model}
        hidden={stage !== "poster"}
        status={stage === "poster" ? `Завантаження 3D · ${pct}%` : stage === "preview" ? "Деталізація…" : undefined}
      />
      {stage === "poster" ? (
        <BaseProgress.Root
          value={pct}
          aria-label="Завантаження 3D-моделі"
          className="pointer-events-none absolute inset-x-0 bottom-0"
        >
          <BaseProgress.Track className="block h-0.5 w-full overflow-hidden bg-white/[0.06]">
            <BaseProgress.Indicator className="block h-full bg-(--stage-ink) opacity-60 transition-[width] duration-300 ease-out" />
          </BaseProgress.Track>
        </BaseProgress.Root>
      ) : null}
    </>
  );
}

function ToolButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-pill text-(--stage-ink) transition-[background-color,color] duration-fast ease-out-quint hover:bg-(--stage-chip-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line ${
        pressed ? "bg-(--stage-chip-strong)" : ""
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The showcase stage: one implant on the studio tile, turning slowly.
 *
 * Drag turns it, with inertia; with a mouse, dragging up and down also tilts it.
 * `touch-action: pan-y` leaves vertical scrolling to the browser on touch, and
 * the wheel zooms only in full screen — a frame that eats the scroll is one
 * nobody gets past; the +/− buttons zoom everywhere. Long, thin parts lie across
 * the frame and roll about their own length, so a screw shows its whole thread
 * instead of swinging end-on to the camera.
 *
 * Toolbar: explode the assembly into its parts (when it has several), zoom,
 * light / dark stage (dark anodised parts read better on the light one), reset,
 * full screen. Pointing at a part lights it and names it, and stops the turn.
 *
 * Swapping models is a plain swap: the geometry suspends, the progress line
 * shows, the new one arrives framed. drei caches every GLB, so going back to a
 * model already seen is instant.
 */
export type StageState = "poster" | "preview" | "full";

export function ModelStage({
  model,
  onStage,
}: {
  model: Model3D;
  /** Reports the load state, so a poster the page drew before this chunk arrived can step aside. */
  onStage?: (state: StageState) => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const spin = useRef<Spin>({ yaw: 0, roll: 0, pitch: 0, velocity: 0, dragging: false, rest: 0, idle: true, hold: false });
  const view = useRef<View>({ distance: 0, zoom: 1, applied: 0 });
  const explode = useRef({ target: 0, value: 0 });
  const drag = useRef({ id: -1, x: 0, y: 0, time: 0, mouse: false });
  const [visible, setVisible] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [lightStage, setLightStage] = useState(false);
  const [full, setFull] = useState(false);
  const [parts, setParts] = useState(0);
  /** "poster": only the picture; "preview": the light GLB turns; "full": the real one. */
  const [stage, setStage] = useState<StageState>("poster");
  useEffect(() => onStage?.(stage), [stage, onStage]);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    Object.assign(spin.current, { yaw: 0, roll: 0, pitch: 0, velocity: 0, rest: 0, hold: false });
    view.current.zoom = 1;
    explode.current.target = 0;
    setExploded(false);
  }, []);

  // Every model opens at its own front view, assembled: React state is adjusted
  // while rendering (no effect round-trip), the refs in an effect.
  const [shown, setShown] = useState(model);
  if (shown !== model) {
    setShown(model);
    setExploded(false);
    setTip(null);
    setStage("poster");
    setParts(0);
  }
  useEffect(() => {
    Object.assign(spin.current, { yaw: 0, roll: 0, pitch: 0, velocity: 0, rest: 0, hold: false });
    view.current.zoom = 1;
    explode.current.target = 0;
    explode.current.value = 0;
  }, [model]);

  const preview = previewUrl(model);
  const onPreview = useCallback((n: number) => {
    setParts(n);
    setStage((v) => (v === "poster" ? "preview" : v));
  }, []);
  const onFull = useCallback((n: number) => {
    setParts(n);
    setStage("full");
  }, []);

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

  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === wrapper.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // wheel zoom only in full screen (on the page the wheel scrolls)
  useEffect(() => {
    const node = wrapper.current;
    if (!node || !full) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = view.current;
      v.zoom = THREE.MathUtils.clamp(v.zoom * Math.exp(-e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [full]);

  const zoomBy = (k: number) => {
    const v = view.current;
    v.zoom = THREE.MathUtils.clamp(v.zoom * k, ZOOM_MIN, ZOOM_MAX);
  };

  const toggleExplode = () => {
    const next = !exploded;
    setExploded(next);
    explode.current.target = next ? 1 : 0;
    spin.current.hold = next;
  };

  const toggleFull = () => {
    const node = wrapper.current;
    if (!node) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else node.requestFullscreen?.().catch(() => {});
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, mouse: event.pointerType === "mouse" };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* the move handler works without it, just not off-element */
    }
    spin.current.dragging = true;
    spin.current.velocity = 0;
    setTip(null);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    const dt = Math.max(event.timeStamp - state.time, 8) / 1000;
    state.x = event.clientX;
    state.y = event.clientY;
    state.time = event.timeStamp;
    spin.current.yaw += dx * DRAG_RATE;
    spin.current.velocity = (dx * DRAG_RATE) / dt;
    // tilt with the mouse only: on touch the vertical swipe belongs to the page
    if (state.mouse) spin.current.pitch = THREE.MathUtils.clamp(spin.current.pitch + dy * DRAG_RATE, -PITCH_MAX, PITCH_MAX);
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

  const onHover = useCallback((text: string | null, x: number, y: number) => {
    setTip((old) => (text ? { text, x, y } : old ? null : old));
  }, []);

  // light stage: dark ink on a pale studio sweep
  const stageVars = lightStage
    ? ({ "--stage-ink": "rgb(18 18 20 / 0.86)", "--stage-chip": "rgb(0 0 0 / 0.06)", "--stage-chip-strong": "rgb(0 0 0 / 0.1)" } as React.CSSProperties)
    : ({ "--stage-chip-strong": "rgb(255 255 255 / 0.14)" } as React.CSSProperties);

  return (
    <div
      ref={wrapper}
      style={stageVars}
      className="absolute inset-0 cursor-grab touch-pan-y select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Own backdrop, so the stage keeps it in full screen too. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-medium ease-out-quint ${full || lightStage ? "opacity-100" : "opacity-0"}`}
        style={{
          background: lightStage
            ? "radial-gradient(75% 65% at 50% 38%, #ffffff 0%, #eceef1 55%, #d9dce1 100%)"
            : "radial-gradient(70% 60% at 50% 38%, rgb(255 255 255 / 0.13) 0%, rgb(255 255 255 / 0.04) 55%, transparent 80%), linear-gradient(to bottom, #161618, #070708)",
        }}
      />
      <Canvas
        camera={{ fov: FOV, position: [0, 0, 1] }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: lightStage ? 1.0 : 1.06 }}
        frameloop={visible ? "always" : "never"}
        className="absolute! inset-0"
      >
        {/* The hero's photo studio: real softboxes for the metal to mirror. */}
        <Suspense fallback={null}>
          <Environment files={STUDIO_HDR_URL} environmentIntensity={lightStage ? 1.35 : 1.1} />
        </Suspense>
        {/* Shaping for the rough finishes — plasma spray, trabecular titanium,
            PEEK — which take little from a reflection and go flat without it. */}
        <hemisphereLight args={["#ffffff", lightStage ? "#9a9da3" : "#2a2a2c", lightStage ? 0.8 : 0.5]} />
        <directionalLight position={[-1.5, 2.2, 3]} intensity={1.1} color="#fff4e8" />
        <directionalLight position={[2.5, 0.5, -2.5]} intensity={0.6} color="#ffd9db" />
        {/* The light preview first; the full model is only requested once the
            preview turns, so the two never compete for the connection, and it
            takes over in the same pose (the spin lives in refs). */}
        {preview && stage === "poster" ? (
          <Suspense fallback={null}>
            <Specimen key={preview} model={model} url={preview} spinRef={spin} viewRef={view} explodeRef={explode} onHover={onHover} onReady={onPreview} />
          </Suspense>
        ) : (
          <Suspense
            fallback={
              preview ? (
                <Specimen key={preview} model={model} url={preview} spinRef={spin} viewRef={view} explodeRef={explode} onHover={onHover} onReady={onPreview} />
              ) : null
            }
          >
            <Specimen key={modelUrl(model)} model={model} url={modelUrl(model)} spinRef={spin} viewRef={view} explodeRef={explode} onHover={onHover} onReady={onFull} />
          </Suspense>
        )}
        <ScaleWriter barRef={bar} labelRef={label} viewRef={view} />
      </Canvas>

      {/* The stage is dark in both themes (see `.product-stage`), so the
          overlay takes the stage's own ink rather than the page's. */}
      <p className="pointer-events-none absolute top-4 left-4 rounded-pill bg-(--stage-chip) px-3 py-1 text-label text-(--stage-ink) backdrop-blur-md">
        Потягніть, щоб обертати
      </p>

      {tip ? (
        <span
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-pill bg-base/90 px-3 py-1 text-label whitespace-nowrap text-fg ring-1 ring-inset ring-hairline backdrop-blur-sm"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </span>
      ) : null}

      <div
        role="toolbar"
        aria-label="Перегляд моделі"
        className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-pill bg-(--stage-chip) p-1 backdrop-blur-md"
      >
        {parts > 1 ? (
          <ToolButton label={exploded ? "Зібрати" : "Розібрати на деталі"} pressed={exploded} onClick={toggleExplode}>
            <Layers className="size-4.5" aria-hidden="true" />
          </ToolButton>
        ) : null}
        <ToolButton label="Наблизити" onClick={() => zoomBy(1.25)}>
          <Plus className="size-4.5" aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Віддалити" onClick={() => zoomBy(1 / 1.25)}>
          <Minus className="size-4.5" aria-hidden="true" />
        </ToolButton>
        <ToolButton label={lightStage ? "Темна сцена" : "Світла сцена"} pressed={lightStage} onClick={() => setLightStage((v) => !v)}>
          {lightStage ? <Moon className="size-4.5" aria-hidden="true" /> : <Sun className="size-4.5" aria-hidden="true" />}
        </ToolButton>
        <ToolButton label="Скинути вигляд" onClick={reset}>
          <RotateCcw className="size-4.5" aria-hidden="true" />
        </ToolButton>
        <ToolButton label={full ? "Вийти з повного екрана" : "На весь екран"} pressed={full} onClick={toggleFull}>
          {full ? <Minimize2 className="size-4.5" aria-hidden="true" /> : <Maximize2 className="size-4.5" aria-hidden="true" />}
        </ToolButton>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1.5">
        <span
          ref={bar}
          className="block h-2 w-14 border-x-[1.5px] border-b-[1.5px] border-(--stage-ink) transition-[width] duration-medium ease-out-quint"
        />
        <span ref={label} className="text-label tabular-nums text-(--stage-ink)">
          10 мм
        </span>
      </div>

      <Loader key={model.slug} model={model} stage={stage} />
    </div>
  );
}
