"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEnvironment, useGLTF, useProgress, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { Plus } from "lucide-react";

import {
  skeletonImplantsUrl as IMPLANTS_URL,
  skeletonModelUrl as SKELETON_URL,
  skeletonZones,
  type SkeletonZone,
} from "@/content/skeleton-zones";
import {
  applyFinish,
  BONE_TEXTURE_URL,
  createZoneUniforms,
  MAX_BLOBS,
  type ZoneUniforms,
  DETAIL_TEXTURE_URL,
  finishFor,
  loadDetailTextures,
  STUDIO_HDR_URL,
} from "@/components/skeleton-materials";
import type { Theme } from "@/lib/theme";
import { useTheme } from "@/lib/use-theme";


const FOV = 24;
const MARGIN = 1.06;
/** Sweep: a slow there-and-back around the front view. See `hero-model.tsx`. */
const SWEEP_RATE = 0.14;
const SWEEP_AMP = 0.5;
const REJOIN_RATE = 1.6;
const FRICTION = 0.02;
const TURN_RATE = 6;
const DRAG_RATE = 0.008;
/** Exponential rates for the camera move and the x-ray fade. */
const CAMERA_RATE = 4;
const FADE_RATE = 7;
/** A zone never frames tighter than this, in metres of half-height. */
const MIN_FOCUS = 0.1;
/** Room around a zone's hardware, so the bone it sits in is in shot too. */
const ZONE_MARGIN = 1.55;
const FADE_IN = 0.05;
const FADE_FULL = 0.3;
const HIT_FLOOR = 0.1;

/** Opacity of the bones while a zone is open: the zone's own, and the rest. */
const XRAY_ZONE = 0.42;
const XRAY_REST = 0.1;
const XRAY_CAP = 0.3;
/** How much Venetian Red a highlighted zone's bones take on. */
const GLOW = 0.42;

/**
 * Idle life. Breathing and a slow shift of weight through the spine, arms
 * that follow the ribcage, and a skull that turns to the viewer while the
 * body sweeps, then drifts towards the pointer. All rotations are added to
 * the rest pose of the rigid rig, in radians, and fade out while a zone is open
 * so the camera frames the construction exactly where it was measured.
 */
const BREATH_PERIOD = 4.6;
const SHIFT_PERIOD = 11;
const LOOK_RATE = 2.2;
const LOOK_YAW = 0.55;
const LOOK_PITCH = 0.16;
const POSE_RATE = 2.5;

/** Turns the studio so its big octabox sits front-right, over the key light. */
const ENV_YAW = 1.9;

/**
 * How much of the studio each surface takes. Set per material on purpose:
 * with `scene.environment`, three overrides every material's own intensity
 * with the scene's, and one number cannot serve both. The white cyclorama's
 * bounce would fill every shadow on the bone, while the metal needs the full
 * studio to have anything to reflect.
 */
const ENV_BONE = 0.28;
const ENV_CAP = 0.45;
const ENV_IMPLANT = 1.35;

/**
 * Bone colour lives in the asset: COLOR_0 carries a baked AO pass and the
 * aged-ivory tint (see `3d/scripts/export.py`), so the material itself is a
 * white multiplier. X-ray cools it towards a pale blue.
 */
const IVORY = new THREE.Color("#ffffff");
const XRAY = new THREE.Color("#c9dcf5");
const RED = new THREE.Color("#c7000b");

type Kind = "bone" | "implant" | "resected" | "cap";

type Part = {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  kind: Kind;
  /** Bone: the zones it belongs to. Implant or resected bone: its one zone. */
  zones: string[];
  /** Bone: the zone whose resected variant stands in for it, if any. */
  replacedIn: string | null;
};

type Focus = { center: THREE.Vector3; halfHeight: number; halfWidth: number };
/** One capsule of a zone's field, in the rig root's space. */
type Blob = { center: THREE.Vector3; radius: number; halfY: number };

type Joint = { node: THREE.Object3D; rest: THREE.Quaternion };

type Rig = {
  root: THREE.Group;
  parts: Part[];
  joints: Map<string, Joint>;
  body: Focus;
  zones: Map<string, Focus>;
  blobs: Map<string, Blob[]>;
  withImplants: boolean;
};

type Spin = {
  angle: number;
  velocity: number;
  target: number | null;
  phase: number;
  held: boolean;
  dragging: boolean;
  sweeping: boolean;
};

export type SkeletonUi = { active: string | null; hover: string | null };
/** Pointer position over the page, -1..1 from the frame's centre. */
type Look = { x: number; y: number; known: boolean };
type Detail = { bone: THREE.Texture; detail: THREE.Texture; env: THREE.Texture; zone: ZoneUniforms };
export type Framing = "full" | "half";

const sanitize = THREE.PropertyBinding.sanitizeNodeName;

