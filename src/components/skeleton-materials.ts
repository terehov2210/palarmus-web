import * as THREE from "three";

/**
 * Surface detail for the hero skeleton: real scanned CC0 maps from ambientCG,
 * packed one map per channel so the whole set is two small WebPs.
 *
 *   /models/tex/bone.webp    R  Concrete034 height     — cortical pits and pores
 *                            G  Plaster001 albedo      — mottling of aged bone
 *                            B  Concrete034 roughness  — waxy vs chalky patches
 *   /models/tex/detail.webp  R  Metal003 roughness     — hairline scratches, smudges
 *                            G  Metal012 roughness     — bead-blast grain
 *                            B  Fabric036 height       — cotton weave of the cap
 *
 * The meshes have no UVs (Z-Anatomy ships none, and the pipeline bakes into
 * vertex colours), so the maps are projected triplanar. The projection runs in
 * the mesh's own metric space: `mesh.matrix` undoes the GLB's position
 * quantization (a uniform scale and an offset per mesh, no rotation), and it
 * is rigid under the joint, so the pattern stays on the bone as the rig moves
 * and turns instead of swimming across it.
 *
 * Height becomes a normal through screen-space derivatives, the same
 * construction three's own bump map uses, so no tangents are needed either.
 */
export const BONE_TEXTURE_URL = "/models/tex/bone.webp";
export const DETAIL_TEXTURE_URL = "/models/tex/detail.webp";
export const STUDIO_HDR_URL = "/models/tex/studio.hdr";

export type Finish =
  | "bone"
  | "cap"
  | "polished" // cobalt-chrome
  | "blasted" // bead-blasted titanium, anodised titanium
  | "porous" // porous titanium coating
  | "ceramic"
  | "polymer" // UHMWPE, PEEK
  | "fibre"; // graft, suture

type Params = {
  /** Tiles per metre. */
  scale: number;
  /** Height channel strength, in the units three's bumpScale uses. */
  bump: number;
  /** Which height: bone pits, or the weave. */
  heightChannel: "bone" | "weave" | "none";
  /** Albedo mottling depth, 0 = none. */
  mottle: number;
  /** Roughness modulation depth and source. */
  rough: number;
  roughChannel: "bone" | "scratch" | "blast" | "none";
};

const FINISHES: Record<Finish, Params> = {
  // A 4cm tile: pores read at arm's length, the mottling at a second, lower
  // frequency reads as the uneven ageing of a real specimen.
  bone: { scale: 26, bump: 0.9, heightChannel: "bone", mottle: 0.34, rough: 0.28, roughChannel: "bone" },
  cap: { scale: 150, bump: 0.6, heightChannel: "weave", mottle: 0.1, rough: 0.12, roughChannel: "none" },
  polished: { scale: 55, bump: 0, heightChannel: "none", mottle: 0, rough: 0.2, roughChannel: "scratch" },
  blasted: { scale: 180, bump: 0.12, heightChannel: "bone", mottle: 0, rough: 0.16, roughChannel: "blast" },
  porous: { scale: 260, bump: 1.4, heightChannel: "bone", mottle: 0.18, rough: 0.1, roughChannel: "blast" },
  ceramic: { scale: 55, bump: 0, heightChannel: "none", mottle: 0, rough: 0.05, roughChannel: "scratch" },
  polymer: { scale: 90, bump: 0.08, heightChannel: "bone", mottle: 0.04, rough: 0.14, roughChannel: "blast" },
  fibre: { scale: 220, bump: 0.5, heightChannel: "weave", mottle: 0.08, rough: 0.1, roughChannel: "none" },
};

/**
 * The open zone, as the bone shader sees it.
 *
 * The bones are cut into segments (a femur is proximal, shaft and distal
 * meshes), and colouring a zone mesh by mesh put a hard edge wherever the
 * anatomy happened to be cut: a red shaft next to a white condyle. So the zone
 * is a field in space instead — a few soft capsules round its hardware, one
 * per joint it sits under — and every bone fragment reads its red and its
 * x-ray density from how deep in that field it is. Across a cut the value is
 * continuous, so the transition is a gradient along the bone.
 *
 * Capsules are vertical cylinders with rounded falloff, in world space. The
 * figure only ever turns about Y, so a cylinder stays a cylinder.
 */
