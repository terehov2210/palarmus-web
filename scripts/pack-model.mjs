/**
 * One pass from the generator's raw GLB to the file the hero ships.
 *
 * The two hero models arrive from the generator at ~60MB: two million
 * triangles and a pair of 8192² JPEGs. This is what makes them web assets, and
 * it is the only record of how — nothing in the app rebuilds them, so an asset
 * that is re-exported has to come back through here or it will not match.
 *
 *   npm i -D @gltf-transform/core @gltf-transform/extensions \
 *            @gltf-transform/functions meshoptimizer sharp
 *
 *   node scripts/pack-model.mjs in.glb public/models/implant.glb --tris=100000
 *   node scripts/pack-model.mjs in.glb public/models/spine.glb   --tris=60000
 *
 * Flags: --tris --base --mr --q --no-repaint. The defaults are what shipped.
 *
 * Three things here are not obvious and were each measured:
 *
 *  - `reorder()` is not optional. meshopt's index codec needs vertex-cache
 *    locality to compress; without this pass the spine's indices cost 4.4 bytes
 *    a triangle instead of 1.2, which was 500KB of the file.
 *  - The baseColor repaint. The generator bakes the implant hardware as
 *    near-black, and a metal's baseColor tints its reflection, so black
 *    hardware stays a silhouette under any lighting. See `repaint` below.
 *  - baseColor stays at 2048. Dropping it to 1536 is plainly visible on the
 *    trabecular bone; dropping quality from 86 to 78 at 2048 is not.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, simplify, reorder, dedup, prune, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const [, , input, output, ...flags] = process.argv;
const opt = (name, dflt) => {
  const f = flags.find((x) => x.startsWith(`--${name}=`));
  return f ? Number(f.split('=')[1]) : dflt;
};
const TRIS = opt('tris', 100000);
const BASE_SIZE = opt('base', 2048);
const MR_SIZE = opt('mr', 1024);
const QUALITY = opt('q', 78);
const REPAINT = !flags.includes('--no-repaint');

const STEEL = [138, 142, 150];
const CONTRAST = 0.45;
const METAL_MIN = 140, LUM_MAX = 78;

await MeshoptSimplifier.ready; await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(input);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const sourceTris = prim.getIndices().getCount() / 3;

const material = doc.getRoot().listMaterials()[0];
const baseTex = material.getBaseColorTexture();
const mrTex = material.getMetallicRoughnessTexture();

const N = BASE_SIZE;
const base = await sharp(Buffer.from(baseTex.getImage()))
  .resize(N, N).removeAlpha().raw().toBuffer({ resolveWithObject: true });

let painted = base.data;
if (REPAINT) {
  const mr = await sharp(Buffer.from(mrTex.getImage()))
    .resize(N, N).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const mask = Buffer.alloc(N * N);
  let hits = 0;
  const sum = [0, 0, 0];
  for (let p = 0; p < N * N; p++) {
    const r = base.data[p*3], g = base.data[p*3+1], b = base.data[p*3+2];
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    if (mr.data[p*3+2] < METAL_MIN || lum > LUM_MAX) continue;
    mask[p] = 255; hits++;
    sum[0] += r; sum[1] += g; sum[2] += b;
  }
  const mean = sum.map((v) => Math.max(v / hits, 1));
  // toColourspace('b-w') is load-bearing: sharp otherwise promotes the mask to
  // three channels on the way out and every read below lands on the wrong byte.
  const soft = await sharp(mask, { raw: { width: N, height: N, channels: 1 } })
    .blur(2).toColourspace('b-w').raw().toBuffer();
  if (soft.length !== N * N) throw new Error(`mask is ${soft.length}, expected ${N * N}`);

  painted = Buffer.alloc(N * N * 3);
  for (let p = 0; p < N * N; p++) {
    const a = soft[p] / 255;
    for (let c = 0; c < 3; c++) {
      const old = base.data[p*3+c];
      if (a === 0) { painted[p*3+c] = old; continue; }
      const lifted = Math.min(255, STEEL[c] * Math.pow(old / mean[c], CONTRAST));
      painted[p*3+c] = Math.round(old + (lifted - old) * a);
    }
  }
}

baseTex.setImage(await sharp(painted, { raw: { width: N, height: N, channels: 3 } })
  .jpeg({ quality: QUALITY, chromaSubsampling: '4:4:4' }).toBuffer()).setMimeType('image/jpeg');
mrTex.setImage(await sharp(Buffer.from(mrTex.getImage()))
  .resize(MR_SIZE, MR_SIZE).jpeg({ quality: QUALITY - 14 }).toBuffer()).setMimeType('image/jpeg');

await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: TRIS / sourceTris, error: 0.01 }),
  // Vertex-cache and vertex-fetch ordering. Without this meshopt's index codec
  // has no locality to exploit and costs ~4.4 bytes a triangle instead of ~1.2.
  reorder({ encoder: MeshoptEncoder, target: 'size' }),
  prune(),
);
doc.createExtension(KHRMeshQuantization).setRequired(true);
await doc.transform(quantize({
  pattern: /.*/, quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12,
}));
doc.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(output, doc);

const out = doc.getRoot().listMeshes()[0].listPrimitives()[0];
console.log(`${output}  ${Math.round(out.getIndices().getCount()/3/1000)}k tris  base ${BASE_SIZE} mr ${MR_SIZE} q${QUALITY}`);