function focusOf(box: THREE.Box3, minHalf = 0): Focus {
  const size = box.getSize(new THREE.Vector3());
  return {
    center: box.getCenter(new THREE.Vector3()),
    halfHeight: Math.max(size.y / 2, minHalf),
    halfWidth: Math.max(Math.max(size.x, size.z) / 2, minHalf * 0.6),
  };
}

function under(object: THREE.Object3D, name: string) {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) {
    if (o.name === name) return true;
  }
  return false;
}

/**
 * Gives one mesh its material and its place in the x-ray logic.
 *
 * The tags are glTF extras, which GLTFLoader lands in `userData`. Node names
 * go through `sanitizeNodeName` on the way in ("Femur proximal.l" becomes
 * "Femur_proximall"), so the `replaces` extra is sanitised the same way before
 * it is matched against them.
 */
function preparePart(mesh: THREE.Mesh, replaced: Map<string, string>, tex: Detail): Part {
  const data = mesh.userData as { zones?: string; implant?: string; resected?: string; replaces?: string };
  const source = mesh.material as THREE.MeshStandardMaterial;

  let kind: Kind = "bone";
  if (data.implant) kind = "implant";
  else if (data.resected) kind = "resected";
  else if (mesh.name.startsWith("Cap_")) kind = "cap";

  const finish = finishFor(kind, source.name);
  let material: THREE.MeshPhysicalMaterial;
  if (kind === "bone" || kind === "resected") {
    // Dry bone is matte and faintly translucent: a trace of warm sheen at
    // grazing angles stands in for the light that scatters under the cortex
    // (any more and it washes the whole figure to pastel), and a trace of
    // clearcoat for the wax of a handled specimen. The tint itself is baked
    // into COLOR_0; the detail maps add pores and ageing on top.
    material = new THREE.MeshPhysicalMaterial({
      color: IVORY,
      vertexColors: true,
      roughness: 0.64,
      metalness: 0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.55,
      sheen: 0.12,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color("#ffd2a8"),
    });
  } else {
    // Physical for every part, so ceramic can take a clearcoat and anodised
    // titanium its interference film. Standard's fields copy straight across.
    material = new THREE.MeshPhysicalMaterial();
    if (source instanceof THREE.MeshPhysicalMaterial) material.copy(source);
    else THREE.MeshStandardMaterial.prototype.copy.call(material, source);
    material.vertexColors = true; // baked occlusion
    // The cap's cotton sheen from the GLB is tuned for Blender; here it lifts
    // the red to pink. The weave map carries the fabric now.
    if (kind === "cap") material.sheen = Math.min(material.sheen, 0.25);
    if (kind === "implant") {
      // Real studio reflections now, so polished metal can stay polished.
      if (finish === "polished") material.roughness = 0.1;
      if (finish === "ceramic") {
        material.roughness = 0.3;
        material.clearcoat = 1;
        material.clearcoatRoughness = 0.04;
      }
      if (source.name.toLowerCase().includes("anodised")) {
        // Anodising is a thin oxide film: a faint interference shift across it.
        material.iridescence = 0.35;
        material.iridescenceIOR = 2.2;
        material.iridescenceThicknessRange = [260, 420];
      }
      if (finish === "polymer") {
        material.sheen = 0.25;
        material.sheenRoughness = 0.6;
        material.sheenColor = new THREE.Color("#ffffff");
      }
    }
    // Blender exports the logo decal as OPAQUE, which would draw the
    // transparent part of its texture as a white plate. Cut it out instead.
    if (mesh.name === "Cap_logo") material.alphaTest = 0.4;
  }
  material.envMap = tex.env;
  material.envMapRotation.set(0, ENV_YAW, 0);
  material.userData.envBase = kind === "implant" ? ENV_IMPLANT : kind === "cap" ? ENV_CAP : ENV_BONE;
  material.envMapIntensity = material.userData.envBase as number;
  const zoned = kind === "bone" || kind === "resected";
  if (mesh.name !== "Cap_logo") applyFinish(material, mesh, finish, tex.bone, tex.detail, zoned ? tex.zone : undefined);
  mesh.castShadow = kind === "bone" || kind === "cap";
  mesh.receiveShadow = true;
  mesh.material = material;

  const zones =
    kind === "implant" ? [data.implant!] : kind === "resected" ? [data.resected!] : (data.zones ?? "").split(",").filter(Boolean);
  if (data.resected && data.replaces) replaced.set(sanitize(data.replaces), data.resected);

  // Hardware and cut bones are hidden until their zone opens.
  const hidden = kind === "implant" || kind === "resected";
  material.transparent = hidden;
  material.opacity = hidden ? 0 : 1;
  mesh.visible = !hidden;
  return { mesh, material, kind, zones, replacedIn: null };
}

/** A mesh's bounds in the rig root's own space, whatever the root is parented to. */
function boundsInRoot(mesh: THREE.Mesh, rootInverse: THREE.Matrix4) {
  mesh.geometry.computeBoundingBox();
  const m = new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld);
  return mesh.geometry.boundingBox!.clone().applyMatrix4(m);
}