export const MAX_BLOBS = 12;

export type ZoneUniforms = {
  uBlob: { value: THREE.Vector4[] }; // xyz centre, w horizontal radius
  uBlobY: { value: number[] }; // vertical half-extent
  uBlobCount: { value: number };
  uGlowMix: { value: number };
  uXrayMix: { value: number };
  uRestRatio: { value: number };
  uGlowColor: { value: THREE.Color };
};

export function createZoneUniforms(restRatio: number, glow: THREE.Color): ZoneUniforms {
  return {
    uBlob: { value: Array.from({ length: MAX_BLOBS }, () => new THREE.Vector4()) },
    uBlobY: { value: new Array<number>(MAX_BLOBS).fill(1) },
    uBlobCount: { value: 0 },
    uGlowMix: { value: 0 },
    uXrayMix: { value: 0 },
    uRestRatio: { value: restRatio },
    uGlowColor: { value: glow },
  };
}

const ZONE_VERTEX_HEAD = /* glsl */ `
varying vec3 vZoneWorld;
`;

const ZONE_VERTEX_BODY = /* glsl */ `
vZoneWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const ZONE_FRAGMENT_HEAD = /* glsl */ `
#define MAX_BLOBS ${MAX_BLOBS}
uniform vec4 uBlob[MAX_BLOBS];
uniform float uBlobY[MAX_BLOBS];
uniform int uBlobCount;
uniform float uGlowMix;
uniform float uXrayMix;
uniform float uRestRatio;
uniform vec3 uGlowColor;
varying vec3 vZoneWorld;

float zoneField(vec3 p) {
  float t = 0.0;
  for (int i = 0; i < MAX_BLOBS; i++) {
    if (i >= uBlobCount) break;
    vec4 b = uBlob[i];
    vec2 q = vec2(length(p.xz - b.xz) / b.w, (p.y - b.y) / uBlobY[i]);
    // Full strength inside the hardware's reach, a long soft tail past it.
    t = max(t, 1.0 - smoothstep(0.55, 1.6, length(q)));
  }
  return t;
}
`;

const ZONE_FRAGMENT_COLOR = /* glsl */ `
float zoneT = zoneField(vZoneWorld);
// In x-ray the zone's bone keeps its density and the rest thins to a ghost,
// by the same field, so density fades along the bone as the red does.
diffuseColor.a *= mix(1.0, mix(uRestRatio, 1.0, zoneT), uXrayMix);
`;

const ZONE_FRAGMENT_EMISSIVE = /* glsl */ `
#include <emissivemap_fragment>
totalEmissiveRadiance += uGlowColor * (zoneT * uGlowMix);
`;

export function finishFor(kind: "bone" | "implant" | "resected" | "cap", materialName: string): Finish {
  if (kind === "bone" || kind === "resected") return "bone";
  if (kind === "cap") return materialName.includes("logo") ? "polymer" : "cap";
  const name = materialName.toLowerCase();
  if (name.includes("porous")) return "porous";
  if (name.includes("cobalt")) return "polished";
  if (name.includes("titanium") || name.includes("anodised")) return "blasted";
  if (name.includes("ceramic")) return "ceramic";
  if (name.includes("graft") || name.includes("suture")) return "fibre";
  return "polymer";
}

export function loadDetailTextures(bone: THREE.Texture, detail: THREE.Texture) {
  for (const texture of [bone, detail]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace; // data, not colour
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }
}

const VERTEX_HEAD = /* glsl */ `
uniform mat4 uLocal;
varying vec3 vDetailPos;
varying vec3 vDetailNormal;
`;

const VERTEX_BODY = /* glsl */ `
#include <begin_vertex>
vDetailPos = (uLocal * vec4(position, 1.0)).xyz;
vDetailNormal = normalize(mat3(uLocal) * objectNormal);
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform sampler2D uBoneTex;
uniform sampler2D uDetailTex;
uniform float uScale;
uniform float uBump;
uniform float uMottle;
uniform float uRough;
varying vec3 vDetailPos;
varying vec3 vDetailNormal;