/**
 * Where the camera goes for each zone: the zone's hardware when it has
 * arrived, and until then the zone's own bones, so a zone opened in the first
 * second still frames the right place.
 */
function zoneFoci(rig: Rig) {
  rig.root.updateMatrixWorld(true);
  const inverse = rig.root.matrixWorld.clone().invert();
  for (const zone of skeletonZones) {
    const hardware = new THREE.Box3();
    const bones = new THREE.Box3();
    // Joint names are sanitised on load like every node name ("shin.r" -> "shinr").
    const joint = zone.focus ? sanitize(zone.focus) : null;
    for (const part of rig.parts) {
      if (joint && !under(part.mesh, joint)) continue;
      if (part.kind === "implant" && part.zones[0] === zone.id) hardware.union(boundsInRoot(part.mesh, inverse));
      if (part.kind === "bone" && part.zones.includes(zone.id)) bones.union(boundsInRoot(part.mesh, inverse));
    }
    const box = hardware.isEmpty() ? bones : hardware;
    if (!box.isEmpty()) rig.zones.set(zone.id, focusOf(box, MIN_FOCUS));
    rig.blobs.set(zone.id, zoneBlobs(rig, zone.id, inverse));
  }
}

/**
 * The capsules of a zone's field: its hardware, grouped by the joint each
 * piece hangs under (a nail and its locking screws are one capsule), or its
 * own bones until the hardware has arrived. Grown past the hardware so the
 * bone it sits in is in the field too, with a floor so a thin nail still
 * lights the shaft around it.
 */
function zoneBlobs(rig: Rig, zone: string, inverse: THREE.Matrix4): Blob[] {
  const group = (kind: Kind) => {
    const byJoint = new Map<string, THREE.Box3>();
    for (const part of rig.parts) {
      if (part.kind !== kind) continue;
      if (kind === "implant" ? part.zones[0] !== zone : !part.zones.includes(zone)) continue;
      const key = part.mesh.parent?.name ?? "";
      const box = byJoint.get(key) ?? new THREE.Box3();
      byJoint.set(key, box.union(boundsInRoot(part.mesh, inverse)));
    }
    return [...byJoint.values()];
  };
  const hardware = group("implant");
  const boxes = hardware.length ? hardware : group("bone");
  return boxes.slice(0, MAX_BLOBS).map((box) => {
    const size = box.getSize(new THREE.Vector3());
    return {
      center: box.getCenter(new THREE.Vector3()),
      radius: Math.max(Math.max(size.x, size.z) * 0.5 * 1.3, 0.05),
      halfY: Math.max(size.y * 0.5 * 1.15, 0.05),
    };
  });
}

/** Sorts the figure's meshes and frames it. The hardware arrives later: see `attachImplants`. */
function buildRig(scene: THREE.Group, frame: Framing, tex: Detail): Rig {
  const root = scene.clone(true);
  root.updateMatrixWorld(true);
  const parts: Part[] = [];
  const replaced = new Map<string, string>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) parts.push(preparePart(mesh, replaced, tex));
  });
  const joints = new Map<string, Joint>();
  for (const name of JOINTS) {
    const node = root.getObjectByName(sanitize(name));
    if (node) joints.set(name, { node, rest: node.quaternion.clone() });
  }
  for (const part of parts) {
    if (part.kind === "bone") part.replacedIn = replaced.get(part.mesh.name) ?? null;
  }

  const bodyBox = new THREE.Box3();
  for (const part of parts) {
    if (part.kind === "bone" || part.kind === "cap") bodyBox.expandByObject(part.mesh);
  }
  // Half: the cap down to mid-thigh, the crop the hero composes around. The
  // canvas fades out at the bottom, so the cut reads as the frame, not the model.
  if (frame === "half") bodyBox.min.y = bodyBox.max.y - (bodyBox.max.y - bodyBox.min.y) * 0.56;

  const rig: Rig = { root, parts, joints, body: focusOf(bodyBox), zones: new Map(), blobs: new Map(), withImplants: false };
  zoneFoci(rig);
  return rig;
}

/**
 * Moves the hardware from its own GLB into the figure. Both files carry the
 * same joint hierarchy, so every implant goes under the joint of the same name
 * with its local transform unchanged.
 */
function attachImplants(rig: Rig, scene: THREE.Group, tex: Detail) {
  const source = scene.clone(true);
  const meshes: THREE.Mesh[] = [];
  source.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
  });
  const unused = new Map<string, string>();
  for (const mesh of meshes) {
    const joint = mesh.parent && (rig.root.getObjectByName(mesh.parent.name) ?? null);
    if (!joint) continue;
    joint.add(mesh);
    rig.parts.push(preparePart(mesh, unused, tex));
  }
  rig.withImplants = true;
  zoneFoci(rig);
}

const JOINTS = [
  "pelvis",
  "lumbar",
  "chest",
  "neck",
  "head",
  "upper_arm.l",
  "upper_arm.r",
  "forearm.l",
  "forearm.r",
  "thigh.l",
  "thigh.r",
];
const poseEuler = new THREE.Euler();
const poseQuat = new THREE.Quaternion();

function pose(rig: Rig, name: string, x: number, y: number, z: number) {
  const joint = rig.joints.get(name);
  if (!joint) return;
  poseEuler.set(x, y, z, "YXZ");
  joint.node.quaternion.copy(joint.rest).multiply(poseQuat.setFromEuler(poseEuler));
}

/**
 * The idle pose for this instant. `w` scales everything (0 while a zone is
 * open or motion is reduced); `yaw` and `pitch` are where the skull looks,
 * relative to the body, already smoothed by the caller.
 */
function breathe(rig: Rig, t: number, w: number, yaw: number, pitch: number) {
  const breath = Math.sin((t * Math.PI * 2) / BREATH_PERIOD);
  const shift = Math.sin((t * Math.PI * 2) / SHIFT_PERIOD);
  const sway = Math.sin((t * Math.PI * 2) / (SHIFT_PERIOD * 0.5) + 1.3);
  // Weight onto one leg: the pelvis drops on the other side, the spine
  // counters it so the skull stays over the feet, and the thighs counter the
  // pelvis so the legs stay planted.
  pose(rig, "pelvis", 0, 0.03 * shift * w, 0.022 * shift * w);
  pose(rig, "thigh.l", 0, 0, -0.022 * shift * w);
  pose(rig, "thigh.r", 0, 0, -0.022 * shift * w);
  pose(rig, "lumbar", 0.012 * breath * w, -0.012 * shift * w, -0.016 * shift * w);
  pose(rig, "chest", -0.026 * breath * w, -0.016 * shift * w, -0.01 * shift * w);
  // The ribcage lifts the shoulders a little and the arms swing out with it.
  pose(rig, "upper_arm.l", 0.02 * sway * w, 0, (0.018 + 0.014 * breath) * w);
  pose(rig, "upper_arm.r", -0.02 * sway * w, 0, (-0.018 - 0.014 * breath) * w);
  pose(rig, "forearm.l", (-0.04 - 0.015 * sway) * w, 0, 0);
  pose(rig, "forearm.r", (-0.04 + 0.015 * sway) * w, 0, 0);
  // The turn is split between neck and skull, like a real one.
  pose(rig, "neck", pitch * 0.4, yaw * 0.4, -0.01 * shift * w);
  pose(rig, "head", pitch * 0.6 + 0.01 * breath * w, yaw * 0.6, 0.03 * shift * w);
}

function presentAngle(zone: SkeletonZone, current: number) {
  const want = -Math.atan2(zone.facing[0], zone.facing[2]);
  const turn = Math.PI * 2;
  return want + Math.round((current - want) / turn) * turn;
}