vec4 triplanar(sampler2D tex, vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(6.0));
  w /= (w.x + w.y + w.z + 1e-5);
  return texture2D(tex, p.zy) * w.x + texture2D(tex, p.xz) * w.y + texture2D(tex, p.xy) * w.z;
}

// three's perturbNormalArb, fed a height sampled here instead of from a UV map.
vec3 detailBump(vec3 surfPos, vec3 surfNorm, float h, float faceDir) {
  vec3 sx = normalize(dFdx(surfPos));
  vec3 sy = normalize(dFdy(surfPos));
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec2 dh = vec2(dFdx(h), dFdy(h));
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

function fragmentBody(p: Params) {
  const height =
    p.heightChannel === "bone" ? "boneFine.r" : p.heightChannel === "weave" ? "detailFine.b" : "0.0";
  const rough =
    p.roughChannel === "bone"
      ? "(boneFine.b - 0.5)"
      : p.roughChannel === "scratch"
        ? "(detailFine.r - 0.25)"
        : p.roughChannel === "blast"
          ? "(detailFine.g - 0.5)"
          : "0.0";
  return {
    // Sampled once, right after the geometric normal is known.
    samples: /* glsl */ `
vec3 dP = vDetailPos * uScale;
vec3 dN = normalize(vDetailNormal);
vec4 boneFine = triplanar(uBoneTex, dP, dN);
vec4 detailFine = triplanar(uDetailTex, dP, dN);
// The same mottling at a sixth of the frequency: stains, not grain.
float blotch = triplanar(uBoneTex, dP * 0.17 + 0.31, dN).g;
`,
    color: /* glsl */ `
#include <color_fragment>
diffuseColor.rgb *= mix(1.0, 0.8 + 0.4 * mix(boneFine.g, blotch, 0.65), uMottle);
`,
    roughness: /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + ${rough} * uRough, 0.04, 1.0);
`,
    normal: /* glsl */ `
#include <normal_fragment_maps>
normal = detailBump(-vViewPosition, normal, ${height} * uBump * 0.7, faceDirection);
`,
  };
}

/**
 * Patches a standard or physical material in place. Each mesh has its own
 * material already (the x-ray fade animates them one by one), so `uLocal` is a
 * plain per-material uniform set once from the mesh.
 */
export function applyFinish(
  material: THREE.MeshStandardMaterial,
  mesh: THREE.Mesh,
  finish: Finish,
  bone: THREE.Texture,
  detail: THREE.Texture,
  zone?: ZoneUniforms,
) {
  const p = FINISHES[finish];
  const body = fragmentBody(p);
  mesh.updateMatrix();
  const uniforms = {
    uLocal: { value: mesh.matrix.clone() },
    uBoneTex: { value: bone },
    uDetailTex: { value: detail },
    uScale: { value: p.scale },
    uBump: { value: p.bump },
    uMottle: { value: p.mottle },
    uRough: { value: p.rough },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, zone ?? {});
    shader.vertexShader =
      VERTEX_HEAD +
      (zone ? ZONE_VERTEX_HEAD : "") +
      shader.vertexShader.replace("#include <begin_vertex>", VERTEX_BODY + (zone ? ZONE_VERTEX_BODY : ""));
    shader.fragmentShader =
      FRAGMENT_HEAD +
      (zone ? ZONE_FRAGMENT_HEAD : "") +
      shader.fragmentShader
        .replace("#include <color_fragment>", body.samples + body.color + (zone ? ZONE_FRAGMENT_COLOR : ""))
        .replace("#include <roughnessmap_fragment>", body.roughness)
        .replace("#include <normal_fragment_maps>", body.normal)
        .replace("#include <emissivemap_fragment>", zone ? ZONE_FRAGMENT_EMISSIVE : "#include <emissivemap_fragment>");
  };
  material.customProgramCacheKey = () => `detail:${finish}${zone ? ":zone" : ""}`;
  material.needsUpdate = true;
}