function rejoin(state: Spin) {
  const asin = Math.asin(Math.min(1, Math.max(-1, state.angle / SWEEP_AMP)));
  state.phase = Math.cos(state.phase) >= 0 ? asin : Math.PI - asin;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function approach(current: number, target: number, k: number) {
  const next = current + (target - current) * k;
  return Math.abs(next - target) < 0.002 ? target : next;
}

/** Camera distance that fits a focus box at this aspect. */
function fit(focus: Focus, aspect: number, margin: number) {
  const t = Math.tan((FOV * Math.PI) / 360);
  return Math.max((focus.halfHeight * margin) / t, (focus.halfWidth * margin) / (t * aspect));
}

/**
 * Fetches the hardware GLB and hands it over through a ref. It mounts inside
 * the scene, which only renders once the figure has loaded, so the second
 * download starts after the first has finished instead of competing with it.
 */
function ImplantSource({ sinkRef }: { sinkRef: React.RefObject<THREE.Group | null> }) {
  const { scene } = useGLTF(IMPLANTS_URL, false, true);
  useEffect(() => {
    sinkRef.current = scene;
  }, [scene, sinkRef]);
  return null;
}

type SceneProps = {
  lookRef: React.RefObject<Look>;
  /** Multiplies every material's share of the studio: lower on the dark theme. */
  envScale: number;
  spinRef: React.RefObject<Spin>;
  uiRef: React.RefObject<SkeletonUi>;
  markersRef: React.RefObject<(HTMLDivElement | null)[]>;
  instantRef: React.RefObject<boolean>;
  frame: Framing;
  lift: number;
  shift: number;
  onReady: () => void;
};

/**
 * Rotation, the x-ray fade, the camera move and marker projection, in one
 * frame callback. Everything it reads comes from refs, so opening a zone never
 * re-renders the scene graph.
 */
function Scene({ lookRef, envScale, spinRef, uiRef, markersRef, instantRef, frame, lift, shift, onReady }: SceneProps) {
  const { scene } = useGLTF(SKELETON_URL, false, true);
  const [boneTex, detailTex] = useTexture([BONE_TEXTURE_URL, DETAIL_TEXTURE_URL], (loaded) => {
    const [b, d] = loaded as THREE.Texture[];
    loadDetailTextures(b, d);
  });
  const envTex = useEnvironment({ files: STUDIO_HDR_URL });
  // One set for every bone: the field is the same whichever fragment reads it.
  const zoneRef = useRef<ZoneUniforms | null>(null);
  zoneRef.current ??= createZoneUniforms(XRAY_REST / XRAY_ZONE, RED.clone());
  const fieldRef = useRef<{ zone: string | null }>({ zone: null });
  // The rig lives entirely in imperative land: it is built and attached by the
  // frame callback, which then animates its materials in place every frame.
  // Keeping it out of render is what lets the compiler accept that.
  const rigRef = useRef<{ source: THREE.Group; frame: Framing; rig: Rig } | null>(null);
  const outer = useRef<THREE.Group>(null);
  const implantsRef = useRef<THREE.Group | null>(null);
  const viewRef = useRef<{ target: THREE.Vector3; distance: number; lift: number; shift: number } | null>(null);
  const lifeRef = useRef({ time: 0, weight: 0, yaw: 0, pitch: 0 });
  const scratchRef = useRef({
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    toCamera: new THREE.Vector3(),
    want: new THREE.Vector3(),
  });

  useEffect(onReady, [onReady]);

  useFrame(({ camera, size, scene: world }, rawDelta) => {
    const state = spinRef.current;
    const pinned = uiRef.current;
    const group = outer.current;
    const scratch = scratchRef.current;
    if (!state || !pinned || !group) return;
    if (rigRef.current?.source !== scene || rigRef.current.frame !== frame) {
      if (rigRef.current) group.remove(rigRef.current.rig.root);
      rigRef.current = { source: scene, frame, rig: buildRig(scene, frame, { bone: boneTex, detail: detailTex, env: envTex, zone: zoneRef.current! }) };
      group.add(rigRef.current.rig.root);
    }
    const rig = rigRef.current.rig;
    if (!rig.withImplants && implantsRef.current) attachImplants(rig, implantsRef.current, { bone: boneTex, detail: detailTex, env: envTex, zone: zoneRef.current! });
    const delta = Math.min(rawDelta, 0.05);
    const cut = instantRef.current;

    // ---- rotation (same model as the hero)
    if (state.target !== null) {
      state.velocity = 0;
      state.angle = cut ? state.target : state.angle + (state.target - state.angle) * (1 - Math.exp(-TURN_RATE * delta));
      if (Math.abs(state.target - state.angle) < 0.0015) {
        state.angle = state.target;
        state.target = null;
        rejoin(state);
      }
    } else {
      if (!state.dragging) state.angle += state.velocity * delta;
      state.velocity *= Math.pow(FRICTION, delta);
      if (state.velocity !== 0 && Math.abs(state.velocity) < 0.002) {
        state.velocity = 0;
        rejoin(state);
      }
      if (state.sweeping && !state.held && state.velocity === 0 && pinned.active === null) {
        state.phase += SWEEP_RATE * delta;
        const sweep = SWEEP_AMP * Math.sin(state.phase);
        state.angle += (sweep - state.angle) * (1 - Math.exp(-REJOIN_RATE * delta));
      }
    }
    group.rotation.y = state.angle;

    // ---- idle life
    const life = lifeRef.current;
    const look = lookRef.current;
    const still = cut || pinned.active !== null;
    const p = 1 - Math.exp(-POSE_RATE * delta);
    life.weight += ((still ? 0 : 1) - life.weight) * (cut ? 1 : p);
    life.time += delta;
    // The skull keeps facing the camera against the sweep, then leans towards
    // the pointer. Clamped well inside what a neck can do.
    const idleGlance = 0.12 * Math.sin(life.time * 0.21);
    const wantYaw = still
      ? 0
      : THREE.MathUtils.clamp(-state.angle * 0.75 + (look.known ? look.x * 0.35 : idleGlance), -LOOK_YAW, LOOK_YAW);
    const wantPitch = still ? 0 : look.known ? THREE.MathUtils.clamp(look.y * LOOK_PITCH, -LOOK_PITCH, LOOK_PITCH) : 0.03;
    const l = cut ? 1 : 1 - Math.exp(-LOOK_RATE * delta);
    life.yaw += (wantYaw - life.yaw) * l;
    life.pitch += (wantPitch - life.pitch) * l;
    breathe(rig, life.time, life.weight, life.yaw, life.pitch);
    group.updateMatrixWorld(true);

    // Shadows only belong to the solid figure: in x-ray they would be cast by
    // bones that are no longer there.
    const shadowTarget = pinned.active ? 0 : 1;
    const sk = cut ? 1 : 1 - Math.exp(-FADE_RATE * delta);
    world.traverse((object) => {
      const light = object as THREE.DirectionalLight;
      if (light.isDirectionalLight && light.castShadow) {
        light.shadow.intensity = approach(light.shadow.intensity, shadowTarget, sk);
      }
    });

    // ---- x-ray
    const active = pinned.active;
    const lit = active ?? pinned.hover;
    const k = cut ? 1 : 1 - Math.exp(-FADE_RATE * delta);

    // The zone field. It keeps the last zone's capsules while the glow fades
    // out, so letting go of a chip does not snap the red off.
    const field = zoneRef.current!;
    const fieldState = fieldRef.current;
    if (lit) fieldState.zone = lit;
    const blobs = fieldState.zone ? (rig.blobs.get(fieldState.zone) ?? []) : [];
    field.uBlobCount.value = blobs.length;
    blobs.forEach((blob, i) => {
      scratch.point.copy(blob.center).applyMatrix4(rig.root.matrixWorld);
      field.uBlob.value[i].set(scratch.point.x, scratch.point.y, scratch.point.z, blob.radius);
      field.uBlobY.value[i] = blob.halfY;
    });
    field.uGlowMix.value = approach(field.uGlowMix.value, lit ? GLOW : 0, k);
    field.uXrayMix.value = approach(field.uXrayMix.value, active ? 1 : 0, k);
    if (!lit && field.uGlowMix.value === 0) fieldState.zone = null;

    for (const part of rig.parts) {
      const m = part.material;
      let opacity = 1;
      if (part.kind === "implant") opacity = active === part.zones[0] ? 1 : 0;
      else if (part.kind === "resected") opacity = active === part.zones[0] ? XRAY_ZONE : 0;
      else if (part.kind === "cap") opacity = active ? XRAY_CAP : 1;
      // Every bone goes to the zone's density; the field thins the ones away
      // from the construction per pixel (see `ZoneUniforms`).
      else if (active) opacity = part.replacedIn === active ? 0 : XRAY_ZONE;

      m.envMapIntensity = (m.userData.envBase as number) * envScale;
      m.opacity = approach(m.opacity, opacity, k);
      const transparent = m.opacity < 0.995;
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.needsUpdate = true;
      }
      m.depthWrite = m.opacity > 0.6;
      part.mesh.visible = m.opacity > 0.004;

      if (part.kind === "bone" || part.kind === "resected") {
        const xray = active ? 1 : 0;
        const mix = (m.userData.xray = approach((m.userData.xray as number) ?? 0, xray, k));
        m.color.lerpColors(IVORY, XRAY, mix);
      }
    }

    // ---- camera: frames the whole figure, or closes in on the open zone
    const zoneFocus = active ? rig.zones.get(active) : undefined;
    const focus = zoneFocus ?? rig.body;
    scratch.want.copy(focus.center).applyMatrix4(group.matrixWorld);
    const distance = fit(focus, size.width / Math.max(size.height, 1), zoneFocus ? ZONE_MARGIN : MARGIN);
    const current = (viewRef.current ??= { target: scratch.want.clone(), distance, lift: 0, shift: 0 });
    const c = cut ? 1 : 1 - Math.exp(-CAMERA_RATE * delta);
    current.target.lerp(scratch.want, c);
    current.distance += (distance - current.distance) * c;
    // Only a zone is lifted: the resting figure is composed to run behind the chips.
    current.lift += ((zoneFocus ? lift : 0) - current.lift) * c;
    current.shift += ((zoneFocus ? shift : 0) - current.shift) * c;
    // `lift` raises the subject in the frame by that fraction of its half-height,
    // clearing the strip along the bottom edge that the caller keeps for its UI.
    // `shift` moves it sideways the same way (positive: towards the left edge).
    const half = current.distance * Math.tan((FOV * Math.PI) / 360);
    const drop = half * current.lift;
    const slide = half * (size.width / Math.max(size.height, 1)) * current.shift;
    camera.position.set(current.target.x + slide, current.target.y - drop + current.distance * 0.04, current.target.z + current.distance);
    scratch.point.set(current.target.x + slide, current.target.y - drop, current.target.z);
    camera.lookAt(scratch.point);
    camera.updateMatrixWorld();

    // ---- markers
    const nodes = markersRef.current;
    if (!nodes) return;
    skeletonZones.forEach((zone, i) => {
      const node = nodes[i];
      const f = rig.zones.get(zone.id);
      if (!node || !f) return;
      scratch.point.copy(f.center).applyMatrix4(group.matrixWorld);
      scratch.normal.set(...zone.facing).normalize().transformDirection(group.matrixWorld);
      scratch.toCamera.copy(camera.position).sub(scratch.point).normalize();
      const facing = scratch.normal.dot(scratch.toCamera);
      scratch.point.project(camera);
      const x = (scratch.point.x * 0.5 + 0.5) * size.width;
      const y = (-scratch.point.y * 0.5 + 0.5) * size.height;

      // While a zone is open the other markers step back: the frame is about
      // one construction, and the rest would be dots floating in empty space.
      const forced = active === zone.id || pinned.hover === zone.id;
      const shown = forced ? 1 : active ? 0 : smoothstep(FADE_IN, FADE_FULL, facing);
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      node.style.opacity = shown.toFixed(3);
      node.style.pointerEvents = shown > HIT_FLOOR ? "auto" : "none";
      const side = x > size.width * 0.5 ? "start" : "end";
      if (node.dataset.side !== side) node.dataset.side = side;
    });
  });

  return (
    <>
      <group ref={outer} />
      <Suspense fallback={null}>
        <ImplantSource sinkRef={implantsRef} />
      </Suspense>
    </>
  );
}

/**
 * A photo studio. The environment is Poly Haven's `studio_small_08` (CC0), a
 * cyclorama lit by octaboxes and strip softboxes: real sources for the metal
 * to reflect, and a soft wrap-around fill for the bone. It is set on each
 * material (see `ENV_BONE`), not here. Direct lights do the shaping — a warm key that casts the shadows (ribs on the spine, the
 * cap's peak on the skull), a cool fill, and rims from behind.
 *
 * The rims are what change with the theme. On the dark ground they have to
 * draw the silhouette out of near-black, so they are strong, the right one
 * tinted towards the brand red. On the light ground the bone already stands
 * out; strong rims would flatten it into a cut-out, so they drop to a trace.
 */
function Lighting({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  return (
    <>
      <hemisphereLight args={["#fff6ea", dark ? "#1c1210" : "#d9d4cf", dark ? 0.1 : 0.14]} />
      <directionalLight
        castShadow
        position={[2.2, 3, 4.2]}
        intensity={dark ? 2.8 : 2.7}
        color="#fff0dc"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.012}
        shadow-radius={5}
        shadow-camera-left={-1.3}
        shadow-camera-right={1.3}
        shadow-camera-top={2.3}
        shadow-camera-bottom={-1.1}
        shadow-camera-near={1}
        shadow-camera-far={12}
      />
      <directionalLight position={[-3.4, 1, 2.4]} intensity={dark ? 0.25 : 0.3} color="#dde6ff" />
      <directionalLight position={[-2.6, 2.6, -4]} intensity={dark ? 1.3 : 0.35} color="#ffffff" />
      <directionalLight position={[3, 1.6, -3.6]} intensity={dark ? 1.1 : 0.25} color={dark ? "#ffc9c9" : "#ffffff"} />
    </>
  );
}

/** Only for the figure: the hardware loads in the background once it is up. */
function Loading({ done }: { done: boolean }) {
  const { active, progress } = useProgress();
  if (!active || done) return null;
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
 * The anatomy skeleton: rotate it, open a zone, see the construction.
 *
 * Opening a zone turns the model to that construction's best side, closes the
 * camera in on it and switches the figure to x-ray: its own bones stay half
 * there, everything else fades to a ghost, the cap too, and the implants fade
 * in. Joint replacements swap the intact bone for a resected one, so the stem
 * sits in a canal rather than inside a femoral head.
 *
 * Interaction rules are the hero's (see `hero-model.tsx`): horizontal drag with
 * inertia and `touch-action: pan-y`, no OrbitControls and no wheel zoom, a slow
 * sweep that stops under the pointer, and no self-motion under reduce-motion —
 * there the turn and the camera move become cuts. The dots are a pointer
 * affordance and hidden from assistive tech; the zone list beside the frame is
 * the accessible route. Which zone is open is owned by the caller.
 */
export function SkeletonModel({
  active,
  hover,
  onActivate,
  onHover,
  onLoaded,
  frame = "full",
  lift = 0,
  shift = 0,
  className,
}: {
  frame?: Framing;
  /** Fraction of the frame's half-height to raise an open zone by. */
  lift?: number;
  /** Fraction of the frame's half-width to move an open zone left by. */
  shift?: number;
  /** On the canvas only, so the markers over it stay at full strength. */
  className?: string;
  active: string | null;
  hover: string | null;
  onActivate: (zone: string | null) => void;
  onHover: (zone: string | null) => void;
  onLoaded?: () => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const markersRef = useRef<(HTMLDivElement | null)[]>([]);
  const spinRef = useRef<Spin>({
    angle: -0.35,
    velocity: 0,
    target: null,
    phase: Math.asin(-0.35 / SWEEP_AMP),
    held: false,
    dragging: false,
    sweeping: true,
  });
  const uiRef = useRef<SkeletonUi>({ active: null, hover: null });
  const lookRef = useRef<Look>({ x: 0, y: 0, known: false });
  const theme = useTheme();
  const instantRef = useRef(false);
  const drag = useRef({ id: -1, x: 0, time: 0, travel: 0 });
  const pointerInside = useRef(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => {
    setReady(true);
    onLoaded?.();
  }, [onLoaded]);

  const hold = useCallback(() => {
    spinRef.current.held = uiRef.current.active !== null || pointerInside.current || drag.current.id !== -1;
  }, []);

  useEffect(() => {
    uiRef.current.active = active;
    if (active) {
      const zone = skeletonZones.find((z) => z.id === active);
      if (zone) spinRef.current.target = presentAngle(zone, spinRef.current.angle);
      spinRef.current.velocity = 0;
    }
    hold();
  }, [active, hold]);

  useEffect(() => {
    uiRef.current.hover = hover;
  }, [hover]);

  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => setVisible(entries[0]?.isIntersecting ?? false), {
      rootMargin: "150px 0px",
    });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // Where the pointer is, anywhere on the page: the skull follows it from
  // across the hero copy too, not only over the canvas. Mouse only — a finger
  // on a phone is scrolling, not asking to be looked at.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const node = wrapper.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const look = lookRef.current;
      look.x = THREE.MathUtils.clamp((event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2), -1, 1);
      look.y = THREE.MathUtils.clamp((rect.top + rect.height * 0.25 - event.clientY) / (window.innerHeight / 2), -1, 1);
      look.known = true;
    };
    const onLeave = () => {
      lookRef.current.known = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      spinRef.current.sweeping = !query.matches;
      instantRef.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onActivate(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onActivate]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-hotspot-ui]")) return;
    drag.current = { id: event.pointerId, x: event.clientX, time: event.timeStamp, travel: 0 };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* works without capture, just not off-element */
    }
    spinRef.current.target = null;
    spinRef.current.dragging = true;
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
    spinRef.current.angle += dx * DRAG_RATE;
    spinRef.current.velocity = (dx * DRAG_RATE) / dt;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current.id !== event.pointerId) return;
    drag.current.id = -1;
    const state = spinRef.current;
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
        pointerInside.current = true;
        hold();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        pointerInside.current = false;
        hold();
      }}
    >
      <Canvas
        className={className}
        camera={{ fov: FOV, near: 0.05, far: 30, position: [0, 0.9, 5] }}
        dpr={[1, 2]}
        shadows="percentage"
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
        frameloop={visible ? "always" : "never"}
      >
        <Suspense fallback={null}>
          <Scene
            lookRef={lookRef}
            envScale={theme === "dark" ? 0.8 : 1}
            spinRef={spinRef}
            uiRef={uiRef}
            markersRef={markersRef}
            instantRef={instantRef}
            frame={frame}
            lift={lift}
            shift={shift}
            onReady={onReady}
          />
          <Lighting theme={theme ?? "light"} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {skeletonZones.map((zone, index) => (
          <div
            key={zone.id}
            ref={(node) => {
              markersRef.current[index] = node;
              return () => {
                markersRef.current[index] = null;
              };
            }}
            data-side="end"
            style={{ opacity: 0 }}
            className="absolute left-0 top-0 will-change-[transform,opacity]"
          >
            <div className="hotspot-anchor group/hot">
              {/* Out of the tab order and the a11y tree: the zone list beside
                  the frame names the same zones from a position that holds still. */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                data-hotspot-ui=""
                onClick={() => onActivate(active === zone.id ? null : zone.id)}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") onHover(zone.id);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") onHover(null);
                }}
                className={`hotspot-dot grid size-7 place-items-center rounded-full border transition-[background-color,border-color,color,scale] duration-fast ease-out-quint active:scale-[0.9] ${
                  active === zone.id
                    ? "border-transparent bg-accent-solid text-on-accent"
                    : "border-accent-line bg-base/85 text-fg-accent backdrop-blur-sm hover:bg-accent-tint"
                }`}
              >
                <Plus
                  aria-hidden="true"
                  size={13}
                  strokeWidth={2.5}
                  className={`transition-[rotate] duration-fast ease-out-quint ${active === zone.id ? "rotate-45" : ""}`}
                />
              </button>
              <span
                aria-hidden="true"
                className={`hotspot-flank pointer-events-none whitespace-nowrap rounded-control bg-base/90 px-2 py-1 text-caption text-fg backdrop-blur-sm transition-[opacity] duration-fast ease-out-quint ${
                  active === zone.id || hover === zone.id ? "opacity-100" : "opacity-0 group-hover/hot:opacity-100"
                }`}
                style={{ "--flank": "1.25rem" } as React.CSSProperties}
              >
                {zone.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Loading done={ready} />
    </div>
  );
}

useGLTF.preload(SKELETON_URL, false, true);
useTexture.preload([BONE_TEXTURE_URL, DETAIL_TEXTURE_URL]);
useEnvironment.preload({ files: STUDIO_HDR_URL });
